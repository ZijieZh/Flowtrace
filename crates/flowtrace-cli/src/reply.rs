use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use flowtrace_core::output::StructuredOutput;
use flowtrace_core::state::run_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

/// A single reply on the run-level append-only stream.
/// Lives at `<trace_root>/runs/<run_id>/replies/<NNNN>.json`.
///
/// `commit` is derived from git history at read time and only ever set on
/// API responses — never written to disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reply {
    /// Sequence number assigned by the CLI when the reply is appended. 1-based, contiguous.
    pub seq: u32,
    /// When the reply was appended (UTC, RFC3339).
    pub at: DateTime<Utc>,
    /// Which step this reply is "about", if any. Mirrors `output.checkpoint.step_id`.
    /// Run-level replies omit this field.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub step_id: Option<String>,
    /// SHA of the git commit that introduced this reply. Set by readers
    /// (server / `list_replies_*`), never written to disk.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub commit: Option<String>,
    /// The structured-output payload (typed; see [`StructuredOutput`]).
    pub output: StructuredOutput,
}

/// `<trace_root>/runs/<run_id>/replies/`
pub fn replies_dir(trace_root: &Path, run_id: &str) -> PathBuf {
    run_dir(trace_root, run_id).join("replies")
}

fn reply_path(trace_root: &Path, run_id: &str, seq: u32) -> PathBuf {
    replies_dir(trace_root, run_id).join(format!("{:04}.json", seq))
}

/// Last-assigned seq per (trace_root, run_id). Avoids re-scanning the
/// replies/ directory on every append in long-running serve processes.
/// Cold-start (cache miss) falls back to one scan, then maintains in-process.
static SEQ_CACHE: std::sync::OnceLock<std::sync::Mutex<std::collections::HashMap<(PathBuf, String), u32>>> =
    std::sync::OnceLock::new();

fn scan_max_seq(dir: &Path) -> u32 {
    let Ok(rd) = fs::read_dir(dir) else { return 0 };
    let mut max = 0u32;
    for entry in rd.flatten() {
        let name = entry.file_name();
        let s = name.to_string_lossy();
        let stem = s.trim_end_matches(".json");
        if let Ok(n) = stem.parse::<u32>() {
            if n > max {
                max = n;
            }
        }
    }
    max
}

/// Allocate the next seq for this run. Cache-backed: O(1) after first use.
fn next_seq(trace_root: &Path, run_id: &str) -> u32 {
    let key = (trace_root.to_path_buf(), run_id.to_string());
    let cache = SEQ_CACHE.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()));
    let mut guard = cache.lock().unwrap();
    let last = match guard.get(&key).copied() {
        Some(v) => v,
        None => scan_max_seq(&replies_dir(trace_root, run_id)),
    };
    let next = last + 1;
    guard.insert(key, next);
    next
}

/// Append a new reply file. Returns the assigned seq and timestamp.
///
/// `step_id` on the persisted record is always derived from
/// `payload.checkpoint.step_id` — there is no separate input. Cross-process
/// safe: writes content to a tempfile, then claims a seq slot via
/// `fs::hard_link` (atomic on POSIX, errors AlreadyExists on collision). On
/// collision we re-scan and retry, bounded by ~N retries under N-way contention.
pub fn append_reply(
    trace_root: &Path,
    run_id: &str,
    payload: StructuredOutput,
) -> Result<(u32, DateTime<Utc>)> {
    let dir = replies_dir(trace_root, run_id);
    fs::create_dir_all(&dir)
        .with_context(|| format!("create {}", dir.display()))?;
    let at = Utc::now();
    let step_owned = payload.step_id().map(|s| s.to_string());
    let value = payload;

    // Stage the content in a unique tempfile alongside the destination dir,
    // so the later hard-link is a same-filesystem operation.
    let tmp = dir.join(format!(
        ".tmp.{}.{}.reply",
        std::process::id(),
        at.timestamp_nanos_opt().unwrap_or(0)
    ));

    let mut attempts = 0u32;
    let mut seq = next_seq(trace_root, run_id);
    loop {
        // Body carries the seq, so re-serialize on each retry.
        let reply = Reply {
            seq,
            at,
            step_id: step_owned.clone(),
            commit: None,
            output: value.clone(),
        };
        let bytes = serde_json::to_vec_pretty(&reply)?;
        // Overwrite the tempfile content for this attempt.
        fs::write(&tmp, &bytes)
            .with_context(|| format!("write tmp {}", tmp.display()))?;
        let dest = reply_path(trace_root, run_id, seq);
        match fs::hard_link(&tmp, &dest) {
            Ok(()) => {
                let _ = fs::remove_file(&tmp);
                return Ok((seq, at));
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                attempts += 1;
                if attempts > 1024 {
                    let _ = fs::remove_file(&tmp);
                    anyhow::bail!("could not claim reply seq after 1024 attempts");
                }
                // Another writer took this slot. Re-scan and jump past them.
                let observed = scan_max_seq(&dir);
                seq = update_seq_after_collision(trace_root, run_id, observed);
            }
            Err(e) => {
                let _ = fs::remove_file(&tmp);
                return Err(e).with_context(|| format!("link reply {}", dest.display()));
            }
        }
    }
}

