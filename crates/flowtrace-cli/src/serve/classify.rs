use std::path::{Component, Path};

use super::events::SseEventBody;

/// Classify a filesystem event path into an SSE event body.
/// `scope_root` MUST be canonicalized (see AppState::new).
/// `path` MUST be the absolute path produced by notify.
pub fn classify(scope_root: &Path, path: &Path) -> SseEventBody {
    let rel = match path.strip_prefix(scope_root) {
        Ok(r) => r,
        Err(_) => {
            return SseEventBody::Other {
                path: path.display().to_string(),
            };
        }
    };
    let comps: Vec<&str> = rel
        .components()
        .filter_map(|c| match c {
            Component::Normal(s) => s.to_str(),
            _ => None,
        })
        .collect();
    if comps.is_empty() {
        return SseEventBody::Other {
            path: path.display().to_string(),
        };
    }
    // Layout under scope: <trace_id>/(trace.json | runs/<run>/...)
    let trace_id = comps[0].to_string();
    if comps.len() == 1 {
        return SseEventBody::Other {
            path: path.display().to_string(),
        };
    }
    match comps.as_slice() {
        [_, "trace.json"] => SseEventBody::TraceUpdated { trace_id },
        [_, "runs", run_id] => SseEventBody::RunCreated {
            trace_id,
            run_id: (*run_id).into(),
        },
        [_, "runs", run_id, "state.json"] => SseEventBody::RunUpdated {
            trace_id,
            run_id: (*run_id).into(),
        },
        [_, "runs", run_id, "replies", reply_file] => {
            // Skip writer tempfiles (`.tmp.<pid>.<nanos>.reply`) and any other
            // hidden / non-NNNN.json names. Otherwise a bad parse would emit
            // ReplyAppended{seq=0}, which the frontend dedupes — silently
            // dropping the real reply that follows.
            if reply_file.starts_with('.') {
                return SseEventBody::Other {
                    path: path.display().to_string(),
                };
            }
            let Some(stem) = reply_file.strip_suffix(".json") else {
                return SseEventBody::Other {
                    path: path.display().to_string(),
                };
            };
            let Ok(seq) = stem.parse::<u32>() else {
                eprintln!(
                    "[trace] warn: watcher saw non-numeric reply filename `{}` — \
                     ignoring; expected NNNN.json",
                    reply_file
                );
                return SseEventBody::Other {
                    path: path.display().to_string(),
                };
            };
            SseEventBody::ReplyAppended {
                trace_id,
                run_id: (*run_id).into(),
                seq,
            }
        }
        _ => {
            // Anything else inside the trace folder is treated as an asset change.
            // This includes step folders, working/, deliverable assets, etc.
            SseEventBody::AssetChanged {
                trace_id,
                path: rel.display().to_string(),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn classifies_trace_json() {
        let scope = PathBuf::from("/tmp/scope");
        let p = PathBuf::from("/tmp/scope/dream/trace.json");
        let e = classify(&scope, &p);
        assert!(matches!(
            e,
            SseEventBody::TraceUpdated { trace_id } if trace_id == "dream"
        ));
    }

    #[test]
    fn classifies_state_json() {
        let scope = PathBuf::from("/tmp/scope");
        let p = PathBuf::from("/tmp/scope/dream/runs/run_xyz/state.json");
        let e = classify(&scope, &p);
        assert!(matches!(
            e,
            SseEventBody::RunUpdated { trace_id, run_id }
                if trace_id == "dream" && run_id == "run_xyz"
        ));
    }

    #[test]
    fn classifies_reply_json() {
        let scope = PathBuf::from("/tmp/scope");
        let p = PathBuf::from("/tmp/scope/dream/runs/run_xyz/replies/0003.json");
        let e = classify(&scope, &p);
        assert!(matches!(
            e,
            SseEventBody::ReplyAppended { seq, .. } if seq == 3
        ));
    }

    #[test]
    fn classifies_run_dir() {
        let scope = PathBuf::from("/tmp/scope");
        let p = PathBuf::from("/tmp/scope/dream/runs/run_xyz");
        let e = classify(&scope, &p);
        assert!(matches!(
            e,
            SseEventBody::RunCreated { trace_id, run_id }
                if trace_id == "dream" && run_id == "run_xyz"
        ));
    }

    #[test]
    fn classifies_outside_scope() {
        let scope = PathBuf::from("/tmp/scope");
        let p = PathBuf::from("/elsewhere/foo");
        let e = classify(&scope, &p);
        assert!(matches!(e, SseEventBody::Other { .. }));
    }

    #[test]
    fn classifies_asset_under_step() {
        let scope = PathBuf::from("/tmp/scope");
        let p = PathBuf::from("/tmp/scope/dream/steps/clean/data.csv");
        let e = classify(&scope, &p);
        assert!(matches!(
            e,
            SseEventBody::AssetChanged { trace_id, .. } if trace_id == "dream"
        ));
    }
}
