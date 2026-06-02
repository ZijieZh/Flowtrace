use axum::extract::{Path as AxumPath, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::serve::error::{ApiFault, ApiResult};
use crate::serve::events::{SseEvent, SseEventBody};
use crate::serve::state::AppState;

#[derive(Serialize)]
pub struct ConfigView {
    pub primary_scope: PathBuf,
    pub extra_scopes: Vec<PathBuf>,
}

pub async fn get(State(state): State<AppState>) -> Json<ConfigView> {
    Json(ConfigView {
        primary_scope: state.user_scope_root.clone(),
        extra_scopes: state.lock_extras().clone(),
    })
}

#[derive(Deserialize)]
pub struct ScopeBody {
    pub path: PathBuf,
}

pub async fn add_scope(
    State(state): State<AppState>,
    Json(body): Json<ScopeBody>,
) -> ApiResult<Json<ConfigView>> {
    state
        .add_scope(&body.path)
        .map_err(|e| ApiFault::bad_request(e.to_string()))?;
    let id = state.next_event_id();
    let _ = state
        .broadcaster
        .send(SseEvent::new(id, SseEventBody::ScopeChanged));
    Ok(get(State(state)).await)
}

pub async fn remove_scope(
    State(state): State<AppState>,
    AxumPath(idx): AxumPath<usize>,
) -> ApiResult<Json<ConfigView>> {
    {
        let mut extras = state.lock_extras();
        if idx >= extras.len() {
            return Err(ApiFault::not_found(format!("scope index {}", idx)));
        }
        extras.remove(idx);
    }
    let id = state.next_event_id();
    let _ = state
        .broadcaster
        .send(SseEvent::new(id, SseEventBody::ScopeChanged));
    Ok(get(State(state)).await)
}
