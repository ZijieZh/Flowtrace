use crate::error::{TraceError, Result};
use crate::io::atomic_write_json;
use chrono::{DateTime, Utc};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

pub const RUNS_DIR: &str = "runs";
pub const STATE_FILE: &str = "state.json";

/// Run-level lifecycle state. The trace is the static plan; this is the
/// runtime fact for one run. The UI reads `steps[id].status` and renders.
/// Lives at `runs/<run_id>/state.json` and is the single source of truth for
/// run status — every CLI write touches this file atomically and commits.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RunState {
    /// Human-readable label for this run; shown in the UI and used in commit messages.
    pub name: String,
    /// When the run was created (UTC, RFC3339).
    pub started_at: DateTime<Utc>,
    /// True if the run is paused. Run-level flag; per-step status is untouched while paused.
    #[serde(default, skip_serializing_if = "is_false")]
    pub paused: bool,
    /// True if the run was aborted. Terminal: aborted runs are read-only.
    #[serde(default, skip_serializing_if = "is_false")]
    pub aborted: bool,
    /// Per-step state, keyed by step id (the same id used in `trace.json#steps`).
    #[serde(default)]
    pub steps: BTreeMap<String, StepState>,
    /// Final-output state for the whole run.
    #[serde(default)]
    pub deliverable: DeliverableState,
}

fn is_false(b: &bool) -> bool {
    !*b
}

/// Per-step state: the current status plus the list of declared assets.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct StepState {
    /// Current status for this step. See `Status`.
    pub status: Status,
    /// Step-relative paths the step has declared as official outputs.
    /// Only paths in this list are committed; other files in the step folder are scratch.
    #[serde(default)]
    pub assets: Vec<String>,
}

/// Run-final deliverable state — the same shape as a step but at run scope.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct DeliverableState {
    /// Current deliverable status.
    #[serde(default)]
    pub status: Status,
    /// Run-relative paths declared as the run's final outputs.
    #[serde(default)]
    pub assets: Vec<String>,
}

/// Status of a step (or the deliverable). The `kind` discriminator names the
/// variant; the optional `message` is the one-liner shown under the step
/// description in NodeMap: running activity / blocked reason / done takeaway
/// / error message. `blocked` and `error` REQUIRE a message; the others may
/// omit it.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Status {
    /// Default: the step hasn't started.
    Idle,
    /// The step is currently being worked on.
    Running {
        /// What the agent is doing (optional).
        #[serde(default, skip_serializing_if = "Option::is_none")]
        message: Option<String>,
    },
    /// The step needs a human decision before it can continue. Message is required.
    Blocked {
        /// Why the step is blocked / what's needed to unblock it.
        message: String,
    },
    /// The step finished successfully.
    Done {
        /// One-line takeaway (optional).
        #[serde(default, skip_serializing_if = "Option::is_none")]
        message: Option<String>,
    },
    /// The step failed. Message is required.
    Error {
        /// The error condition.
        message: String,
    },
}

impl Status {
    pub fn kind(&self) -> &'static str {
        match self {
            Status::Idle => "idle",
            Status::Running { .. } => "running",
            Status::Blocked { .. } => "blocked",
            Status::Done { .. } => "done",
            Status::Error { .. } => "error",
        }
    }

    /// Build a Status from its kind label + optional message. `blocked` and
    /// `error` require a message; the others treat it as optional. Centralizes
    /// the "must have message" validation that CLI and HTTP route both need.
    pub fn from_kind(
        kind: &str,
        message: Option<String>,
    ) -> std::result::Result<Self, &'static str> {
        match kind {
            "idle" => Ok(Status::Idle),
            "running" => Ok(Status::Running { message }),
            "done" => Ok(Status::Done { message }),
            "blocked" => message
                .map(|m| Status::Blocked { message: m })
                .ok_or("status=blocked requires a message"),
            "error" => message
                .map(|m| Status::Error { message: m })
                .ok_or("status=error requires a message"),
            _ => Err("unknown status kind"),
        }
    }
}

impl Default for Status {
    fn default() -> Self {
        Status::Idle
    }
}

impl Default for StepState {
    fn default() -> Self {
        Self { status: Status::Idle, assets: vec![] }
    }
}

impl Default for DeliverableState {
    fn default() -> Self {
        Self { status: Status::Idle, assets: vec![] }
    }
}

impl RunState {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            started_at: Utc::now(),
            paused: false,
            aborted: false,
            steps: BTreeMap::new(),
            deliverable: DeliverableState::default(),
        }
    }

    pub fn set_name(&mut self, name: impl Into<String>) {
        self.name = name.into();
    }

    fn entry(&mut self, step_id: &str) -> &mut StepState {
        self.steps.entry(step_id.to_string()).or_default()
    }

    pub fn set_step_status(&mut self, step_id: &str, status: Status) {
        self.entry(step_id).status = status;
    }

    pub fn set_step_assets(&mut self, step_id: &str, assets: Vec<String>) {
        self.entry(step_id).assets = assets;
    }

    pub fn start_step(&mut self, step_id: &str, message: Option<&str>) {
        self.set_step_status(step_id, Status::Running { message: message.map(|m| m.into()) });
    }

    pub fn finish_step(&mut self, step_id: &str, message: Option<&str>) {
        self.set_step_status(step_id, Status::Done { message: message.map(|m| m.into()) });
    }

    pub fn block_step(&mut self, step_id: &str, reason: &str) {
        self.set_step_status(step_id, Status::Blocked { message: reason.into() });
    }

    pub fn unblock(&mut self, step_id: &str) {
        self.set_step_status(step_id, Status::Idle);
    }

    pub fn error_step(&mut self, step_id: &str, message: &str) {
        self.set_step_status(step_id, Status::Error { message: message.into() });
    }

    pub fn set_deliverable_status(&mut self, status: Status) {
        self.deliverable.status = status;
    }

    pub fn set_deliverable_assets(&mut self, assets: Vec<String>) {
        self.deliverable.assets = assets;
    }

    pub fn pause(&mut self) {
        self.paused = true;
    }

    pub fn resume(&mut self) {
        self.paused = false;
    }

    pub fn abort(&mut self) {
        self.aborted = true;
    }

    // ── Derived views (computed from `steps`, no separate storage) ──

    pub fn current(&self) -> Option<&str> {
        self.steps.iter().find_map(|(id, s)| match s.status {
            Status::Running { .. } => Some(id.as_str()),
            _ => None,
        })
    }

    pub fn completed(&self) -> Vec<String> {
        self.steps
            .iter()
            .filter(|(_, s)| matches!(s.status, Status::Done { .. }))
            .map(|(id, _)| id.clone())
            .collect()
    }

    pub fn blocked(&self) -> Vec<String> {
        self.steps
            .iter()
            .filter(|(_, s)| matches!(s.status, Status::Blocked { .. }))
            .map(|(id, _)| id.clone())
            .collect()
    }
}

