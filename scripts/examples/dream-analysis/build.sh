#!/usr/bin/env bash
# Dream-analysis demo — comprehensive trajectory + rich replies.
#
# Shape: an agent picks up the trace, orients itself via the CLI's read-side
# surfaces, then walks the five steps end-to-end. The trajectory exercises:
#   • partial → complete replies on a running step
#   • blocked → resume on a step that needs human review
#   • error → retry on a flaky step
#   • re-runs that produce a new version of the same asset (time-travel)
#   • deliverable assembly
# Every reply is a rich structured-output payload (multiple evidence types,
# support/findings/suggestions/citations/appendix) so the UI has something
# to show across the whole shape.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"

FIX="$HERE/fixtures"
if [[ ! -f "$FIX/jung-shadow-anima.png" ]]; then
  RSCRIPT="${RSCRIPT:-Rscript}"
  if command -v "$RSCRIPT" >/dev/null 2>&1; then
    "$RSCRIPT" "$FIX/generate.R" >/dev/null
  else
    echo "warn: $RSCRIPT not found — fixtures missing; check fixtures/generate.R" >&2
  fi
fi

# ── Authoring: scaffold the trace step-by-step ──────────────────────────
init_empty
scaffold_deliverable
author_step gather_context
author_step analyze_dream
author_step analyze_patterns
author_step generate_dream_image
author_step generate_report

# ── Orientation: exercise read-side CLI surfaces ──────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt dot     >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ─────────────────────────────────────────────────────────
RUN=$(cli run new --name "dream (untitled)" | tail -1)
cli run list >/dev/null
cli run show --run "$RUN" >/dev/null
place() { mkdir -p "runs/$RUN/$1"; cp "$FIX/$2" "runs/$RUN/$1/$3"; }

# ── Step 1: gather_context — figure-less, citation-heavy reply ────────────
cli step gather_context running --message "reading 14 prior journals" >/dev/null
place gather_context notes.md notes.md
cli step gather_context done --asset notes.md --message "context complete" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "14 prior dreams collected",
  "status": "complete",
  "support": [
    "sleep: 6h avg, fragmented",
    "anxiety self-rating: 4/10",
    "recent stressor: job change 18 days ago",
    "no medication / substance interference reported"
  ],
  "findings": [
    { "title": "sleep schedule",     "detail": "6h avg, 2–3 wakes/night — known REM-fragmentation pattern" },
    { "title": "recurring symbols",  "detail": "water + falling in 3 of last 5 entries" },
    { "title": "recent stressor",    "detail": "job change 18 days ago; correlates with onset of new motifs" },
    { "title": "emotional baseline", "detail": "anxiety self-rating drifted from 2 → 4 over the period" }
  ],
  "suggestions": ["proceed to symbolic analysis with Jung + Freud as primary frameworks"],
  "evidence": [
    { "type": "document",  "path": "gather_context/notes.md", "title": "context notes" },
    { "type": "citation",  "id": "freud1900",  "title": "The Interpretation of Dreams", "authors": "Sigmund Freud", "year": 1900 },
    { "type": "citation",  "id": "jung1964",   "title": "Man and His Symbols",          "authors": "Carl Jung",      "year": 1964 },
    { "type": "citation",  "id": "hobson1977", "title": "The brain as a dream-state generator", "authors": "J. Allan Hobson, Robert McCarley", "year": 1977 },
    { "type": "check",     "label": "journal entries present", "passed": true, "expected": 14, "actual": 14 },
    { "type": "check",     "label": "complete metadata",       "passed": true, "expected": "date+mood+symbols on each", "actual": "14/14" }
  ],
  "takeaway": "sufficient context for symbolic analysis",
  "checkpoint": { "step_id": "gather_context" }
}
EOF

# ── Run-level events (rename + pause + resume) ────────────────────────────
cli run rename "Goethe dream — full lifecycle" --run "$RUN" >/dev/null
cli run pause  --run "$RUN" >/dev/null
cli run resume --run "$RUN" >/dev/null

