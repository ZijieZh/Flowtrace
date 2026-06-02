use axum::extract::{Path as AxumPath, Query, State};
use axum::Json;
use flowtrace_core::paths::check_and_normalize_all;
use std::path::Path;
use std::sync::Arc;
use flowtrace_core::state::{
    create_run, list_runs as list_runs_core, read_state, write_state, RunState, Status,
};
use serde::{Deserialize, Serialize};

use crate::git;
use crate::serve::error::{ApiFault, ApiResult};
use crate::serve::events::{broadcast, SseEventBody};
use crate::serve::scope::{find_trace, locate_run};
use crate::serve::state::AppState;

#[derive(Serialize)]
pub struct RunSummary {
    pub run_id: String,
    pub name: String,
    pub started_at: String,
    pub current: Option<String>,
    pub completed: Vec<String>,
    pub blocked: Vec<String>,
    pub paused: bool,
    pub aborted: bool,
}

pub async fn list(
    State(state): State<AppState>,
    AxumPath(trace_id): AxumPath<String>,
) -> ApiResult<Json<Vec<RunSummary>>> {
    let r = find_trace(&state, &trace_id)?;
    let root = r.root.clone();
    let runs = tokio::task::spawn_blocking(move || -> Result<Vec<RunSummary>, ApiFault> {
        let mut runs: Vec<RunSummary> = list_runs_core(&root)
            .map_err(ApiFault::from)?
            .into_iter()
            .filter_map(|id| {
                let st = read_state(&root, &id).ok()?;
                Some(RunSummary {
                    run_id: id,
                    started_at: st.started_at.to_rfc3339(),
                    current: st.current().map(|s| s.to_string()),
                    completed: st.completed(),
                    blocked: st.blocked(),
                    paused: st.paused,
                    aborted: st.aborted,
                    name: st.name,
                })
            })
            .collect();
        runs.reverse();
        Ok(runs)
    })
    .await
    .map_err(|e| ApiFault::internal(format!("list task panicked: {e}")))??;
    Ok(Json(runs))
}

#[derive(Deserialize, Default)]
pub struct CreateRunBody {
    #[serde(default)]
    pub name: String,
}

pub async fn create(
    State(state): State<AppState>,
    AxumPath(trace_id): AxumPath<String>,
    body: Option<Json<CreateRunBody>>,
) -> ApiResult<Json<serde_json::Value>> {
    let r = find_trace(&state, &trace_id)?;
    let name = body.map(|b| b.0.name).unwrap_or_default();
    let _ = git::init_async(r.root.clone()).await;
    let id = create_run(&r.root, name.clone()).map_err(ApiFault::from)?;
    let label = if name.is_empty() { id.clone() } else { name };
    let state_rel = format!("runs/{}/state.json", id);
    let _ = git::commit_files_async(
        r.root.clone(),
        git::run_event_commit_msg(&label, "start"),
        vec![state_rel],
    )
    .await;
    broadcast(
        &state,
        SseEventBody::RunCreated {
            trace_id,
            run_id: id.clone(),
        },
    );
    Ok(Json(
        serde_json::json!({ "run_id": id, "started": true }),
    ))
}

#[derive(Serialize, schemars::JsonSchema)]
pub struct RunDetail {
    pub run_id: String,
    pub trace_id: String,
    /// Commit SHA the response was rendered from — HEAD when `?at=` is absent,
    /// otherwise the requested commit. Frontend threads this into asset URLs
    /// (`/api/files/.../?at=<commit>`) so every file fetch is content-addressed
    /// and cacheable. Absent only if the trace has zero commits.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit: Option<String>,
    /// Per-step committed-file paths, derived from the git tree at `commit`.
    /// `{step_id: [filename_relative_to_step_dir, ...]}`. Git's truth, not
    /// metadata — UI marks each declared asset generated vs. not-yet. Absent
    /// when `commit` is absent. Held behind `Arc` so cache hits don't deep-copy
    /// the map per request (serializes the same).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub committed: Option<Arc<std::collections::HashMap<String, Vec<String>>>>,
    #[serde(flatten)]
    pub state: RunState,
}

