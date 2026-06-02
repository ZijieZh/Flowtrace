//! Structured-output payload — the typed shape an executor emits via
//! `trace reply < payload.json`.
//!
//! The whole payload is one [`StructuredOutput`]. The `checkpoint.step_id`
//! field (if present) names the step this reply is "about"; replies without a
//! checkpoint are run-level. Every `evidence[].path` is validated against the
//! run folder at write time.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// One reply payload. The agent emits this via stdin: `trace reply < payload.json`.
///
/// The minimum valid payload is `{ "headline": "…", "status": "complete" }`.
/// Everything else is optional but encouraged — richer replies give the UI
/// more to render and the user more to inspect.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct StructuredOutput {
    /// One-line summary the UI prints prominently. Always required.
    pub headline: String,
    /// Reply status: `partial` (interim), `complete` (done), `blocked` (waiting),
    /// or `error` (failed). The values are conventions; the UI accepts any
    /// string, but stick to these four for consistent rendering.
    pub status: ReplyStatus,
    /// Pins this reply to a specific step. Omit for a run-level reply.
    /// `step_id` MUST match a key in `trace.steps`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub checkpoint: Option<Checkpoint>,
    /// Bullet points supporting the headline.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub support: Vec<String>,
    /// Structured findings (`{ title, detail }` pairs) — used for breakdown-style insight.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub findings: Vec<Finding>,
    /// Next-action suggestions for the user.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub suggestions: Vec<String>,
    /// Typed evidence blocks (figures, documents, tables, checks, …) that
    /// substantiate the reply. Every `path` field here is validated to exist
    /// on disk before the reply commit lands.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub evidence: Vec<Evidence>,
    /// Caveat or disclaimer (rendered as a callout).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    /// One-paragraph conclusion (rendered in the takeaway slot).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub takeaway: Option<String>,
}

/// Reply status. The UI maps these to status chips; agents should stick to the
/// four conventional values. `Complete` is first so it serves as the default
/// in generated examples (most replies are complete, not partial).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReplyStatus {
    /// Final result for this turn.
    Complete,
    /// Interim result — the step is still running and the agent will emit more.
    Partial,
    /// Agent is waiting on a human decision.
    Blocked,
    /// Something failed and the reply describes what.
    Error,
}

/// Pins a reply to a step. The CLI reads `step_id` to associate the reply
/// with the right node; the UI uses `step_name` (if present) for the chip
/// label, falling back to looking the name up in `trace.json`.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Checkpoint {
    /// Step id (must match a key in `trace.steps`).
    pub step_id: String,
    /// Display name for the step (optional; convenience for the UI).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub step_name: Option<String>,
}

/// One finding inside `findings[]` — a structured `{ title, detail }` bullet.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Finding {
    /// Short label (rendered as the bullet header).
    pub title: String,
    /// One-sentence detail.
    pub detail: String,
}

/// Typed evidence block. The `type` discriminator selects the variant; only
/// the fields documented for that variant are read. Every variant that
/// carries a `path` (or `source_file`, or `left/right.path`) is path-validated
/// at write time: the file must exist in the run folder before the reply commits.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Evidence {
    /// An image or rendered figure the agent produced.
    Figure {
        /// Run-relative POSIX path to the image. Must exist on disk.
        path: String,
        /// One-line caption.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        caption: Option<String>,
    },
    /// A document the agent produced (markdown, PDF, JSON, …).
    Document {
        /// Run-relative POSIX path to the document. Must exist on disk.
        path: String,
        /// Display title.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        title: Option<String>,
    },
    /// An inline tabular result. Optionally points at the source file the table was rendered from.
    Table {
        /// Display title for the table.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        title: Option<String>,
        /// Column headers.
        columns: Vec<String>,
        /// Row data (each row is an array of stringly-typed cells, same length as `columns`).
        rows: Vec<Vec<String>>,
        /// Run-relative POSIX path to the source CSV/JSON/etc., if any. Must exist if set.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        source_file: Option<String>,
    },
    /// Two assets compared side-by-side (e.g. v1 vs v2 of an artifact).
    Comparison {
        /// Display title for the comparison.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        title: Option<String>,
        /// The "before" side.
        left: ComparisonSide,
        /// The "after" side.
        right: ComparisonSide,
    },
    /// A check result — a single assertion against expected behavior.
    Check {
        /// What was checked (e.g. "row count").
        label: String,
        /// Whether the check passed.
        passed: bool,
        /// Expected value (free-form JSON: number, string, boolean, …).
        #[serde(default, skip_serializing_if = "Option::is_none")]
        expected: Option<serde_json::Value>,
        /// Actual observed value (same free-form domain).
        #[serde(default, skip_serializing_if = "Option::is_none")]
        actual: Option<serde_json::Value>,
    },
    /// A bibliographic citation.
    Citation {
        /// Citation key (e.g. `kuhn1962`).
        id: String,
        /// Title of the cited work.
        title: String,
        /// Author(s) (free-form string).
        #[serde(default, skip_serializing_if = "Option::is_none")]
        authors: Option<String>,
        /// Year of publication.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        year: Option<i32>,
        /// URL for the citation.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        url: Option<String>,
    },
    /// Long-form markdown content rendered as a collapsible appendix.
    Appendix {
        /// Section title.
        title: String,
        /// Markdown body.
        markdown: String,
    },
}