# ── Step 2: analyze_dream — partial → complete, multi-asset ───────────────
cli step analyze_dream running --message "triangulating frameworks" >/dev/null
place analyze_dream jung-shadow-anima.png jung-shadow-anima.png
place analyze_dream freud-displacement.png freud-displacement.png
cli reply <<EOF >/dev/null
{
  "headline": "interim: 2 of 3 frameworks",
  "status": "partial",
  "takeaway": "Jung + Freud converge; Adler check pending",
  "note": "interim reply — UI should show running spinner until the next done",
  "support": [
    "shadow ↔ anima polarity surfaces in 4 of 5 recent entries",
    "displacement chain from waking stressor to dream symbol is traceable",
    "Adler's life-task framing not yet evaluated"
  ],
  "evidence": [
    { "type": "figure", "path": "analyze_dream/jung-shadow-anima.png", "caption": "Jungian polarity" },
    { "type": "check",  "label": "Jungian fit",  "passed": true,  "expected": ">= moderate", "actual": "strong" },
    { "type": "check",  "label": "Freudian fit", "passed": true,  "expected": ">= moderate", "actual": "moderate" },
    { "type": "check",  "label": "Adlerian fit", "passed": false, "expected": "evaluated",   "actual": "pending" }
  ],
  "checkpoint": { "step_id": "analyze_dream" }
}
EOF
cli step analyze_dream done \
  --asset jung-shadow-anima.png --asset freud-displacement.png \
  --message "convergent reading across frameworks" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "three-framework synthesis",
  "status": "complete",
  "support": [
    "water → unconscious flux (Jung)",
    "falling → loss of control (Freud)",
    "transformation → individuation arc (Jung)"
  ],
  "findings": [
    { "title": "dominant motif",   "detail": "water — present across all three frameworks' readings" },
    { "title": "Jungian arc",      "detail": "shadow-anima polarity → integration tension" },
    { "title": "Freudian arc",     "detail": "manifest content displaces waking job anxiety" },
    { "title": "Adlerian frame",   "detail": "weak fit — recommend de-prioritizing in synthesis" }
  ],
  "suggestions": [
    "render imagery from the dominant motif (water)",
    "cross-check pattern frequency before composing the report"
  ],
  "evidence": [
    { "type": "figure", "path": "analyze_dream/jung-shadow-anima.png",  "caption": "shadow ↔ anima polarity" },
    { "type": "figure", "path": "analyze_dream/freud-displacement.png", "caption": "latent → manifest displacement chain" },
    { "type": "check",  "label": "framework convergence", "passed": true, "expected": "≥2 frameworks aligned", "actual": "Jung+Freud aligned" },
    { "type": "appendix", "title": "framework comparison",
      "markdown": "| symbol | Jungian | Freudian |\n|--------|---------|----------|\n| water | unconscious | maternal |\n| falling | loss of footing | sexual anxiety |\n| transformation | individuation | substitution |" }
  ],
  "checkpoint": { "step_id": "analyze_dream" }
}
EOF

# ── Step 3: analyze_patterns — figure + heatmap + checks ──────────────────
cli step analyze_patterns running --message "scanning for motifs" >/dev/null
place analyze_patterns pattern-viz.png pattern-viz.png
cli step analyze_patterns done --asset pattern-viz.png --message "3 recurring motifs identified" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "3 recurring motifs",
  "status": "complete",
  "support": ["water 50% of dreams", "falling 43%", "transformation 36%"],
  "findings": [
    { "title": "motif A",     "detail": "water — appears across all weekday clusters" },
    { "title": "motif B",     "detail": "falling — clusters on Mon/Tue (post-weekend transition)" },
    { "title": "motif C",     "detail": "transformation — emerges in last 5 entries (correlates with stressor onset)" },
    { "title": "co-occurrence","detail": "water+falling co-occur in 28% of entries" }
  ],
  "evidence": [
    { "type": "figure", "path": "analyze_patterns/pattern-viz.png", "caption": "motif × dream occurrence heatmap" },
    { "type": "check",  "label": "motif frequency threshold", "passed": true,  "expected": "≥0.3",  "actual": "0.36–0.50" },
    { "type": "check",  "label": "sample size adequate",      "passed": true,  "expected": "≥10",   "actual": "14" },
    { "type": "check",  "label": "no single-motif dominance", "passed": true,  "expected": "<0.6",  "actual": "0.50" }
  ],
  "suggestions": ["feed top motif into imagery prompt"],
  "checkpoint": { "step_id": "analyze_patterns" }
}
EOF

