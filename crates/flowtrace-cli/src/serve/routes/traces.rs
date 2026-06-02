use axum::extract::{Path as AxumPath, Query, State};
use axum::Json;
use flowtrace_core::schema::{Trace, StepSpec};
use flowtrace_core::validate::{lint, validate, LintWarning};
use serde::{Deserialize, Serialize};

use crate::serve::error::{ApiFault, ApiResult};
use crate::serve::events::{broadcast, SseEventBody};
use crate::serve::scope::{find_trace, list_traces, write_trace};
use crate::serve::state::AppState;

#[derive(Serialize)]
pub struct TraceSummary {
    pub trace_id: String,
    pub id: String,
    pub title: String,
    pub description: String,
    pub version: String,
    pub step_count: usize,
    pub latest_run: Option<String>,
    pub status: String,
}

#[derive(Deserialize)]
pub struct ListQuery {
    pub q: Option<String>,
    pub status: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    Query(q): Query<ListQuery>,
) -> ApiResult<Json<Vec<TraceSummary>>> {
    let mut summaries: Vec<TraceSummary> = list_traces(&state)
        .iter()
        .map(|r| {
            let latest = flowtrace_core::state::latest_run(&r.root).ok().flatten();
            let status = derive_status(&r.root, latest.as_deref());
            TraceSummary {
                trace_id: r.trace_id.clone(),
                id: r.trace.id.clone(),
                title: r.trace.title.clone(),
                description: r.trace.description.clone(),
                version: r.trace.version.clone(),
                step_count: r.trace.steps.len(),
                latest_run: latest,
                status,
            }
        })
        .collect();
    if let Some(needle) = q.q {
        let needle_lc = needle.to_lowercase();
        summaries.retain(|s| {
            s.title.to_lowercase().contains(&needle_lc)
                || s.description.to_lowercase().contains(&needle_lc)
                || s.trace_id.to_lowercase().contains(&needle_lc)
        });
    }
    if let Some(status) = q.status {
        summaries.retain(|s| s.status == status);
    }
    Ok(Json(summaries))
}

fn derive_status(root: &std::path::Path, latest: Option<&str>) -> String {
    let Some(run) = latest else {
        return "idle".into();
    };
    match flowtrace_core::state::read_state(root, run) {
        Ok(s) if s.aborted => "aborted".into(),
        Ok(s) if !s.blocked().is_empty() => "blocked".into(),
        Ok(s) if s.current().is_some() => "running".into(),
        Ok(s)
            if !s.steps.is_empty()
                && s.steps
                    .values()
                    .all(|st| matches!(st.status, flowtrace_core::state::Status::Done { .. })) =>
        {
            "done".into()
        }
        Ok(_) => "idle".into(),
        Err(_) => "unknown".into(),
    }
}

fn truthy<'de, D>(deserializer: D) -> std::result::Result<bool, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let raw: Option<String> = Option::deserialize(deserializer)?;
    Ok(matches!(
        raw.as_deref().map(str::trim).map(str::to_ascii_lowercase).as_deref(),
        Some("1" | "true" | "yes" | "on")
    ))
}

#[derive(Deserialize)]
pub struct GetQuery {
    #[serde(default, deserialize_with = "truthy")]
    pub validate: bool,
    #[serde(default, deserialize_with = "truthy")]
    pub lint: bool,
    pub fmt: Option<String>,
}

#[derive(Serialize)]
pub struct TraceDetail {
    #[serde(flatten)]
    pub trace: Trace,
    pub trace_id: String,
    pub validation: Option<ValidationResult>,
    pub lint: Option<Vec<LintWarning>>,
    pub formatted: Option<String>,
}

#[derive(Serialize)]
pub struct ValidationResult {
    pub ok: bool,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct StepFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub mime: String,
    pub kind: &'static str,
}

/// Classify a file path into the `kind` discriminator the viewer switches on
/// (`"text"` previews inline, `"binary"` gets a download fallback).
fn file_kind(path: &std::path::Path, mime: &str) -> &'static str {
    if mime.starts_with("text/")
        || mime == "application/json"
        || mime == "application/javascript"
        || mime == "application/xml"
        || mime == "application/x-sh"
        || matches!(
            path.extension().and_then(|e| e.to_str()),
            Some("py" | "r" | "R" | "sh" | "j2" | "jinja" | "toml" | "yml" | "yaml" | "ini" | "conf" | "rs" | "ts" | "tsx" | "go" | "rb")
        )
    {
        "text"
    } else {
        "binary"
    }
}

