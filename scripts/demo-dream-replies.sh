#!/usr/bin/env bash
# Append structured-output replies to a dream-analysis run, one step at a time,
# at 5s intervals. Each reply is a StructuredOutput-shaped JSON.
#
# Usage:  ./scripts/demo-dream-replies.sh [RUN_ID]
#         INTERVAL=3 ./scripts/demo-dream-replies.sh

set -euo pipefail

CLI="$(cd "$(dirname "$0")/.." && pwd)/target/release/flowtrace"
TRACE_DIR="${TRACE_DIR:-$HOME/traces/dream-analysis}"
INTERVAL="${INTERVAL:-5}"

if [[ ! -d "$TRACE_DIR" ]]; then
  echo "TRACE_DIR=$TRACE_DIR not found." >&2
  echo "Build it first with: bash scripts/examples/dream-analysis/build.sh" >&2
  exit 1
fi

cd "$TRACE_DIR"

RUN_ID="${1:-$($CLI run list | tail -n1)}"
if [[ -z "$RUN_ID" ]]; then
  echo "no run; create one with: $CLI run new" >&2
  exit 1
fi

echo "▶ replies → run=$RUN_ID  interval=${INTERVAL}s"

reply() {
  local step="$1" payload="$2"
  echo "  · $(date +%H:%M:%S) reply step=$step"
  $CLI reply --run "$RUN_ID" --step "$step" --json "$payload" >/dev/null
}

# ── 1. gather_context — short markdown answer ──────────────────────────────
reply gather_context "$(cat <<'JSON'
{
  "headline": "Context assembled",
  "takeaway": "Pulled 14 prior dreams from journal + recent stressors (job change last week).",
  "findings": [
    { "title": "Recurring water imagery", "detail": "8 of last 14 dreams involve flowing water." },
    { "title": "Trigger candidate", "detail": "Subject reported job change 7 days prior to dream onset." }
  ],
  "status": "complete"
}
JSON
)"
sleep "$INTERVAL"

# ── 2. analyze_dream — rich, with citations + evidence ─────────────────────
reply analyze_dream "$(cat <<'JSON'
{
  "headline": "Three-framework symbolic analysis",
  "takeaway": "Convergent reading across Jungian, Freudian, Eastern frames — anxiety from job change manifesting as water/falling imagery.",
  "citations": [
    { "id": "jung1964", "authors": "Carl Jung", "title": "Man and His Symbols", "year": 1964 },
    { "id": "freud1900", "authors": "Sigmund Freud", "title": "The Interpretation of Dreams", "year": 1900 }
  ],
  "findings": [
    { "title": "Jungian — Shadow / Anima", "detail": "Falling = Shadow (avoided integration). Water = Anima — fluid emotional self the conscious ego is not yet acknowledging." },
    { "title": "Freudian — displacement",  "detail": "Water as displaced anxiety from job change; falling as ego-loss anxiety." },
    { "title": "Eastern — yin overflow",   "detail": "Water yin in excess; recommend grounding (yang) practices for 7 days." }
  ],
  "evidence": [
    {
      "type": "comparison",
      "title": "Jungian vs Freudian reading",
      "caption": "Both frameworks agree on the trigger (job change); differ on intervention strategy.",
      "left":  { "label": "Jungian (Shadow/Anima)", "caption": "Shadow integration motif" },
      "right": { "label": "Freudian (displacement)", "caption": "Defense displacement" }
    }
  ],
  "status": "complete"
}
JSON
)"
sleep "$INTERVAL"

# ── 3. generate_dream_image — partial, awaiting reviewer pick ──────────────
reply generate_dream_image "$(cat <<'JSON'
{
  "headline": "Dream imagery — 3 candidates rendered",
  "takeaway": "First-pass imagery saved. Awaiting reviewer thumbs-up before report compose.",
  "evidence": [
    { "type": "figure", "file": "dream-imagery.png",     "caption": "Candidate A — water/teal palette" },
    { "type": "figure", "file": "dream-imagery-alt.png", "caption": "Candidate B — dawn/warm palette" },
    { "type": "figure", "file": "pattern-viz.png",       "caption": "Candidate C — pattern/abstract" }
  ],
  "status": "partial",
  "suggestions": ["Approve A", "Approve B", "Approve C", "Regenerate all"]
}
JSON
)"
sleep "$INTERVAL"

# ── 4. analyze_patterns — short markdown-only ──────────────────────────────
echo "  · $(date +%H:%M:%S) reply step=analyze_patterns (markdown)"
$CLI reply --run "$RUN_ID" --step analyze_patterns --markdown "Identified **3 recurring motifs** across last 14 dreams: water (8×), falling (5×), being-watched (3×). Strongest signal: water + job stress correlation r=0.72." >/dev/null
sleep "$INTERVAL"

# ── 5. generate_report — final ─────────────────────────────────────────────
reply generate_report "$(cat <<'JSON'
{
  "headline": "Personalized dream report assembled",
  "takeaway": "Report rendered (8 pages, PDF). Cites 2 frameworks, 3 candidate images, 3 recurring motifs.",
  "findings": [
    { "title": "Output", "detail": "dream_report.pdf — 8 pages, 4 figures, 6 inline citations." }
  ],
  "status": "complete"
}
JSON
)"

# ── 6. A run-level reply (no --step) — for the deliverable summary ────────
sleep "$INTERVAL"
$CLI reply --run "$RUN_ID" --json '{
  "headline": "Deliverable ready for review",
  "takeaway": "All 5 steps converged. Reviewer pick required only on imagery candidates.",
  "status": "complete"
}' >/dev/null
echo "  · $(date +%H:%M:%S) run-level reply"

echo "✓ all replies appended"
