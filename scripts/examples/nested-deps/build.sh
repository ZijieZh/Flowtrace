#!/usr/bin/env bash
# nested-deps — research-synthesis pipeline. The trajectory exercises:
#   • multi-step DAG with branched dependencies
#   • blocked → resume on a scope-decision step
#   • error → retry on a flaky render step
#   • rerun producing a second commit on the same path
# Replies are rich on purpose — multiple evidence types, support/findings/
# citations/checks/appendices — so every node has something to show in the UI.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"

FIX="$HERE/fixtures"
if [[ ! -f "$FIX/citation_network.png" ]]; then
  RSCRIPT="${RSCRIPT:-Rscript}"
  if command -v "$RSCRIPT" >/dev/null 2>&1; then
    "$RSCRIPT" "$FIX/generate.R" >/dev/null
  else
    echo "warn: $RSCRIPT not found — fixtures missing" >&2
  fi
fi

# ── Authoring: scaffold the trace step-by-step ──────────────────────────
init_empty
scaffold_deliverable
author_step gather_sources
author_step extract_facts
author_step extract_quotes
author_step synthesize
author_step format_report

# ── Orientation: exercise read-side CLI surfaces ──────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt dot     >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ─────────────────────────────────────────────────────────
RUN=$(cli run new --name "research synthesis (untitled)" | tail -1)
cli run list >/dev/null
cli run show --run "$RUN" >/dev/null
place() { mkdir -p "runs/$RUN/$1"; cp "$FIX/$2" "runs/$RUN/$1/$2"; }

# ── gather_sources — partial → complete ──────────────────────────────────
cli step gather_sources running --message "searching philosophy databases" >/dev/null
place gather_sources sources.json
cli reply <<EOF >/dev/null
{
  "headline": "12 sources gathered (interim)",
  "status": "partial",
  "note": "first pass — 12 found; deeper sweep still pending",
  "support": ["philosophy: 8", "epistemology: 3", "metaphysics: 1"],
  "findings": [
    { "title": "philosophy axis",  "detail": "anchored by Kuhn / Polanyi / Popper" },
    { "title": "epistemology",     "detail": "3 sources, mostly Quine-adjacent" },
    { "title": "metaphysics",      "detail": "single source so far — under-covered" }
  ],
  "evidence": [
    { "type": "document", "path": "gather_sources/sources.json", "title": "source list (partial)" },
    { "type": "check",    "label": "min 10 sources",  "passed": true,  "expected": ">=10",  "actual": 12 },
    { "type": "check",    "label": "metaphysics coverage", "passed": false, "expected": ">=3", "actual": 1 }
  ],
  "checkpoint": { "step_id": "gather_sources" }
}
EOF
place gather_sources source_domain_breakdown.png
cli step gather_sources done --asset sources.json --asset source_domain_breakdown.png --message "12 sources, 4 domains" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "sources gathered",
  "status": "complete",
  "support": [
    "12 sources across 4 domains",
    "Kuhn, Polanyi, Popper anchor the philosophy axis",
    "metaphysics under-covered but acknowledged"
  ],
  "findings": [
    { "title": "three converging arcs", "detail": "paradigms (Kuhn) → tacit knowing (Polanyi) → falsifiability (Popper)" },
    { "title": "scope sufficient",       "detail": "enough breadth to synthesize without overloading the report" }
  ],
  "evidence": [
    { "type": "figure",   "path": "gather_sources/source_domain_breakdown.png", "caption": "source counts by domain" },
    { "type": "citation", "id": "kuhn1962",    "title": "The Structure of Scientific Revolutions", "authors": "Thomas Kuhn",   "year": 1962 },
    { "type": "citation", "id": "polanyi1966", "title": "The Tacit Dimension",                      "authors": "Michael Polanyi","year": 1966 },
    { "type": "citation", "id": "popper1934",  "title": "The Logic of Scientific Discovery",        "authors": "Karl Popper",   "year": 1934 },
    { "type": "check",    "label": "min 10 sources",      "passed": true, "expected": ">=10", "actual": 12 },
    { "type": "check",    "label": "all sources cited",   "passed": true, "expected": 12,     "actual": 12 }
  ],
  "takeaway": "three converging arcs visible already",
  "checkpoint": { "step_id": "gather_sources" }
}
EOF

