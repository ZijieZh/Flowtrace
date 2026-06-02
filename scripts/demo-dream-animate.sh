#!/usr/bin/env bash
# Drive a dream-analysis run through a sequence of state transitions
# at 5s intervals, exercising every status variant the NodeMap can show.
#
# Usage:  ./scripts/demo-dream-animate.sh [RUN_ID]
#   RUN_ID  override the target run id (defaults to the latest run on the trace)

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
  echo "no run id; create one with: $CLI run new" >&2
  exit 1
fi

echo "▶ animating run=$RUN_ID  interval=${INTERVAL}s"

step()  { echo "  · $(date +%H:%M:%S) step $1 → $2 ${3:+($3)}"; $CLI step "$1" "$2" --run "$RUN_ID" ${3:+--message "$3"} >/dev/null; }
wait_() { sleep "$INTERVAL"; }

# Reset all steps to idle in case the run is in a partial state
for s in gather_context analyze_dream analyze_patterns generate_dream_image generate_report; do
  $CLI step "$s" idle --run "$RUN_ID" >/dev/null
done

# ── Scene 1: gather_context starts ──────────────────────────────────────────
step gather_context running "pulling 14 prior dreams + journal entries"
wait_

# ── Scene 2: gather done, analyze_dream starts ──────────────────────────────
step gather_context done   "collected 14 prior dreams"
step analyze_dream  running "triangulating jung + freud + eastern frames"
wait_

# ── Scene 3: analyze done, two parallel children kick off ───────────────────
step analyze_dream      done    "convergent reading across three frameworks"
step generate_dream_image running "rendering 3 candidate compositions"
step analyze_patterns     running "scanning prior dreams for motifs"
wait_

# ── Scene 4: image gets blocked waiting for reviewer ────────────────────────
step generate_dream_image blocked "awaiting reviewer pick from 3 candidates"
wait_

# ── Scene 5: patterns finishes, image still blocked ─────────────────────────
step analyze_patterns done "3 recurring motifs identified"
wait_

# ── Scene 6: image unblocked, resumes ──────────────────────────────────────
step generate_dream_image running "candidate B approved, finalising"
wait_

# ── Scene 7: image done, report starts ──────────────────────────────────────
step generate_dream_image done "candidate B finalised"
step generate_report running "composing PDF"
wait_

# ── Scene 8: report errors out ──────────────────────────────────────────────
step generate_report error "pandoc not found"
wait_

# ── Scene 9: report retries ─────────────────────────────────────────────────
step generate_report running "retrying with weasyprint"
wait_

# ── Scene 10: report done ───────────────────────────────────────────────────
step generate_report done "report rendered (8 pages)"

echo "✓ done"
