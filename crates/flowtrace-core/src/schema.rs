use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub type StepId = String;

/// The static plan for a trace. Lives at `<trace_root>/trace.json`.
///
/// A trace declares its steps (with DAG dependencies), assets each step
/// produces, and a final deliverable. Runs live alongside the trace at
/// `runs/<run_id>/` and inherit the same step ids.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Trace {
    /// Stable identifier (used as a slug; should be unique within a scope).
    pub id: String,
    /// Human-readable title.
    pub title: String,
    /// One-paragraph description of what the trace does.
    pub description: String,
    /// Semver-style version. Bumped when the trace schema changes.
    pub version: String,
    /// Steps in the DAG. Keyed by step id; the id is used verbatim with
    /// `trace step <id>` and as the folder name under `runs/<run_id>/`.
    pub steps: BTreeMap<StepId, StepSpec>,
    /// The final output of a run.
    pub deliverable: Deliverable,
    /// Optional execution-environment hints (which Python / R packages the trace expects).
    #[serde(default)]
    pub environment: Environment,
}

impl Trace {
    /// Smallest valid Trace: id + title + description, empty steps and
    /// deliverable, default environment. Used by `trace init` and the
    /// `POST /api/traces` HTTP create path.
    pub fn minimal(id: impl Into<String>, title: impl Into<String>, description: impl Into<String>) -> Self {
        Trace {
            id: id.into(),
            title: title.into(),
            description: description.into(),
            version: "0.1.0".into(),
            steps: BTreeMap::new(),
            deliverable: Deliverable {
                description: String::new(),
                assets: vec![],
            },
            environment: Environment::default(),
        }
    }
}

/// One step in the trace DAG.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct StepSpec {
    /// Display name shown in the UI.
    pub name: String,
    /// One-line description of what this step does (used as a hint to the executor).
    pub does: String,
    /// Free-form labels for inputs this step conceptually reads. Cosmetic — the
    /// trace contract is files, not logical variables (see PHILOSOPHY.md).
    /// Frontend StepCard renders these as tags.
    #[serde(default)]
    pub from_inputs: Vec<String>,
    /// IDs of upstream steps this step depends on (edges in the DAG).
    #[serde(default)]
    pub from_steps: Vec<StepId>,
    /// Step-relative filenames the step is expected to produce. Hint to executors;
    /// actual declared assets at runtime live in `RunState.steps[<id>].assets`.
    #[serde(default)]
    pub assets: Vec<String>,
    /// Pretty title for the asset group (e.g. "Symbolic Analysis").
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub asset_title: Option<String>,
    /// If true, the UI hides this step from new runs (kept for older runs to render).
    #[serde(default, skip_serializing_if = "is_false_step")]
    pub deprecated: bool,
}

fn is_false_step(b: &bool) -> bool {
    !*b
}

impl Trace {
    /// All steps DAG-downstream from `step_id` (transitive `from_steps`-dependents),
    /// returned in **topological order**: every step appears after the steps it
    /// depends on, so re-running them front-to-back is safe. Ties break
    /// alphabetically for deterministic output.
    pub fn downstream_of(&self, step_id: &str) -> Vec<StepId> {
        use std::collections::{BTreeMap, HashSet};
        // 1. Collect the descendant set (reverse reachability over `from_steps`).
        let mut set: HashSet<String> = HashSet::new();
        let mut stack: Vec<String> = vec![step_id.to_string()];
        while let Some(cur) = stack.pop() {
            for (s, step) in &self.steps {
                if step.from_steps.iter().any(|fs| fs == &cur) && set.insert(s.clone()) {
                    stack.push(s.clone());
                }
            }
        }
        // 2. Kahn topological sort over the induced subgraph. In-degree counts
        //    only `from_steps` that are themselves descendants; the BTreeMap key
        //    order makes the zero-in-degree pick alphabetical and deterministic.
        let mut indeg: BTreeMap<String, usize> = set
            .iter()
            .map(|s| {
                let d = self.steps[s]
                    .from_steps
                    .iter()
                    .filter(|fs| set.contains(fs.as_str()))
                    .count();
                (s.clone(), d)
            })
            .collect();
        let mut out: Vec<StepId> = vec![];
        while let Some(next) = indeg.iter().find(|(_, &d)| d == 0).map(|(k, _)| k.clone()) {
            indeg.remove(&next);
            for (s, step) in &self.steps {
                if indeg.contains_key(s) && step.from_steps.iter().any(|fs| fs == &next) {
                    if let Some(d) = indeg.get_mut(s) {
                        *d -= 1;
                    }
                }
            }
            out.push(next);
        }
        out
    }
}

#[cfg(test)]
mod fixture_tests {
    use super::*;
    use std::path::PathBuf;

    fn examples_dir() -> Option<PathBuf> {
        // crate dir → workspace root/scripts/examples
        let crate_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let ws_root = crate_dir.parent()?.parent()?;
        let dir = ws_root.join("scripts/examples");
        dir.is_dir().then_some(dir)
    }

    #[test]
    fn all_example_traces_round_trip() {
        let Some(dir) = examples_dir() else {
            eprintln!("examples dir not found; skipping");
            return;
        };
        for example in ["dream-analysis", "iris-analysis", "minimal", "nested-deps"] {
            let path = dir.join(example).join("template").join("trace.json");
            if !path.is_file() {
                continue;
            }
            let bytes = std::fs::read(&path).unwrap_or_else(|_| panic!("read {:?}", path));
            let r: Trace = serde_json::from_slice(&bytes)
                .unwrap_or_else(|e| panic!("parse {:?}: {}", path, e));
            let back = serde_json::to_string(&r).expect("serialize");
            let r2: Trace = serde_json::from_str(&back).expect("re-parse");
            assert_eq!(r.id, r2.id);
            assert_eq!(r.steps.len(), r2.steps.len());
        }
    }
}

/// The run's final-output contract.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Deliverable {
    /// One-paragraph description of what the run produces.
    pub description: String,
    /// Run-relative paths the deliverable is expected to include.
    #[serde(default)]
    pub assets: Vec<String>,
}

/// Optional execution-environment hints — which Python / R packages the trace
/// expects to be available. Not enforced; informational for executors.
#[derive(Debug, Clone, Default, Serialize, Deserialize, JsonSchema)]
pub struct Environment {
    /// Python packages the trace expects (e.g. `["pandas", "matplotlib"]`).
    #[serde(default)]
    pub python: Vec<String>,
    /// R packages the trace expects (e.g. `["ggplot2", "dplyr"]`).
    #[serde(default)]
    pub r: Vec<String>,
}