/// Update the in-process seq cache after a collision: pick `max(observed + 1, cached + 1)`.
fn update_seq_after_collision(trace_root: &Path, run_id: &str, observed: u32) -> u32 {
    let key = (trace_root.to_path_buf(), run_id.to_string());
    let cache = SEQ_CACHE.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()));
    let mut guard = cache.lock().unwrap();
    let cached = guard.get(&key).copied().unwrap_or(0);
    let next = cached.max(observed) + 1;
    guard.insert(key, next);
    next
}

/// List replies for a run with seq > `since`, sorted by seq ascending.
/// Pass `since = 0` to list all. Parses the seq from the filename so we
/// skip reading files we'd drop anyway — keeps the SSE incremental fetch
/// O(k) in the number of new replies, not O(N) in the total.
///
/// Logs parse / IO failures to stderr; silent drops here historically hid
/// mid-write crashes (partial reply.json on disk → vanished from stream).
pub fn list_replies_since(trace_root: &Path, run_id: &str, since: u32) -> Result<Vec<Reply>> {
    let dir = replies_dir(trace_root, run_id);
    let Ok(rd) = fs::read_dir(&dir) else {
        return Ok(vec![]);
    };
    let mut replies: Vec<Reply> = vec![];
    for entry in rd.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        // Skip tempfiles (`.tmp.<pid>.<nanos>.reply`) and other hidden files.
        if name.starts_with('.') {
            continue;
        }
        let Some(stem) = name.strip_suffix(".json") else {
            continue;
        };
        let seq: u32 = match stem.parse() {
            Ok(n) => n,
            Err(_) => {
                eprintln!(
                    "[trace] warn: replies/{} has non-numeric filename — skipping; rename or remove",
                    name
                );
                continue;
            }
        };
        if seq <= since {
            continue;
        }
        let bytes = match fs::read(&path) {
            Ok(b) => b,
            Err(e) => {
                eprintln!(
                    "[trace] warn: failed to read replies/{}: {} — skipping",
                    name, e
                );
                continue;
            }
        };
        match serde_json::from_slice::<Reply>(&bytes) {
            Ok(r) => replies.push(r),
            Err(e) => {
                eprintln!(
                    "[trace] warn: replies/{} is corrupt JSON ({}; {} bytes) — \
                     skipping; check if the writer crashed mid-write",
                    name,
                    e,
                    bytes.len()
                );
            }
        }
    }
    replies.sort_by_key(|r| r.seq);
    Ok(replies)
}

/// Read all of stdin into a string. Used by the CLI to pick up the
/// structured-output payload piped in by the caller.
pub fn read_stdin_to_string() -> Result<String> {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s)?;
    Ok(s)
}

/// Parse stdin content as a typed [`StructuredOutput`] payload.
///
/// Validates against the schema at parse time: required fields (headline, status)
/// must be present; the status enum must be one of `partial|complete|blocked|error`;
/// every evidence variant's required fields must be present. Unknown top-level
/// fields are tolerated for forward-compatibility.
pub fn parse_payload(s: &str) -> Result<StructuredOutput> {
    serde_json::from_str::<StructuredOutput>(s)
        .context("reply payload must be valid JSON (StructuredOutput shape — see `flowtrace explain reply`)")
}