/// One side of a `comparison` evidence block.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ComparisonSide {
    /// Display label for this side (e.g. "v1 warm").
    pub label: String,
    /// Run-relative POSIX path to the asset on this side. Must exist on disk.
    pub path: String,
}

impl StructuredOutput {
    /// Collect every run-relative path cited by `evidence[]`, deduped, in order.
    /// Walks `figure.path`, `document.path`, `table.source_file`,
    /// `comparison.left.path`, `comparison.right.path`.
    pub fn evidence_paths(&self) -> Vec<String> {
        let mut out: Vec<String> = Vec::new();
        let mut push = |p: &str| {
            if !p.is_empty() && !out.iter().any(|q| q == p) {
                out.push(p.to_string());
            }
        };
        for ev in &self.evidence {
            match ev {
                Evidence::Figure { path, .. } => push(path),
                Evidence::Document { path, .. } => push(path),
                Evidence::Table { source_file: Some(p), .. } => push(p),
                Evidence::Comparison { left, right, .. } => {
                    push(&left.path);
                    push(&right.path);
                }
                _ => {}
            }
        }
        out
    }

    /// The step id this reply is pinned to, if any.
    pub fn step_id(&self) -> Option<&str> {
        self.checkpoint.as_ref().map(|c| c.step_id.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn minimal_payload_parses() {
        let s = r#"{"headline":"x","status":"complete"}"#;
        let p: StructuredOutput = serde_json::from_str(s).unwrap();
        assert_eq!(p.headline, "x");
        assert_eq!(p.status, ReplyStatus::Complete);
        assert!(p.evidence_paths().is_empty());
        assert_eq!(p.step_id(), None);
    }

    #[test]
    fn evidence_paths_collects_all_path_carrying_variants() {
        let s = r##"{
            "headline":"x","status":"complete",
            "evidence":[
                {"type":"figure","path":"foo/a.png"},
                {"type":"document","path":"foo/b.md"},
                {"type":"table","columns":["c"],"rows":[["v"]],"source_file":"foo/c.csv"},
                {"type":"comparison","left":{"label":"v1","path":"foo/d.png"},"right":{"label":"v2","path":"foo/e.png"}},
                {"type":"check","label":"k","passed":true},
                {"type":"citation","id":"k","title":"t"},
                {"type":"appendix","title":"a","markdown":"# x"}
            ]
        }"##;
        let p: StructuredOutput = serde_json::from_str(s).unwrap();
        assert_eq!(
            p.evidence_paths(),
            vec!["foo/a.png", "foo/b.md", "foo/c.csv", "foo/d.png", "foo/e.png"]
        );
    }

    #[test]
    fn checkpoint_extracts_step_id() {
        let s = r#"{"headline":"x","status":"complete","checkpoint":{"step_id":"foo"}}"#;
        let p: StructuredOutput = serde_json::from_str(s).unwrap();
        assert_eq!(p.step_id(), Some("foo"));
    }

    #[test]
    fn extra_fields_are_tolerated() {
        // Forward-compat: agents emitting fields we don't know about must not error.
        let s = r#"{"headline":"x","status":"complete","_meta":{"any":1}}"#;
        let p: StructuredOutput = serde_json::from_str(s).unwrap();
        assert_eq!(p.headline, "x");
    }
}