# ── Step 4: generate_dream_image — running → blocked → resume → done ──────
cli step generate_dream_image running --message "rendering 3 candidates" >/dev/null
place generate_dream_image dream-imagery.png     dream-imagery.png
place generate_dream_image dream-imagery-alt.png dream-imagery-alt.png
cli step generate_dream_image blocked --message "awaiting reviewer pick" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "awaiting human pick",
  "status": "blocked",
  "suggestions": [
    "pick A — warm palette (literal reading of the warmth motif)",
    "pick B — cool palette (contrasts the falling motif)",
    "reroll with a different prompt seed"
  ],
  "support": [
    "both candidates pass the prompt-adherence check",
    "neither candidate dominates on aesthetic score",
    "deferring to the user — this is a taste call, not a correctness call"
  ],
  "evidence": [
    { "type": "comparison", "title": "candidates",
      "left":  { "label": "A — warm", "path": "generate_dream_image/dream-imagery.png" },
      "right": { "label": "B — cool", "path": "generate_dream_image/dream-imagery-alt.png" } },
    { "type": "check", "label": "prompt adherence (A)", "passed": true, "expected": ">=0.7", "actual": "0.83" },
    { "type": "check", "label": "prompt adherence (B)", "passed": true, "expected": ">=0.7", "actual": "0.81" }
  ],
  "checkpoint": { "step_id": "generate_dream_image" }
}
EOF
cli step generate_dream_image running --message "reviewer chose A, finalizing" >/dev/null
cli step generate_dream_image done --asset dream-imagery.png --message "selected candidate A" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "A selected",
  "status": "complete",
  "note": "alt kept in folder for reference, but not declared as asset",
  "support": ["warm palette better matches the dominant motif"],
  "evidence": [
    { "type": "figure", "path": "generate_dream_image/dream-imagery.png", "caption": "final imagery" },
    { "type": "check",  "label": "reviewer decision recorded", "passed": true, "expected": "A or B chosen", "actual": "A" }
  ],
  "checkpoint": { "step_id": "generate_dream_image" }
}
EOF

# Re-run: same path, new bytes (time-travel demo)
cli step generate_dream_image running --message "reviewer requested re-render" >/dev/null
cp "$FIX/dream-imagery-v2.png" "runs/$RUN/generate_dream_image/dream-imagery.png"
cli step generate_dream_image done --asset dream-imagery.png --message "v2: bluer palette per feedback" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "v2 rendered",
  "status": "complete",
  "note": "same asset path, new bytes — RunHistoryModal now shows two commits for this file",
  "support": [
    "reviewer asked for a cooler reading after seeing it on the printed report",
    "the path didn't change; git history records both versions"
  ],
  "evidence": [
    { "type": "comparison", "title": "v1 → v2",
      "left":  { "label": "v1 warm (older commit)", "path": "generate_dream_image/dream-imagery.png" },
      "right": { "label": "v2 cool (HEAD)",         "path": "generate_dream_image/dream-imagery.png" } },
    { "type": "check", "label": "asset path stable across reruns", "passed": true, "expected": "generate_dream_image/dream-imagery.png", "actual": "generate_dream_image/dream-imagery.png" }
  ],
  "checkpoint": { "step_id": "generate_dream_image" }
}
EOF

