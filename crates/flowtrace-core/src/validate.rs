use crate::error::{TraceError, Result};
use crate::schema::Trace;
use regex::Regex;
use serde::Serialize;
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize)]
pub struct LintWarning {
    pub kind: LintKind,
    pub step_id: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LintKind {
    TodoInDoes,
    EmptyDescription,
    OrphanStep,
    DeprecatedReferenced,
    AssetMissing,
}

pub fn lint(r: &Trace) -> Vec<LintWarning> {
    let mut out = vec![];
    if r.description.trim().is_empty() {
        out.push(LintWarning {
            kind: LintKind::EmptyDescription,
            step_id: None,
            message: "trace description is empty".into(),
        });
    }
    let todo_re = todo_re();
    let mut step_referenced: std::collections::HashSet<&str> = std::collections::HashSet::new();
    for (step_id, step) in &r.steps {
        if step.does.trim().is_empty() {
            out.push(LintWarning {
                kind: LintKind::EmptyDescription,
                step_id: Some(step_id.clone()),
                message: format!("step `{}` has empty `does`", step_id),
            });
        } else if todo_re.is_match(&step.does) {
            out.push(LintWarning {
                kind: LintKind::TodoInDoes,
                step_id: Some(step_id.clone()),
                message: format!("step `{}` does contains TODO/FIXME/XXX", step_id),
            });
        }
        for fs in &step.from_steps {
            step_referenced.insert(fs.as_str());
            if let Some(target) = r.steps.get(fs) {
                if target.deprecated {
                    out.push(LintWarning {
                        kind: LintKind::DeprecatedReferenced,
                        step_id: Some(step_id.clone()),
                        message: format!(
                            "step `{}` depends on deprecated step `{}`",
                            step_id, fs
                        ),
                    });
                }
            }
        }
    }
    for (step_id, step) in &r.steps {
        // A terminal step that feeds the deliverable is not an orphan. Deliverable
        // assets are run-relative (`<step_id>/<file>`), so match that prefix as well
        // as a bare filename.
        let prefix = format!("{}/", step_id);
        let step_in_deliverable = r
            .deliverable
            .assets
            .iter()
            .any(|d| d.starts_with(&prefix) || step.assets.iter().any(|a| d == a));
        if !step_referenced.contains(step_id.as_str()) && !step_in_deliverable {
            out.push(LintWarning {
                kind: LintKind::OrphanStep,
                step_id: Some(step_id.clone()),
                message: format!(
                    "step `{}` is not referenced by any other step's from_steps",
                    step_id
                ),
            });
        }
    }
    out
}

fn ident_re() -> &'static Regex {
    static R: OnceLock<Regex> = OnceLock::new();
    R.get_or_init(|| Regex::new(r"^[a-z][a-z0-9_]{0,62}$").unwrap())
}

fn trace_id_re() -> &'static Regex {
    static R: OnceLock<Regex> = OnceLock::new();
    // Slug-shaped: starts with a letter, then [a-z0-9-], 1–63 chars total.
    // Conventionally equals the trace's folder name — one concept, not two.
    R.get_or_init(|| Regex::new(r"^[a-z][a-z0-9-]{0,62}$").unwrap())
}

fn todo_re() -> &'static Regex {
    static R: OnceLock<Regex> = OnceLock::new();
    R.get_or_init(|| Regex::new(r"(?i)\b(todo|fixme|xxx)\b").unwrap())
}

/// Slug-shape check for a candidate trace id. Same rule used by `validate`
/// for `Trace.id`, exposed standalone so callers (e.g. `trace init`) can
/// reject bad ids without constructing a full `Trace`.
pub fn validate_trace_id(id: &str) -> Result<()> {
    if !trace_id_re().is_match(id) {
        return Err(TraceError::Validation(format!(
            "id `{}` must be a slug: start with a letter, then [a-z0-9-], 1–63 chars total",
            id
        )));
    }
    Ok(())
}

pub fn validate(r: &Trace) -> Result<()> {
    validate_trace_id(&r.id)?;
    let ident = ident_re();
    for (k, step) in &r.steps {
        if !ident.is_match(k) {
            return Err(TraceError::Validation(format!(
                "step id `{}` invalid",
                k
            )));
        }
        for fs in &step.from_steps {
            if !r.steps.contains_key(fs) {
                return Err(TraceError::Validation(format!(
                    "step `{}` references unknown step `{}`",
                    k, fs
                )));
            }
        }
    }
    if has_cycle(r) {
        return Err(TraceError::Validation(
            "DAG cycle detected in from_steps".into(),
        ));
    }
    Ok(())
}