#[derive(Deserialize, Default)]
pub struct GetRunQuery {
    /// Optional commit SHA — return state.json as of that commit via libgit2.
    #[serde(default)]
    pub at: Option<String>,
}

pub async fn get(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Query(q): Query<GetRunQuery>,
) -> ApiResult<Json<RunDetail>> {
    let (trace_id, root) = locate_run(&state, &id)?;
    let st = match q.at.as_deref().filter(|s| !s.is_empty()) {
        Some(sha) => {
            let rel = format!("runs/{}/state.json", id);
            let root_owned = root.clone();
            let sha_owned = sha.to_string();
            let bytes = tokio::task::spawn_blocking(move || git::show_at(&root_owned, &sha_owned, &rel))
                .await
                .map_err(|e| ApiFault::internal(format!("git task panicked: {e}")))?
                .map_err(|e| ApiFault::not_found(format!("at={}: {}", sha, e)))?;
            serde_json::from_slice::<RunState>(&bytes)
                .map_err(|e| ApiFault::internal(format!("parse historical state: {e}")))?
        }
        None => {
            let id_for_task = id.clone();
            let root_for_task = root.clone();
            tokio::task::spawn_blocking(move || read_state(&root_for_task, &id_for_task))
                .await
                .map_err(|e| ApiFault::internal(format!("read task panicked: {e}")))?
                .map_err(ApiFault::from)?
        }
    };
    // Resolve commit + committed-files map together. When `?at=` is set and
    // the (root, sha, run) tuple is already cached we skip spawn_blocking
    // entirely; otherwise one blocking task opens the repo once, resolves
    // HEAD (if needed), checks cache, and walks the tree on miss.
    let (commit, committed) = resolve_commit_state(
        &state,
        &root,
        q.at.as_deref().filter(|s| !s.is_empty()),
        &id,
    )
    .await;
    Ok(Json(RunDetail {
        run_id: id,
        trace_id,
        commit,
        committed,
        state: st,
    }))
}

/// Resolve `(commit_sha, committed_files)` for the run-detail response.
/// Cache hits on `?at=` skip spawn_blocking entirely; everything else runs
/// in a single blocking task that opens the repo once.
async fn resolve_commit_state(
    state: &AppState,
    root: &Path,
    at: Option<&str>,
    run_id: &str,
) -> (
    Option<String>,
    Option<Arc<std::collections::HashMap<String, Vec<String>>>>,
) {
    if let Some(sha) = at {
        let key = (root.to_path_buf(), sha.to_string(), run_id.to_string());
        if let Ok(mut cache) = state.committed_files_cache.lock() {
            if let Some(hit) = cache.get(&key) {
                return (Some(sha.to_string()), Some(Arc::clone(hit)));
            }
        }
    }

    let root_p = root.to_path_buf();
    let at_owned = at.map(String::from);
    let run_p = run_id.to_string();
    let cache_arc = Arc::clone(&state.committed_files_cache);

    tokio::task::spawn_blocking(move || {
        let sha = match at_owned {
            Some(s) => s,
            None => match git::head_sha(&root_p) {
                Ok(s) => s,
                Err(e) => {
                    // No HEAD yet (fresh `trace init` before first commit) is a
                    // legitimate state — don't shout. Anything else is logged so
                    // a broken repo doesn't masquerade as "no commits yet".
                    let msg = format!("{e:#}");
                    if !msg.contains("does not point to a valid object") &&
                       !msg.contains("reference 'refs/heads/main' not found") {
                        eprintln!("[trace] warn: head_sha({}) failed: {msg}", root_p.display());
                    }
                    return (None, None);
                }
            },
        };
        let key = (root_p.clone(), sha.clone(), run_p.clone());
        if let Ok(mut g) = cache_arc.lock() {
            if let Some(hit) = g.get(&key) {
                return (Some(sha), Some(Arc::clone(hit)));
            }
        }
        let arc = match git::list_run_step_files_at(&root_p, &sha, &run_p) {
            Ok(m) => Arc::new(m),
            Err(e) => {
                eprintln!(
                    "[trace] warn: list_run_step_files_at({}, {sha}, {run_p}) failed: {e:#}",
                    root_p.display()
                );
                return (Some(sha), None);
            }
        };
        if let Ok(mut g) = cache_arc.lock() {
            g.put(key, Arc::clone(&arc));
        }
        (Some(sha), Some(arc))
    })
    .await
    .unwrap_or((None, None))
}