# ── Step 5: generate_report — running → error → retry → done → rerun ──────
cli step generate_report running --message "compiling final" >/dev/null
cli step generate_report error   --message "pandoc binary not found" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "build failed",
  "status": "error",
  "note": "transient: pandoc missing on host",
  "support": ["the markdown source is intact; only the PDF render failed"],
  "suggestions": [
    "install pandoc and retry",
    "skip PDF, ship markdown only",
    "retry on a different host"
  ],
  "evidence": [
    { "type": "check", "label": "pandoc binary found",  "passed": false, "expected": "/usr/bin/pandoc", "actual": "not found on PATH" },
    { "type": "check", "label": "report.md exists",     "passed": true,  "expected": "draft present",   "actual": "draft present" }
  ],
  "checkpoint": { "step_id": "generate_report" }
}
EOF
cli step generate_report running --message "retrying with PATH fixed" >/dev/null
place generate_report dream_report.pdf dream_report.pdf
cli step generate_report done --asset dream_report.pdf --message "report compiled on retry" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "report v1 shipped",
  "status": "complete",
  "support": ["retry succeeded after PATH fix"],
  "evidence": [
    { "type": "document", "path": "generate_report/dream_report.pdf", "title": "Dream Report v1" },
    { "type": "check",    "label": "pdf valid",       "passed": true, "expected": "PDF-1.x", "actual": "PDF-1.4" },
    { "type": "check",    "label": "embedded figures","passed": true, "expected": "≥1",       "actual": "2" }
  ],
  "checkpoint": { "step_id": "generate_report" }
}
EOF

# Re-run: same asset path, new bytes (reviewer-driven revision)
cli step generate_report running --message "regenerating with reviewer notes" >/dev/null
cp "$FIX/dream_report_v2.pdf" "runs/$RUN/generate_report/dream_report.pdf"
cli step generate_report done --asset dream_report.pdf --message "report v2 with revisions" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "report v2",
  "status": "complete",
  "support": [
    "addressed reviewer note on Jung citation (1928 → 1964)",
    "embedded the pattern-viz heatmap inline",
    "tightened the framework comparison table"
  ],
  "evidence": [
    { "type": "document",   "path": "generate_report/dream_report.pdf", "title": "Dream Report v2" },
    { "type": "comparison", "title": "imagery v1 vs v2",
      "left":  { "label": "v1", "path": "generate_dream_image/dream-imagery.png" },
      "right": { "label": "v2", "path": "generate_dream_image/dream-imagery.png" } },
    { "type": "check",      "label": "reviewer notes resolved", "passed": true, "expected": "all 3 notes",  "actual": "3/3" },
    { "type": "appendix", "title": "changelog",
      "markdown": "## v2 changelog\n\n1. Replaced Jung 1928 reference with 1964 (per reviewer)\n2. Embedded motif heatmap inline\n3. Tightened framework comparison table" }
  ],
  "takeaway": "ready to ship",
  "checkpoint": { "step_id": "generate_report" }
}
EOF

# ── Deliverable ───────────────────────────────────────────────────────────
cli deliverable running --message "assembling final" >/dev/null
cli deliverable done \
  --asset "generate_report/dream_report.pdf" \
  --asset "analyze_dream/jung-shadow-anima.png" \
  --asset "generate_dream_image/dream-imagery.png" \
  --asset "analyze_patterns/pattern-viz.png" \
  --message "dream analysis complete (v2)" >/dev/null

# ── Summary ───────────────────────────────────────────────────────────────
echo
echo "=== summary ==="
python3 -c "
import json, os
s = json.load(open('runs/$RUN/state.json'))
for sid, body in s['steps'].items():
    print(f'  {sid:24s} {body[\"status\"][\"kind\"]:8s} {len(body[\"assets\"])} asset(s)')
print(f'  {\"deliverable\":24s} {s[\"deliverable\"][\"status\"][\"kind\"]:8s} {len(s[\"deliverable\"][\"assets\"])} asset(s)')
print(f'  replies: {len(os.listdir(f\"runs/$RUN/replies\"))}')
"
echo "git commits: $(git log --oneline | wc -l)"
