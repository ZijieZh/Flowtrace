//! `trace debug-watch <path>` — print debounced fs events for empirical validation.
//!
//! Output format is one event per line, prefixed with HH:MM:SS.mmm timestamp,
//! followed by the debounced event kind and affected paths. Designed to be
//! grep-friendly so we can pipe through `tee` and inspect later.

use anyhow::{Context, Result};
use chrono::Utc;
use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebounceEventResult};
use std::path::Path;
use std::sync::mpsc;
use std::time::Duration;

pub fn run(path: &Path, debounce_ms: u64) -> Result<()> {
    let canonical = path
        .canonicalize()
        .with_context(|| format!("path does not exist: {}", path.display()))?;

    eprintln!(
        "[trace debug-watch] watching {} (debounce={}ms, recursive)",
        canonical.display(),
        debounce_ms
    );
    eprintln!("[trace debug-watch] Ctrl+C to stop\n");

    let (tx, rx) = mpsc::channel::<DebounceEventResult>();
    let mut debouncer = new_debouncer(Duration::from_millis(debounce_ms), None, tx)
        .context("creating notify-debouncer-full")?;
    debouncer
        .watch(&canonical, RecursiveMode::Recursive)
        .context("watching path")?;

    for res in rx {
        match res {
            Ok(events) => {
                let ts = Utc::now().format("%H:%M:%S%.3f");
                for ev in events {
                    let paths_str = ev
                        .paths
                        .iter()
                        .map(|p| {
                            p.strip_prefix(&canonical)
                                .map(|sp| sp.display().to_string())
                                .unwrap_or_else(|_| p.display().to_string())
                        })
                        .collect::<Vec<_>>()
                        .join(", ");
                    println!(
                        "[{ts}] {kind:?} paths=[{paths_str}]",
                        kind = ev.kind,
                    );
                }
            }
            Err(errs) => {
                let ts = Utc::now().format("%H:%M:%S%.3f");
                for e in errs {
                    eprintln!("[{ts}] !ERROR {e}");
                }
            }
        }
    }
    Ok(())
}