#[derive(Deserialize)]
pub struct NameBody {
    pub name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StatusKind {
    Idle,
    Running,
    Blocked,
    Done,
    Error,
}

impl StatusKind {
    fn as_str(&self) -> &'static str {
        match self {
            StatusKind::Idle => "idle",
            StatusKind::Running => "running",
            StatusKind::Blocked => "blocked",
            StatusKind::Done => "done",
            StatusKind::Error => "error",
        }
    }
}

#[derive(Deserialize)]
pub struct SetStepBody {
    pub status: StatusKind,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub assets: Vec<String>,
}

pub async fn set_step(
    State(state): State<AppState>,
    AxumPath((id, step_id)): AxumPath<(String, String)>,
    Json(body): Json<SetStepBody>,
) -> ApiResult<Json<RunState>> {
    let SetStepBody { status, message, assets } = body;
    let new_status = Status::from_kind(status.as_str(), message).map_err(ApiFault::bad_request)?;
    let normalized = normalize_or_400(&assets)?;

    // Validate the step_id is declared in trace.json. Without this an HTTP
    // client can write phantom step keys into state.json. Use `find_trace`
    // which hits the TTL-cached parsed trace rather than re-reading disk
    // on every request.
    let (trace_id_owned, root_for_check) = locate_run(&state, &id)?;
    let trace_ref = find_trace(&state, &trace_id_owned)?;
    if !trace_ref.trace.steps.contains_key(&step_id) {
        let declared: Vec<&String> = trace_ref.trace.steps.keys().collect();
        return Err(ApiFault::not_found(format!(
            "unknown step `{}` in trace `{}`; declared steps: {:?}",
            step_id, trace_id_owned, declared
        )));
    }

    // Validate each asset exists on disk before staging. Asset paths are
    // step-relative; resolve under runs/<id>/<step_id>/.
    let step_dir_abs = flowtrace_core::state::run_dir(&root_for_check, &id).join(&step_id);
    for a in &normalized {
        if !step_dir_abs.join(a).exists() {
            return Err(ApiFault::bad_request(format!(
                "asset `{}` not found on disk under runs/{}/{}/",
                a, id, step_id
            )));
        }
    }

    let commit_msg = git::step_commit_msg(&step_id, &new_status);
    let mut files = vec![format!("runs/{}/state.json", id)];
    for a in &normalized {
        files.push(format!("runs/{}/{}/{}", id, step_id, a));
    }
    let step_id_for_apply = step_id.clone();
    let normalized_for_apply = normalized.clone();
    mutate(&state, id, commit_msg, files, move |s| {
        s.set_step_status(&step_id_for_apply, new_status);
        if !normalized_for_apply.is_empty() {
            s.set_step_assets(&step_id_for_apply, normalized_for_apply);
        }
    })
    .await
}

#[derive(Deserialize)]
pub struct SetDeliverableBody {
    pub status: StatusKind,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub assets: Vec<String>,
}