fn has_cycle(r: &Trace) -> bool {
    use std::collections::HashSet;
    fn dfs(
        node: &str,
        trace: &Trace,
        visited: &mut HashSet<String>,
        stack: &mut HashSet<String>,
    ) -> bool {
        if stack.contains(node) {
            return true;
        }
        if visited.contains(node) {
            return false;
        }
        visited.insert(node.to_string());
        stack.insert(node.to_string());
        if let Some(s) = trace.steps.get(node) {
            for dep in &s.from_steps {
                if dfs(dep, trace, visited, stack) {
                    return true;
                }
            }
        }
        stack.remove(node);
        false
    }
    let mut visited = HashSet::new();
    let mut stack = HashSet::new();
    for step_id in r.steps.keys() {
        if dfs(step_id, r, &mut visited, &mut stack) {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema::*;
    use std::collections::BTreeMap;

    fn step(name: &str, deps: &[&str]) -> StepSpec {
        StepSpec {
            name: name.into(),
            does: "test".into(),
            from_inputs: vec![],
            from_steps: deps.iter().map(|s| s.to_string()).collect(),
            assets: vec![],
            asset_title: None,
            deprecated: false,
        }
    }

    fn make_trace() -> Trace {
        Trace {
            id: "minimal".into(),
            title: "x".into(),
            description: "x".into(),
            version: "0.1.0".into(),
            steps: BTreeMap::new(),
            deliverable: Deliverable {
                description: "x".into(),
                assets: vec![],
            },
            environment: Environment::default(),
        }
    }

    #[test]
    fn validates_minimal() {
        let mut r = make_trace();
        r.steps.insert("a".into(), step("A", &[]));
        validate(&r).unwrap();
    }

    #[test]
    fn rejects_bad_id() {
        let mut r = make_trace();
        let too_long = "a".repeat(64);
        // Each of these violates the slug shape ([a-z][a-z0-9-]{0,62}).
        for bad in [
            "",                  // empty
            "1bogus",            // leading digit
            "Bogus",             // uppercase
            "bogus_id",          // underscore (only hyphens allowed)
            "bogus id",          // space
            too_long.as_str(),   // too long
        ] {
            r.id = bad.into();
            assert!(validate(&r).is_err(), "expected invalid: {:?}", bad);
        }
        // Sanity: a real slug passes.
        r.id = "minimal".into();
        validate(&r).unwrap();
    }

    #[test]
    fn rejects_unknown_dep() {
        let mut r = make_trace();
        r.steps.insert("a".into(), step("A", &["ghost"]));
        assert!(validate(&r).is_err());
    }

    #[test]
    fn rejects_cycle() {
        let mut r = make_trace();
        r.steps.insert("a".into(), step("A", &["b"]));
        r.steps.insert("b".into(), step("B", &["a"]));
        assert!(validate(&r).is_err());
    }

    #[test]
    fn lint_finds_todo() {
        let mut r = make_trace();
        let mut s = step("A", &[]);
        s.does = "TODO: write".into();
        r.steps.insert("a".into(), s);
        let warnings = lint(&r);
        assert!(warnings.iter().any(|w| w.kind == LintKind::TodoInDoes));
    }

    #[test]
    fn terminal_step_feeding_deliverable_is_not_orphan() {
        let mut r = make_trace();
        // `sink` is a terminal step whose asset IS the deliverable. Deliverable
        // assets are run-relative (`<step_id>/<file>`), so it must not lint as orphan.
        let mut sink = step("Sink", &[]);
        sink.assets = vec!["out.md".into()];
        r.steps.insert("sink".into(), sink);
        // `dangling` is terminal and contributes nothing to the deliverable.
        let mut dangling = step("Dangling", &[]);
        dangling.assets = vec!["x.md".into()];
        r.steps.insert("dangling".into(), dangling);
        r.deliverable.assets = vec!["sink/out.md".into()];

        let warnings = lint(&r);
        let orphans: Vec<&str> = warnings
            .iter()
            .filter(|w| w.kind == LintKind::OrphanStep)
            .filter_map(|w| w.step_id.as_deref())
            .collect();
        assert!(!orphans.contains(&"sink"), "sink feeds the deliverable; not an orphan");
        assert!(orphans.contains(&"dangling"), "dangling contributes nothing; should be orphan");
    }

    #[test]
    fn downstream_walks_dag() {
        let mut r = make_trace();
        r.steps.insert("a".into(), step("A", &[]));
        r.steps.insert("b".into(), step("B", &["a"]));
        r.steps.insert("c".into(), step("C", &["b"]));
        r.steps.insert("d".into(), step("D", &[]));
        // a → b → c; d is unrelated. Topological order is exactly [b, c].
        assert_eq!(r.downstream_of("a"), vec!["b", "c"]);
    }

    #[test]
    fn downstream_is_topologically_ordered() {
        // root → synth → format. Alphabetical order would emit `format` before
        // `synth`, but `format` depends on `synth`, so re-running in that order
        // would feed `format` stale input. The result must be topological.
        let mut r = make_trace();
        r.steps.insert("root".into(), step("Root", &[]));
        r.steps.insert("synth".into(), step("Synth", &["root"]));
        r.steps.insert("format".into(), step("Format", &["synth"]));
        assert_eq!(
            r.downstream_of("root"),
            vec!["synth", "format"],
            "must be topological, not alphabetical"
        );
    }
}
