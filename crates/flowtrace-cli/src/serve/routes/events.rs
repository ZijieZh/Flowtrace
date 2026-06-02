use axum::extract::State;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::IntoResponse;
use futures::stream::Stream;
use std::convert::Infallible;
use std::time::Duration;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;

use crate::serve::events::{SseEvent, SseEventBody};
use crate::serve::state::AppState;

pub async fn sse(State(state): State<AppState>) -> impl IntoResponse {
    let rx = state.broadcaster.subscribe();
    // Synthetic "ready" event so clients can confirm connection.
    let ready_id = state.next_event_id();
    let ready = SseEvent::new(ready_id, SseEventBody::Ping);

    let stream = BroadcastStream::new(rx).filter_map(|res| match res {
        Ok(ev) => Some(to_sse(&ev)),
        Err(_) => None, // lagged → silently drop; client will catch up via next event
    });

    let prefix = futures::stream::once(async move { to_sse(&ready) });
    let combined = prefix.chain(stream);

    Sse::new(map_infallible(combined))
        .keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
}

fn to_sse(ev: &SseEvent) -> Event {
    let body_json = serde_json::to_string(&ev.body).unwrap_or_else(|_| "{}".into());
    Event::default().id(ev.id.to_string()).data(body_json)
}

fn map_infallible<S>(s: S) -> impl Stream<Item = Result<Event, Infallible>>
where
    S: Stream<Item = Event>,
{
    s.map(Ok::<_, Infallible>)
}