# ── Run-level events ──────────────────────────────────────────────────────
cli run rename "Philosophy of science — synthesis demo" --run "$RUN" >/dev/null
cli run pause  --run "$RUN" >/dev/null
cli run resume --run "$RUN" >/dev/null

# ── extract_facts ─────────────────────────────────────────────────────────
cli step extract_facts running --message "pulling factual claims" >/dev/null
place extract_facts facts.json
cli step extract_facts done --asset facts.json --message "7 facts extracted" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "7 factual claims extracted",
  "status": "complete",
  "support": [
    "all attributed to source + page",
    "no overlapping claims across the 3 anchor authors"
  ],
  "findings": [
    { "title": "paradigm shifts", "detail": "non-cumulative (Kuhn)" },
    { "title": "tacit knowing",   "detail": "precedes explicit (Polanyi)" },
    { "title": "falsifiability",  "detail": "demarcation criterion (Popper)" },
    { "title": "underdetermination", "detail": "Quine — theory choice always under-constrained by evidence" }
  ],
  "evidence": [
    { "type": "document", "path": "extract_facts/facts.json", "title": "facts" },
    { "type": "check",    "label": "all attributed",         "passed": true, "expected": 7, "actual": 7 },
    { "type": "check",    "label": "no duplicate claims",    "passed": true, "expected": "0",  "actual": "0" }
  ],
  "checkpoint": { "step_id": "extract_facts" }
}
EOF

# ── extract_quotes ────────────────────────────────────────────────────────
cli step extract_quotes running --message "pulling supporting quotes" >/dev/null
place extract_quotes quotes.json
cli step extract_quotes done --asset quotes.json --message "5 quotes extracted" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "5 supporting quotes",
  "status": "complete",
  "support": ["each anchored to a source with page number"],
  "evidence": [
    { "type": "document", "path": "extract_quotes/quotes.json", "title": "quotes" },
    { "type": "check",    "label": "all sourced",     "passed": true, "actual": "5/5" },
    { "type": "check",    "label": "page numbers present", "passed": true, "actual": "5/5" }
  ],
  "takeaway": "ready to feed into the synthesis step",
  "checkpoint": { "step_id": "extract_quotes" }
}
EOF

# ── synthesize — running → blocked → resume → done → rerun ───────────────
cli step synthesize running --message "drafting thesis" >/dev/null
place synthesize synthesis.md
cli step synthesize blocked --message "reviewer flagged scope: include Lakatos?" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "reviewer pushback on scope",
  "status": "blocked",
  "note": "draft is solid but stops short of post-Kuhn (Lakatos / Feyerabend)",
  "suggestions": [
    "expand to include Lakatos's research-programmes framing",
    "keep current scope but add an explicit scope caveat",
    "narrow further to Kuhn-Polanyi pair (publishable as a standalone note)"
  ],
  "support": [
    "current draft cites 3 anchor authors",
    "Lakatos would broaden the synthesis without adding clear thesis"
  ],
  "evidence": [
    { "type": "document", "path": "synthesize/synthesis.md", "title": "synthesis draft (blocked)" },
    { "type": "check",    "label": "thesis is single-sentence", "passed": true, "actual": "yes" },
    { "type": "check",    "label": "all anchor authors cited", "passed": true, "expected": 3, "actual": 3 }
  ],
  "checkpoint": { "step_id": "synthesize" }
}
EOF
cli step synthesize running --message "scope decision: keep + add caveat" >/dev/null
cli step synthesize done --asset synthesis.md --message "synthesis draft v1" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "draft v1",
  "status": "complete",
  "support": [
    "thesis: knowledge is personal and fallible",
    "3 converging arcs from the 3 anchor authors",
    "one acknowledged blind spot (Lakatos) documented inline"
  ],
  "findings": [
    { "title": "core claim",     "detail": "no neutral observation language — every fact is theory-laden" },
    { "title": "secondary claim","detail": "tacit knowing is the substrate of explicit knowledge" },
    { "title": "scope caveat",   "detail": "Lakatos / Feyerabend deliberately deferred to a follow-up paper" }
  ],
  "evidence": [
    { "type": "document", "path": "synthesize/synthesis.md", "title": "synthesis v1" },
    { "type": "appendix", "title": "reviewer note",
      "markdown": "## Scope caveat\n\nLakatos and his successors deliberately omitted; would broaden the paper into a separate piece." },
    { "type": "check",    "label": "scope caveat present", "passed": true, "actual": "yes" }
  ],
  "checkpoint": { "step_id": "synthesize" }
}
EOF

