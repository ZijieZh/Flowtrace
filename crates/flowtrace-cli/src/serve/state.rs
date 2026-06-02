use anyhow::{Context, Result};
use lru::LruCache;
use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Instant;
use tokio::sync::broadcast;

use super::events::SseEvent;
use super::scope::TraceRef;

#[derive(Clone)]
pub struct AppState {
    /// Canonicalized scope root. The watcher rejects events outside this tree.
    /// Without canonicalize, `path.strip_prefix(scope_root)` fails when notify
    /// emits absolute paths against a relative scope, and SSE classify
    /// degrades every event to `kind:"other"`.
    pub user_scope_root: PathBuf,
    /// Additional scope roots (canonicalized). Live-mutable; watcher
    /// re-evaluates per event rather than snapshotting at startup.
    pub extra_scopes: Arc<Mutex<Vec<PathBuf>>>,
    /// SSE broadcaster. Each connected client holds a Receiver.
    pub broadcaster: broadcast::Sender<SseEvent>,
    /// Persistent counter for SSE `id:` field — enables `last_event_id` replay.
    pub event_counter: Arc<std::sync::atomic::AtomicU64>,
    pub trace_cache: Arc<Mutex<Option<TraceCacheEntry>>>,
    /// run_id → (trace_id, trace_root). Populated on first lookup; entries
    /// are evicted when the scope changes or a trace is removed.
    pub run_index: Arc<Mutex<HashMap<String, (String, PathBuf)>>>,
    /// Cache of "what files are committed under runs/<run_id>/ at commit
    /// <sha>", keyed by (trace_root, sha, run_id). Result is immutable per
    /// commit, so we never re-walk a tree twice for the same SHA.
    pub committed_files_cache:
        Arc<Mutex<LruCache<(PathBuf, String, String), Arc<HashMap<String, Vec<String>>>>>>,
}

pub struct TraceCacheEntry {
    pub at: Instant,
    pub traces: Arc<Vec<TraceRef>>,
}

pub const TRACE_CACHE_TTL_MS: u128 = 250;

/// Acquire `extra_scopes` lock, recovering from a poisoned mutex.
/// Poisoning is harmless here: the protected `Vec<PathBuf>` is plain data
/// with no broken invariants when a holder panics.
fn lock_extras(m: &Mutex<Vec<PathBuf>>) -> MutexGuard<'_, Vec<PathBuf>> {
    m.lock().unwrap_or_else(|p| p.into_inner())
}

impl AppState {
    pub fn new(user_scope_root: &Path) -> Result<Self> {
        let user_scope_root = user_scope_root.canonicalize().with_context(|| {
            format!(
                "canonicalizing user scope root {}",
                user_scope_root.display()
            )
        })?;
        let (tx, _rx) = broadcast::channel::<SseEvent>(1024);
        Ok(Self {
            user_scope_root,
            extra_scopes: Arc::new(Mutex::new(vec![])),
            broadcaster: tx,
            event_counter: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            trace_cache: Arc::new(Mutex::new(None)),
            run_index: Arc::new(Mutex::new(HashMap::new())),
            committed_files_cache: Arc::new(Mutex::new(LruCache::new(
                NonZeroUsize::new(512).expect("512 != 0"),
            ))),
        })
    }

    /// Invalidate the trace cache. Call after any trace.json mutation or
    /// scope change so the next read picks up the new state immediately.
    /// Also drops the run_index — traces could have been added/removed.
    pub fn invalidate_trace_cache(&self) {
        if let Ok(mut guard) = self.trace_cache.lock() {
            *guard = None;
        }
        if let Ok(mut idx) = self.run_index.lock() {
            idx.clear();
        }
    }

    pub fn add_scope(&self, scope: &Path) -> Result<PathBuf> {
        let canon = scope
            .canonicalize()
            .with_context(|| format!("canonicalizing additional scope {}", scope.display()))?;
        let mut extras = lock_extras(&self.extra_scopes);
        if !extras.iter().any(|p| p == &canon) && canon != self.user_scope_root {
            extras.push(canon.clone());
            drop(extras);
            self.invalidate_trace_cache();
        }
        Ok(canon)
    }

    pub fn all_scopes(&self) -> Vec<PathBuf> {
        let mut scopes = vec![self.user_scope_root.clone()];
        scopes.extend(lock_extras(&self.extra_scopes).iter().cloned());
        scopes
    }

    pub fn lock_extras(&self) -> MutexGuard<'_, Vec<PathBuf>> {
        lock_extras(&self.extra_scopes)
    }

    /// Find the scope root that contains the given path (if any).
    pub fn scope_for(&self, path: &Path) -> Option<PathBuf> {
        for s in self.all_scopes() {
            if path.starts_with(&s) {
                return Some(s);
            }
        }
        None
    }

    pub fn next_event_id(&self) -> u64 {
        self.event_counter
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed)
            + 1
    }
}