/// Build a [`StepFile`] from a directory entry, or `None` to skip it: not a
/// regular file, hidden (dotfile), or — defensively — resolving outside
/// `scope_root` (e.g. reached through a symlink). In the escape case we omit
/// the single entry rather than failing the entire listing with a 500.
///
/// Shared by `list_step_files` and `list_trace_files` so the mime/`kind`
/// classification can't drift between the two drawers.
fn classify_file(
    entry: &std::fs::DirEntry,
    prefix: &str,
    scope_root: &std::path::Path,
) -> Option<StepFile> {
    let path = entry.path();
    if !path.is_file() {
        return None;
    }
    let raw_name = entry.file_name().to_string_lossy().to_string();
    if raw_name.starts_with('.') {
        return None;
    }
    let meta = entry.metadata().ok()?;
    let mime = mime_guess::from_path(&path)
        .first_or_octet_stream()
        .to_string();
    let kind = file_kind(&path, &mime);
    let rel = path
        .strip_prefix(scope_root)
        .ok()?
        .to_string_lossy()
        .replace('\\', "/");
    Some(StepFile {
        name: format!("{}{}", prefix, raw_name),
        path: rel,
        size: meta.len(),
        mime,
        kind,
    })
}

/// List all files belonging to a step. Scans:
/// 1. The step root (`steps/<step_id>/*`) — flat files like STEP.md
/// 2. `steps/<step_id>/scripts/*` — step-local code
/// 3. `steps/<step_id>/resources/*` — step-local static material
///
/// `name` is the relative path from the step folder (e.g. `STEP.md`,
/// `scripts/render.py`, `resources/diagram.png`). `path` is the
/// scope-relative path so the frontend can fetch via `/api/files/<path>`.
pub async fn list_step_files(
    State(state): State<AppState>,
    AxumPath((trace_id, step_id)): AxumPath<(String, String)>,
) -> ApiResult<Json<Vec<StepFile>>> {
    if step_id.contains('/') || step_id.contains("..") {
        return Err(ApiFault::bad_request("invalid step id"));
    }
    let r = find_trace(&state, &trace_id)?;
    if !r.trace.steps.contains_key(&step_id) {
        return Err(ApiFault::not_found(format!("unknown step: {}", step_id)));
    }
    let step_dir = r.root.join("steps").join(&step_id);
    let scope_root = state
        .scope_for(&r.root)
        .ok_or_else(|| ApiFault::internal("trace root outside any scope"))?;

    let mut files: Vec<StepFile> = Vec::new();
    // Scan: step root + scripts/ subdir + resources/ subdir
    let dirs: [(std::path::PathBuf, &str); 3] = [
        (step_dir.clone(), ""),
        (step_dir.join("scripts"), "scripts/"),
        (step_dir.join("resources"), "resources/"),
    ];
    for (dir, prefix) in &dirs {
        let read = match std::fs::read_dir(dir) {
            Ok(rd) => rd,
            Err(_) => continue,
        };
        for entry in read.flatten() {
            if let Some(f) = classify_file(&entry, prefix, &scope_root) {
                files.push(f);
            }
        }
    }
    files.sort_by(|a, b| {
        // STEP.md first, then alphabetical
        let rank = |n: &str| {
            if n.eq_ignore_ascii_case("STEP.md") {
                0
            } else {
                1
            }
        };
        rank(&a.name)
            .cmp(&rank(&b.name))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(Json(files))
}

/// List all trace-root files — the symmetric sibling of `list_step_files`.
///
/// Scans:
/// 1. The trace root (`<trace_root>/*`) — flat files like `README.md`,
///    `memory.md`. `trace.json` is excluded (already in the trace detail).
/// 2. Every top-level subdirectory at the trace root that isn't a reserved
///    folder (`steps/`, `runs/`, `.git/`) or hidden — typically `scripts/`,
///    `resources/`, `references/`, `data/`, `styles/`, `prompts/`, etc.
///    The trace spec doesn't pin a folder name, so the author's choice
///    surfaces verbatim.
pub async fn list_trace_files(
    State(state): State<AppState>,
    AxumPath(trace_id): AxumPath<String>,
) -> ApiResult<Json<Vec<StepFile>>> {
    let r = find_trace(&state, &trace_id)?;
    let scope_root = state
        .scope_for(&r.root)
        .ok_or_else(|| ApiFault::internal("trace root outside any scope"))?;

    // Discover scanned dirs: root + every non-reserved top-level subdir.
    let reserved: [&str; 3] = ["steps", "runs", ".git"];
    let mut dirs: Vec<(std::path::PathBuf, String)> = vec![(r.root.clone(), String::new())];
    if let Ok(rd) = std::fs::read_dir(&r.root) {
        for entry in rd.flatten() {
            // Don't follow symlinked dirs — they can point outside the trace
            // (and outside the scope). `file_type()` reports the link itself
            // without dereferencing, unlike `path.is_dir()`.
            if entry.file_type().map(|t| t.is_symlink()).unwrap_or(true) {
                continue;
            }
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') || reserved.iter().any(|r| *r == name) {
                continue;
            }
            dirs.push((path, format!("{}/", name)));
        }
    }
    dirs.sort_by(|a, b| a.1.cmp(&b.1));

    let mut files: Vec<StepFile> = Vec::new();
    for (dir, prefix) in &dirs {
        let read = match std::fs::read_dir(dir) {
            Ok(rd) => rd,
            Err(_) => continue,
        };
        for entry in read.flatten() {
            // Top-level: hide trace.json (rendered separately as the spine).
            if prefix.is_empty()
                && entry
                    .file_name()
                    .to_string_lossy()
                    .eq_ignore_ascii_case("trace.json")
            {
                continue;
            }
            if let Some(f) = classify_file(&entry, prefix, &scope_root) {
                files.push(f);
            }
        }
    }
    files.sort_by(|a, b| {
        // README.md first, memory.md next, then alphabetical.
        let rank = |n: &str| {
            if n.eq_ignore_ascii_case("README.md") {
                0
            } else if n.eq_ignore_ascii_case("memory.md") {
                1
            } else {
                2
            }
        };
        rank(&a.name)
            .cmp(&rank(&b.name))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(Json(files))
}

pub async fn get(
    State(state): State<AppState>,
    AxumPath(trace_id): AxumPath<String>,
    Query(q): Query<GetQuery>,
) -> ApiResult<Json<TraceDetail>> {
    let r = find_trace(&state, &trace_id)?;
    let validation = q.validate.then(|| match validate(&r.trace) {
        Ok(()) => ValidationResult { ok: true, error: None },
        Err(e) => ValidationResult { ok: false, error: Some(e.to_string()) },
    });
    let lint_out = q.lint.then(|| lint(&r.trace));
    let formatted = match q.fmt.as_deref() {
        Some("ascii") => Some(crate::format_dag::ascii(&r.trace)),
        Some("mermaid") => Some(crate::format_dag::mermaid(&r.trace)),
        Some("dot") => Some(crate::format_dag::dot(&r.trace)),
        _ => None,
    };
    Ok(Json(TraceDetail {
        trace_id: r.trace_id,
        trace: r.trace,
        validation,
        lint: lint_out,
        formatted,
    }))
}

#[derive(Deserialize)]
pub struct CreateTrace {
    pub trace_id: String,
    pub title: String,
    pub description: String,
}

pub async fn create(
    State(state): State<AppState>,
    Json(body): Json<CreateTrace>,
) -> ApiResult<Json<TraceDetail>> {
    let scope = state.user_scope_root.clone();
    let target = scope.join(&body.trace_id);
    if target.exists() {
        return Err(ApiFault::bad_request(format!(
            "{} already exists",
            target.display()
        )));
    }
    std::fs::create_dir_all(&target)?;
    let trace = Trace::minimal(crate::id::random_trace_id(), body.title, body.description);
    write_trace(&state, &target, &trace).map_err(ApiFault::from)?;
    broadcast(
        &state,
        SseEventBody::TraceCreated {
            trace_id: body.trace_id.clone(),
        },
    );
    Ok(Json(TraceDetail {
        trace_id: body.trace_id,
        trace,
        validation: None,
        lint: None,
        formatted: None,
    }))
}

#[derive(Deserialize)]
pub struct PatchMeta {
    pub title: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    /// "major" / "minor" / "patch" — overrides explicit version when set.
    pub bump: Option<String>,
}

pub async fn patch_meta(
    State(state): State<AppState>,
    AxumPath(trace_id): AxumPath<String>,
    Json(body): Json<PatchMeta>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    if let Some(t) = body.title {
        trace.title = t;
    }
    if let Some(d) = body.description {
        trace.description = d;
    }
    if let Some(v) = body.version {
        trace.version = v;
    } else if let Some(b) = body.bump {
        trace.version = bump_version(&trace.version, &b)
            .ok_or_else(|| ApiFault::bad_request("invalid version or bump kind"))?;
    }
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

fn bump_version(v: &str, kind: &str) -> Option<String> {
    let parts: Vec<u32> = v.split('.').filter_map(|p| p.parse().ok()).collect();
    if parts.len() != 3 {
        return None;
    }
    let (mut maj, mut min, mut pat) = (parts[0], parts[1], parts[2]);
    match kind {
        "major" => {
            maj += 1;
            min = 0;
            pat = 0;
        }
        "minor" => {
            min += 1;
            pat = 0;
        }
        "patch" => pat += 1,
        _ => return None,
    }
    Some(format!("{}.{}.{}", maj, min, pat))
}

pub async fn remove(
    State(state): State<AppState>,
    AxumPath(trace_id): AxumPath<String>,
) -> ApiResult<Json<serde_json::Value>> {
    let r = find_trace(&state, &trace_id)?;
    std::fs::remove_dir_all(&r.root)?;
    state.invalidate_trace_cache();
    broadcast(
        &state,
        SseEventBody::TraceRemoved {
            trace_id: trace_id.clone(),
        },
    );
    Ok(Json(serde_json::json!({ "removed": trace_id })))
}

#[derive(Deserialize)]
pub struct AddStep {
    pub step_id: String,
    pub name: String,
    pub does: String,
    #[serde(default)]
    pub from_inputs: Vec<String>,
    #[serde(default)]
    pub from_steps: Vec<String>,
    #[serde(default)]
    pub assets: Vec<String>,
    pub asset_title: Option<String>,
}

pub async fn add_step(
    State(state): State<AppState>,
    AxumPath(trace_id): AxumPath<String>,
    Json(body): Json<AddStep>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    if trace.steps.contains_key(&body.step_id) {
        return Err(ApiFault::bad_request(format!(
            "step `{}` exists",
            body.step_id
        )));
    }
    trace.steps.insert(
        body.step_id.clone(),
        StepSpec {
            name: body.name,
            does: body.does,
            from_inputs: body.from_inputs,
            from_steps: body.from_steps,
            assets: body.assets,
            asset_title: body.asset_title,
            deprecated: false,
        },
    );
    validate(&trace).map_err(ApiFault::from)?;
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

#[derive(Deserialize)]
pub struct PatchStep {
    pub name: Option<String>,
    pub does: Option<String>,
    pub asset_title: Option<String>,
    pub deprecated: Option<bool>,
}

pub async fn patch_step(
    State(state): State<AppState>,
    AxumPath((trace_id, step_id)): AxumPath<(String, String)>,
    Json(body): Json<PatchStep>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    let s = trace
        .steps
        .get_mut(&step_id)
        .ok_or_else(|| ApiFault::not_found(format!("step `{}`", step_id)))?;
    if let Some(n) = body.name {
        s.name = n;
    }
    if let Some(d) = body.does {
        s.does = d;
    }
    if body.asset_title.is_some() {
        s.asset_title = body.asset_title;
    }
    if let Some(d) = body.deprecated {
        s.deprecated = d;
    }
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

pub async fn remove_step(
    State(state): State<AppState>,
    AxumPath((trace_id, step_id)): AxumPath<(String, String)>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    if trace.steps.remove(&step_id).is_none() {
        return Err(ApiFault::not_found(format!("step `{}`", step_id)));
    }
    for s in trace.steps.values_mut() {
        s.from_steps.retain(|d| d != &step_id);
    }
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

#[derive(Deserialize)]
pub struct RenameStep {
    pub to: String,
}

pub async fn rename_step(
    State(state): State<AppState>,
    AxumPath((trace_id, step_id)): AxumPath<(String, String)>,
    Json(body): Json<RenameStep>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    let spec = trace
        .steps
        .remove(&step_id)
        .ok_or_else(|| ApiFault::not_found(format!("step `{}`", step_id)))?;
    if trace.steps.contains_key(&body.to) {
        return Err(ApiFault::bad_request(format!("step `{}` exists", body.to)));
    }
    trace.steps.insert(body.to.clone(), spec);
    for s in trace.steps.values_mut() {
        for d in s.from_steps.iter_mut() {
            if *d == step_id {
                *d = body.to.clone();
            }
        }
    }
    validate(&trace).map_err(ApiFault::from)?;
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

#[derive(Deserialize)]
pub struct StepRefBody {
    pub step_id: String,
}

pub async fn add_from_step(
    State(state): State<AppState>,
    AxumPath((trace_id, step_id)): AxumPath<(String, String)>,
    Json(body): Json<StepRefBody>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    if !trace.steps.contains_key(&body.step_id) {
        return Err(ApiFault::not_found(format!(
            "target step `{}`",
            body.step_id
        )));
    }
    let s = trace
        .steps
        .get_mut(&step_id)
        .ok_or_else(|| ApiFault::not_found(format!("step `{}`", step_id)))?;
    if !s.from_steps.contains(&body.step_id) {
        s.from_steps.push(body.step_id);
    }
    validate(&trace).map_err(ApiFault::from)?;
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

pub async fn remove_from_step(
    State(state): State<AppState>,
    AxumPath((trace_id, step_id, dep)): AxumPath<(String, String, String)>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    let s = trace
        .steps
        .get_mut(&step_id)
        .ok_or_else(|| ApiFault::not_found(format!("step `{}`", step_id)))?;
    s.from_steps.retain(|d| d != &dep);
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

#[derive(Deserialize)]
pub struct AssetBody {
    pub path: String,
}

pub async fn add_asset(
    State(state): State<AppState>,
    AxumPath((trace_id, step_id)): AxumPath<(String, String)>,
    Json(body): Json<AssetBody>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    let s = trace
        .steps
        .get_mut(&step_id)
        .ok_or_else(|| ApiFault::not_found(format!("step `{}`", step_id)))?;
    if !s.assets.contains(&body.path) {
        s.assets.push(body.path);
    }
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

pub async fn remove_asset(
    State(state): State<AppState>,
    AxumPath((trace_id, step_id, asset)): AxumPath<(String, String, String)>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    let s = trace
        .steps
        .get_mut(&step_id)
        .ok_or_else(|| ApiFault::not_found(format!("step `{}`", step_id)))?;
    s.assets.retain(|a| a != &asset);
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

#[derive(Deserialize)]
pub struct PatchDeliverable {
    pub description: Option<String>,
    pub assets: Option<Vec<String>>,
}

pub async fn patch_deliverable(
    State(state): State<AppState>,
    AxumPath(trace_id): AxumPath<String>,
    Json(body): Json<PatchDeliverable>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    if let Some(d) = body.description {
        trace.deliverable.description = d;
    }
    if let Some(a) = body.assets {
        trace.deliverable.assets = a;
    }
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

#[derive(Deserialize)]
pub struct PkgBody {
    pub pkg: String,
}

pub async fn add_env_pkg(
    State(state): State<AppState>,
    AxumPath((trace_id, lang)): AxumPath<(String, String)>,
    Json(body): Json<PkgBody>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    let target = match lang.as_str() {
        "python" => &mut trace.environment.python,
        "r" => &mut trace.environment.r,
        _ => return Err(ApiFault::bad_request("lang must be `python` or `r`")),
    };
    if !target.contains(&body.pkg) {
        target.push(body.pkg);
    }
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}

pub async fn remove_env_pkg(
    State(state): State<AppState>,
    AxumPath((trace_id, lang, pkg)): AxumPath<(String, String, String)>,
) -> ApiResult<Json<Trace>> {
    let r = find_trace(&state, &trace_id)?;
    let mut trace = r.trace;
    let target = match lang.as_str() {
        "python" => &mut trace.environment.python,
        "r" => &mut trace.environment.r,
        _ => return Err(ApiFault::bad_request("lang must be `python` or `r`")),
    };
    target.retain(|p| p != &pkg);
    write_trace(&state, &r.root, &trace).map_err(ApiFault::from)?;
    broadcast(&state, SseEventBody::TraceUpdated { trace_id });
    Ok(Json(trace))
}