# Re-run: same path, new bytes (editorial pass)
cli step synthesize running --message "incorporating editorial pass" >/dev/null
{
  cat "$FIX/synthesis.md"
  echo ""
  echo "## v2 addendum"
  echo "Strengthened the holism claim with explicit reference to Quine's web of belief."
} > "runs/$RUN/synthesize/synthesis.md"
cli step synthesize done --asset synthesis.md --message "synthesis v2" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "draft v2",
  "status": "complete",
  "note": "same path, new bytes — RunHistoryModal will show two commits",
  "support": [
    "addressed the holism claim with Quine",
    "kept the scope caveat (no Lakatos)"
  ],
  "evidence": [
    { "type": "comparison", "title": "v1 → v2",
      "left":  { "label": "v1",         "path": "synthesize/synthesis.md" },
      "right": { "label": "v2 (HEAD)",  "path": "synthesize/synthesis.md" } },
    { "type": "citation", "id": "quine1951", "title": "Two Dogmas of Empiricism", "authors": "W. V. Quine", "year": 1951 },
    { "type": "check",    "label": "asset path unchanged",  "passed": true, "expected": "synthesize/synthesis.md", "actual": "synthesize/synthesis.md" }
  ],
  "checkpoint": { "step_id": "synthesize" }
}
EOF

# ── format_report — error → retry → done ─────────────────────────────────
cli step format_report running --message "rendering HTML+md" >/dev/null
cli step format_report error   --message "pandoc binary not found" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "render failed",
  "status": "error",
  "note": "transient: pandoc missing on host",
  "support": ["the markdown source is intact; only the HTML render failed"],
  "suggestions": [
    "install pandoc and retry",
    "skip HTML, ship markdown only",
    "retry on a different host"
  ],
  "evidence": [
    { "type": "check", "label": "pandoc on PATH",   "passed": false, "expected": "/usr/bin/pandoc", "actual": "not found" },
    { "type": "check", "label": "synthesis.md exists","passed": true,  "expected": "yes", "actual": "yes" }
  ],
  "checkpoint": { "step_id": "format_report" }
}
EOF
cli step format_report running --message "retry with PATH fixed" >/dev/null
place format_report report.html
place format_report report.md
place format_report citation_network.png
cli step format_report done \
  --asset report.html --asset report.md --asset citation_network.png \
  --message "report compiled on retry" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "report shipped",
  "status": "complete",
  "support": [
    "retry succeeded after PATH fix",
    "citation network rendered without orphan nodes"
  ],
  "evidence": [
    { "type": "document", "path": "format_report/report.md",          "title": "report (markdown)" },
    { "type": "document", "path": "format_report/report.html",        "title": "report (HTML)" },
    { "type": "figure",   "path": "format_report/citation_network.png","caption": "facts → concepts (citation map)" },
    { "type": "check",    "label": "no orphan citations",   "passed": true, "expected": "0", "actual": "0" },
    { "type": "check",    "label": "all anchor authors in graph", "passed": true, "expected": 3, "actual": 3 }
  ],
  "suggestions": ["share with reviewer", "cite in upcoming proposal"],
  "checkpoint": { "step_id": "format_report" }
}
EOF

# ── Deliverable ───────────────────────────────────────────────────────────
cli deliverable running --message "wrapping" >/dev/null
cli deliverable done \
  --asset "format_report/report.md" \
  --asset "format_report/report.html" \
  --asset "format_report/citation_network.png" \
  --message "research synthesis delivered" >/dev/null

# ── Summary ───────────────────────────────────────────────────────────────
echo
echo "=== summary ==="
python3 -c "
import json, os
s = json.load(open('runs/$RUN/state.json'))
for sid, body in s['steps'].items():
    print(f'  {sid:20s} {body[\"status\"][\"kind\"]:8s} {len(body[\"assets\"])} asset(s)')
print(f'  {\"deliverable\":20s} {s[\"deliverable\"][\"status\"][\"kind\"]:8s} {len(s[\"deliverable\"][\"assets\"])} asset(s)')
print(f'  replies: {len(os.listdir(f\"runs/$RUN/replies\"))}')
"
echo "git commits: $(git log --oneline | wc -l)"
