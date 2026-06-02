use axum::extract::{Path as AxumPath, State};
use axum::Json;

use crate::git;
use crate::serve::error::{ApiFault, ApiResult};
use crate::serve::scope::locate_run;
use crate::serve::state::AppState;

/// `GET /api/runs/{id}/commits` — every commit that touched `runs/<id>/`,
/// newest first. Drives the RunHistoryModal: each commit is rendered as a
/// row, the SHA is what the renderer passes as `?at=` when fetching files.
pub async fn list(
    State(state): State<AppState>,
    AxumPath(id): AxumPath<String>,
) -> ApiResult<Json<Vec<git::CommitInfo>>> {
    let (_, root) = locate_run(&state, &id)?;
    let rel = format!("runs/{}", id);
    let commits = tokio::task::spawn_blocking(move || git::commits_under(&root, &rel))
        .await
        .map_err(|e| ApiFault::internal(format!("commits task panicked: {e}")))?
        .map_err(ApiFault::from)?;
    Ok(Json(commits))
}