pub async fn set_deliverable(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(body): Json<SetDeliverableBody>,
) -> ApiResult<Json<RunState>> {
    let SetDeliverableBody { status, message, assets } = body;
    let new_status = Status::from_kind(status.as_str(), message).map_err(ApiFault::bad_request)?;
    let normalized = normalize_or_400(&assets)?;

    // Deliverable asset paths are run-relative. Validate each exists on disk.
    let (_, root_for_check) = locate_run(&state, &id)?;
    let run_dir_abs = flowtrace_core::state::run_dir(&root_for_check, &id);
    for a in &normalized {
        if !run_dir_abs.join(a).exists() {
            return Err(ApiFault::bad_request(format!(
                "asset `{}` not found on disk under runs/{}/",
                a, id
            )));
        }
    }

    let commit_msg = git::deliverable_commit_msg(&new_status);
    let mut files = vec![format!("runs/{}/state.json", id)];
    for a in &normalized {
        files.push(format!("runs/{}/{}", id, a));
    }
    let normalized_for_apply = normalized.clone();
    mutate(&state, id, commit_msg, files, move |s| {
        s.set_deliverable_status(new_status);
        if !normalized_for_apply.is_empty() {
            s.set_deliverable_assets(normalized_for_apply);
        }
    })
    .await
}

fn normalize_or_400(assets: &[String]) -> ApiResult<Vec<String>> {
    check_and_normalize_all(assets.iter().map(String::as_str))
        .map_err(|(p, e)| ApiFault::bad_request(format!("invalid asset path `{}`: {}", p, e)))
}

pub async fn rename_run(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
    Json(body): Json<NameBody>,
) -> ApiResult<Json<RunState>> {
    let event = format!("renamed to {}", body.name);
    let msg = git::run_event_commit_msg(&id, &event);
    let name = body.name;
    let files = vec![format!("runs/{}/state.json", id)];
    mutate(&state, id, msg, files, move |s| s.set_name(name)).await
}

pub async fn pause(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> ApiResult<Json<RunState>> {
    let msg = git::run_event_commit_msg(&id, "paused");
    let files = vec![format!("runs/{}/state.json", id)];
    mutate(&state, id, msg, files, |s| s.pause()).await
}

pub async fn resume(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> ApiResult<Json<RunState>> {
    let msg = git::run_event_commit_msg(&id, "resumed");
    let files = vec![format!("runs/{}/state.json", id)];
    mutate(&state, id, msg, files, |s| s.resume()).await
}

pub async fn abort(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> ApiResult<Json<RunState>> {
    let msg = git::run_event_commit_msg(&id, "aborted");
    let files = vec![format!("runs/{}/state.json", id)];
    mutate(&state, id, msg, files, |s| s.abort()).await
}

/// Read state.json, apply the mutation, write it back, then commit — all on a
/// blocking task so the async runtime worker isn't parked on disk I/O. The
/// caller declares exactly which paths the commit stages (`state.json` plus
/// any asset paths) — no `add -A` sweep.
async fn mutate<F>(
    state: &AppState,
    id: String,
    commit_msg: String,
    files: Vec<String>,
    apply: F,
) -> ApiResult<Json<RunState>>
where
    F: FnOnce(&mut RunState) + Send + 'static,
{
    let (trace_id, root) = locate_run(state, &id)?;
    let id_for_task = id.clone();
    let s: RunState = tokio::task::spawn_blocking(move || -> anyhow::Result<RunState> {
        let mut s = read_state(&root, &id_for_task)?;
        apply(&mut s);
        write_state(&root, &id_for_task, &s)?;
        let refs: Vec<&str> = files.iter().map(String::as_str).collect();
        git::commit_files(&root, &commit_msg, &refs)?;
        Ok(s)
    })
    .await
    .map_err(|e| ApiFault::internal(format!("mutate task panicked: {e}")))?
    .map_err(ApiFault::from)?;
    broadcast(state, SseEventBody::RunUpdated { trace_id, run_id: id });
    Ok(Json(s))
}