impl Default for RunState {
    fn default() -> Self {
        Self::new("")
    }
}

/// Walk up from `start` until a directory containing `trace.json` is found.
pub fn find_trace_root(start: &Path) -> Result<PathBuf> {
    let mut cur = fs::canonicalize(start)?;
    loop {
        if cur.join("trace.json").is_file() {
            return Ok(cur);
        }
        if !cur.pop() {
            return Err(TraceError::NotInTrace);
        }
    }
}

pub fn runs_dir(trace_root: &Path) -> PathBuf {
    trace_root.join(RUNS_DIR)
}

pub fn run_dir(trace_root: &Path, run_id: &str) -> PathBuf {
    runs_dir(trace_root).join(run_id)
}

pub fn state_path(trace_root: &Path, run_id: &str) -> PathBuf {
    run_dir(trace_root, run_id).join(STATE_FILE)
}

pub fn list_runs(trace_root: &Path) -> Result<Vec<String>> {
    let dir = runs_dir(trace_root);
    if !dir.is_dir() {
        return Ok(vec![]);
    }
    let mut runs: Vec<String> = fs::read_dir(&dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter_map(|e| e.file_name().into_string().ok())
        .collect();
    runs.sort();
    Ok(runs)
}

pub fn latest_run(trace_root: &Path) -> Result<Option<String>> {
    Ok(list_runs(trace_root)?.into_iter().last())
}

pub fn new_run_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = Utc::now().format("%Y%m%dT%H%M%SZ");
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    format!("run_{}_{:04x}", ts, nanos & 0xffff)
}

pub fn create_run(trace_root: &Path, name: impl Into<String>) -> Result<String> {
    let run_id = new_run_id();
    let dir = run_dir(trace_root, &run_id);
    fs::create_dir_all(&dir)?;
    write_state(trace_root, &run_id, &RunState::new(name))?;
    Ok(run_id)
}

pub fn read_state(trace_root: &Path, run_id: &str) -> Result<RunState> {
    let path = state_path(trace_root, run_id);
    let bytes = fs::read(&path)
        .map_err(|e| TraceError::Io(format!("read {}: {}", path.display(), e)))?;
    Ok(serde_json::from_slice(&bytes)?)
}

pub fn write_state(trace_root: &Path, run_id: &str, state: &RunState) -> Result<()> {
    let path = state_path(trace_root, run_id);
    atomic_write_json(&path, "state", state)
}

pub fn resolve_run(trace_root: &Path, run_id: Option<&str>) -> Result<String> {
    if let Some(id) = run_id {
        if !run_dir(trace_root, id).is_dir() {
            return Err(TraceError::RunNotFound(id.to_string()));
        }
        return Ok(id.to_string());
    }
    latest_run(trace_root)?.ok_or(TraceError::NoRuns)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip() {
        let mut s = RunState::new("hello");
        s.start_step("foo", Some("about to do foo"));
        s.finish_step("foo", Some("foo done in 2s"));
        s.block_step("bar", "awaiting approval");
        let json = serde_json::to_string_pretty(&s).unwrap();
        let parsed: RunState = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.name, "hello");
        assert!(matches!(parsed.steps["foo"].status, Status::Done { .. }));
        assert!(matches!(parsed.steps["bar"].status, Status::Blocked { .. }));
    }

    #[test]
    fn derived_views() {
        let mut s = RunState::new("");
        s.start_step("a", None);
        s.finish_step("b", None);
        s.block_step("c", "stuck");
        assert_eq!(s.current(), Some("a"));
        assert_eq!(s.completed(), vec!["b".to_string()]);
        assert_eq!(s.blocked(), vec!["c".to_string()]);
    }

    #[test]
    fn run_id_format() {
        let id = new_run_id();
        assert!(id.starts_with("run_"));
        assert_eq!(id.len(), 25);
    }

    #[test]
    fn block_then_start_replaces_status() {
        let mut s = RunState::new("");
        s.block_step("a", "broken");
        assert_eq!(s.blocked(), vec!["a".to_string()]);
        s.start_step("a", None);
        assert!(s.blocked().is_empty());
        assert_eq!(s.current(), Some("a"));
    }

    #[test]
    fn pause_does_not_clear_running() {
        // Pause is a run-level flag; per-step status untouched.
        let mut s = RunState::new("");
        s.start_step("a", None);
        s.pause();
        assert!(s.paused);
        assert_eq!(s.current(), Some("a"));
    }
}
