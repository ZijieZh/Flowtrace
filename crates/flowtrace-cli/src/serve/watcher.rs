use anyhow::Result;
use lru::LruCache;
use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebouncedEvent};
use std::num::NonZeroUsize;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tokio::sync::mpsc;

use super::classify::classify;
use super::events::{SseEvent, SseEventBody};
use super::state::AppState;

/// Spawn the filesystem watcher. Watches the scope root and any extra scopes
/// added via `add_scope`. Coalesces events through a 200ms debouncer.
/// Each debounced event is classified and broadcast to all SSE clients.
pub fn spawn(state: AppState) -> Result<()> {
    let (tx, mut rx) = mpsc::unbounded_channel::<Vec<DebouncedEvent>>();
    let mut debouncer = new_debouncer(
        Duration::from_millis(200),
        None,
        move |res: notify_debouncer_full::DebounceEventResult| match res {
            Ok(events) => {
                let _ = tx.send(events);
            }
            Err(errs) => {
                for e in errs {
                    eprintln!("watcher error: {}", e);
                }
            }
        },
    )?;
    let initial_scopes = state.all_scopes();
    for scope in &initial_scopes {
        if let Err(e) = debouncer.watch(scope, RecursiveMode::Recursive) {
            eprintln!("watch {} failed: {}", scope.display(), e);
        }
    }

    // Park the debouncer in a thread so it stays alive for the process.
    std::thread::spawn(move || {
        let _keepalive = debouncer;
        std::thread::park();
    });

    let state_clone = state.clone();
    // WSL2 inotify is known to emit phantom modify events for files whose
    // content hasn't changed (kernel atime updates, mount-point quirks).
    // Suppress file events whose mtime hasn't moved since the last broadcast.
    // LRU-capped so the cache can't grow unbounded; eviction targets cold
    // entries, keeping the hot set warm (random eviction would let hot paths
    // fall out and reintroduce phantom-modify events).
    const MTIME_CACHE_CAP: usize = 8192;
    let mtime_cache: Mutex<LruCache<PathBuf, SystemTime>> =
        Mutex::new(LruCache::new(NonZeroUsize::new(MTIME_CACHE_CAP).unwrap()));
    tokio::spawn(async move {
        while let Some(events) = rx.recv().await {
            for ev in events {
                for path in ev.paths.iter() {
                    let scope = match state_clone.scope_for(path) {
                        Some(s) => s,
                        None => continue,
                    };
                    // Skip noise from VCS internals: every mutation route
                    // calls `git commit_all`, which writes many files under
                    // `.git/`. Broadcasting those triggers the frontend to
                    // invalidate `traceKeys.detail(...)` for the trace and
                    // refetch on its own writes — a feedback loop. Filter any
                    // path under a hidden (dot-prefixed) directory inside the
                    // scope.
                    if path
                        .strip_prefix(&scope)
                        .ok()
                        .is_some_and(|rel| {
                            rel.components().any(|c| matches!(
                                c,
                                std::path::Component::Normal(s) if s.to_string_lossy().starts_with('.')
                            ))
                        })
                    {
                        continue;
                    }

                    // For files, dedupe against last-seen mtime. For non-file
                    // events (directory create on RunCreated, file removal on
                    // TraceRemoved) skip the mtime check and let classify
                    // decide — `metadata()` fails for deleted paths.
                    if let Ok(m) = std::fs::metadata(path) {
                        if m.is_file() {
                            let mtime = match m.modified() {
                                Ok(t) => t,
                                Err(_) => continue,
                            };
                            let mut cache = mtime_cache.lock().unwrap();
                            if cache.get(path).copied() == Some(mtime) {
                                continue; // phantom — mtime unchanged
                            }
                            // LruCache::put evicts least-recently-used when at capacity.
                            cache.put(path.clone(), mtime);
                        }
                        // is_dir() → fall through; classify may emit RunCreated.
                    }
                    // metadata err → path was removed; classify still useful
                    // for `TraceRemoved` etc.

                    let body = classify(&scope, path);
                    if matches!(body, SseEventBody::Other { .. }) {
                        continue;
                    }
                    let id = state_clone.next_event_id();
                    let _ = state_clone.broadcaster.send(SseEvent::new(id, body));
                }
            }
        }
    });

    Ok(())
}

/// Spawn the SSE keepalive heartbeat (every 15s). Without this the
/// reverse-proxy may close the connection on idle.
pub fn spawn_heartbeat(state: AppState) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(15));
        // Skip the immediate first tick
        interval.tick().await;
        loop {
            interval.tick().await;
            let id = state.next_event_id();
            let _ = state.broadcaster.send(SseEvent::new(id, SseEventBody::Ping));
        }
    });
}
