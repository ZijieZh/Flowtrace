use anyhow::Context;
use flowtrace_core::io::atomic_write_json;
use flowtrace_core::schema::Trace;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;
use walkdir::WalkDir;

use super::error::{ApiFault, ApiResult};
use super::state::{AppState, TraceCacheEntry, TRACE_CACHE_TTL_MS};

#[derive(Debug, Clone)]
pub struct TraceRef {
    pub trace_id: String,
    pub root: PathBuf,
    pub trace: Trace,
}

/// Find all `trace.json` files at depth 1 under any registered scope.
/// Result is cached for `TRACE_CACHE_TTL_MS` to coalesce request bursts.
/// Returns an `Arc` so callers can clone the handle without deep-copying
/// every parsed `Trace` in scope.
pub fn list_traces(state: &AppState) -> Arc<Vec<TraceRef>> {
    if let Ok(guard) = state.trace_cache.lock() {
        if let Some(entry) = guard.as_ref() {
            if entry.at.elapsed().as_millis() < TRACE_CACHE_TTL_MS {
                return Arc::clone(&entry.traces);
            }
        }
    }
    let scanned = Arc::new(scan_traces(state));
    if let Ok(mut guard) = state.trace_cache.lock() {
        *guard = Some(TraceCacheEntry {
            at: Instant::now(),
            traces: Arc::clone(&scanned),
        });
    }
    scanned
}

fn scan_traces(state: &AppState) -> Vec<TraceRef> {
    let mut out: Vec<TraceRef> = vec![];
    for scope in state.all_scopes() {
        for entry in WalkDir::new(&scope)
            .max_depth(2)
            .min_depth(2)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_name() != "trace.json" {
                continue;
            }
            let root = match entry.path().parent() {
                Some(p) => p.to_path_buf(),
                None => continue,
            };
            let trace_id = match root.file_name().and_then(|s| s.to_str()) {
                Some(s) => s.to_string(),
                None => continue,
            };
            if let Ok(trace) = parse_trace(&root) {
                out.push(TraceRef {
                    trace_id,
                    root,
                    trace,
                });
            }
        }
    }
    out
}

pub fn parse_trace(root: &Path) -> anyhow::Result<Trace> {
    let path = root.join("trace.json");
    let bytes = std::fs::read(&path).with_context(|| format!("read {}", path.display()))?;
    let r: Trace =
        serde_json::from_slice(&bytes).with_context(|| format!("parse {}", path.display()))?;
    Ok(r)
}

pub fn find_trace(state: &AppState, trace_id: &str) -> ApiResult<TraceRef> {
    list_traces(state)
        .iter()
        .find(|r| r.trace_id == trace_id)
        .cloned()
        .ok_or_else(|| {
            ApiFault::not_found(format!("trace `{}` not found in any scope", trace_id))
        })
}

pub fn write_trace(state: &AppState, root: &Path, trace: &Trace) -> anyhow::Result<()> {
    let path = root.join("trace.json");
    atomic_write_json(&path, "trace", trace)
        .with_context(|| format!("write {}", path.display()))?;
    state.invalidate_trace_cache();
    Ok(())
}

/// Locate the trace that owns the given run id. Returns `(trace_id, trace_root)`.
///
/// Backed by `AppState.run_index`: hot path is one HashMap lookup. Cold miss
/// scans scope roots once and stores the mapping. Cache entries are dropped
/// whenever `invalidate_trace_cache` runs (scope change / trace edit).
pub fn locate_run(state: &AppState, run_id: &str) -> ApiResult<(String, PathBuf)> {
    if let Ok(idx) = state.run_index.lock() {
        if let Some((trace_id, root)) = idx.get(run_id) {
            if flowtrace_core::state::run_dir(root, run_id).is_dir() {
                return Ok((trace_id.clone(), root.clone()));
            }
        }
    }
    for scope in state.all_scopes() {
        let Ok(rd) = std::fs::read_dir(&scope) else {
            continue;
        };
        for entry in rd.flatten() {
            let root = entry.path();
            if !root.join("trace.json").is_file() {
                continue;
            }
            if !flowtrace_core::state::run_dir(&root, run_id).is_dir() {
                continue;
            }
            let trace_id = match root.file_name().and_then(|s| s.to_str()) {
                Some(s) => s.to_string(),
                None => continue,
            };
            if let Ok(mut idx) = state.run_index.lock() {
                idx.insert(run_id.to_string(), (trace_id.clone(), root.clone()));
            }
            return Ok((trace_id, root));
        }
    }
    Err(ApiFault::not_found(format!("run `{}`", run_id)))
}

