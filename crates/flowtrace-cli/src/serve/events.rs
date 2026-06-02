use serde::{Deserialize, Serialize};

/// Event kind broadcasted to all SSE clients. Frontend uses this to
/// invalidate TanStack Query cache for the affected trace / run.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SseEventBody {
    /// A `trace.json` was created or moved into a scope.
    TraceCreated { trace_id: String },
    /// A `trace.json` was modified.
    TraceUpdated { trace_id: String },
    /// A `trace.json` was removed (or its folder moved out of scope).
    TraceRemoved { trace_id: String },
    /// A new `runs/<id>/` directory appeared.
    RunCreated {
        trace_id: String,
        run_id: String,
    },
    /// `runs/<id>/state.json` was rewritten.
    RunUpdated {
        trace_id: String,
        run_id: String,
    },
    /// A new `runs/<id>/replies/NNNN.json` was appended.
    ReplyAppended {
        trace_id: String,
        run_id: String,
        seq: u32,
    },
    /// An asset under a step's working dir or trace folder changed.
    AssetChanged {
        trace_id: String,
        path: String,
    },
    /// A scope was added or removed via `/api/config/scope`.
    ScopeChanged,
    /// Catch-all for events inside scope but not recognized.
    Other { path: String },
    /// Heartbeat keepalive (every 15s).
    Ping,
}

#[derive(Debug, Clone, Serialize)]
pub struct SseEvent {
    pub id: u64,
    #[serde(flatten)]
    pub body: SseEventBody,
}

impl SseEvent {
    pub fn new(id: u64, body: SseEventBody) -> Self {
        Self { id, body }
    }
}

pub fn broadcast(state: &crate::serve::state::AppState, body: SseEventBody) {
    let id = state.next_event_id();
    let _ = state.broadcaster.send(SseEvent::new(id, body));
}
