#!/usr/bin/env bash
# paid-ads — lift a set of marketing skills into a weekly paid-ads optimization
# trace, then run one week of it. This is a GROW example: the hypothesis node reads
# an accumulated brand memory.md, so its output is brand-specific, not generic.
#
# The source skills are all from:
#
#   coreyhaines31/marketingskills (SKILL.md files), licensed MIT — 50+ marketing skills
#
# Composed into a 12-node fan-out/fan-in DAG. This week's account pull fans into five
# parallel diagnoses (ad-creative, customer-research, analytics, ads, cro); they fan in
# to a single bottleneck via marketing-psychology's Theory of Constraints; that becomes
# 3 ICE-weighted candidate experiments via ab-testing's hypothesis framework — read
# against an accumulated memory.md (the lift of product-marketing's context document),
# which prunes candidates prior weeks already ruled out; the winner is scoped into a test
# (ab-testing), turned into creative + landing variants (ad-creative + cro), shipped with
# a launch + tracking checklist (ads + analytics), and written back to the playbook
# (ab-testing's Experiment Playbook + product-marketing).
#
# The run replays one coherent week ("week 7") from fixtures. The GROW mechanic is real:
# the build seeds runs/<run>/memory.md with the weeks-1-6 playbook BEFORE the hypothesis
# step runs (so it genuinely reads accumulated judgment), and the memory_writeback step
# emits the grown memory.md as its asset.
#
# No network, no heavy deps — the week's numbers ship as fixtures so the build is
# deterministic and offline.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"
FIX="$HERE/fixtures"

# ── Authoring: scaffold the trace one piece at a time ────────────────────────
init_empty
scaffold_deliverable
author_file resources/request.md "add input: this week's brief + running brand context"

for s in weekly_data \
         diag_copy diag_audience diag_timing diag_channel diag_funnel \
         problem_tree hypothesis ab_setup variant_gen launch_plan memory_writeback; do
  author_step "$s"
done

# ── Orientation: read-side CLI surfaces ───────────────────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ─────────────────────────────────────────────────────────────
RUN=$(cli run new --name "Lumora — week 7 paid-ads optimization" | tail -1)
cli run show --run "$RUN" >/dev/null

# helper: running → place fixture asset(s) → done → one reply
do_step() {
  local id=$1 head=$2; shift 2
  cli step "$id" running --message "working" >/dev/null
  local args=() first=""
  for a in "$@"; do
    mkdir -p "runs/$RUN/$id"; cp "$FIX/$id/$a" "runs/$RUN/$id/$a"
    args+=(--asset "$a"); [[ -z "$first" ]] && first="$a"
  done
  cli step "$id" done "${args[@]}" --message "$head" >/dev/null
  python3 - "$id" "$first" "$head" <<'PY' | cli reply >/dev/null
import sys, json
sid, asset, head = sys.argv[1:4]
print(json.dumps({"headline": head, "status": "complete",
  "evidence": [{"type": "document", "path": f"{sid}/{asset}", "title": asset}],
  "checkpoint": {"step_id": sid}}))
PY
}

# ── Root: normalize this week's pull ──────────────────────────────────────────
do_step weekly_data "Week 7 — blended CPA \$71 (+22%), hero-video CTR 0.7% (-50%)" weekly_data.json

# ── 5 parallel diagnoses ──────────────────────────────────────────────────────
do_step diag_copy     "Creative — hero video fatigued (CTR halved, freq +55%)" diag_copy.json
do_step diag_audience "Audience — gift-intent durable; hot-sleeper softness is seasonal" diag_audience.json
do_step diag_timing   "Timing — CPA spike is real, not an attribution artefact" diag_timing.json
do_step diag_channel  "Channel — damage in Meta prospecting; CPM bump is transient" diag_channel.json
do_step diag_funnel   "Funnel — quiz path held; PDP dip is downstream of weak traffic" diag_funnel.json

# ── Fan-in: Theory of Constraints names the one bottleneck ─────────────────────
cli step problem_tree running --message "integrating 5 diagnoses (Theory of Constraints)" >/dev/null
mkdir -p "runs/$RUN/problem_tree"; cp "$FIX/problem_tree/problem_tree.json" "runs/$RUN/problem_tree/problem_tree.json"
cli step problem_tree done --asset problem_tree.json \
  --message "Bottleneck = hero-video creative fatigue; CPMs/seasonality are subordinate" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Binding constraint: hero-video creative fatigue in Meta prospecting",
  "status": "complete",
  "support": [
    "One aging 0:30 video (5 wks unchanged) is over-served — CTR -50% as frequency +55%",
    "Fixing it relieves CTR, frequency, prospecting CPA and blended CPA at once",
    "Competitor-CPM bump and hot-sleeper softness are transient/seasonal — subordinate"
  ],
  "findings": [
    { "title": "Theory of Constraints", "detail": "The single node that caps throughput regardless of other tuning is the fatigued creative." },
    { "title": "Occam's Razor", "detail": "One over-served asset explains the most movers; no attribution or funnel-redesign theory needed." },
    { "title": "Structural vs transient", "detail": "Creative fatigue recurs (~4-wk cadence); CPM inflation and seasonal hot-sleeper softness will lapse." }
  ],
  "evidence": [
    { "type": "document", "path": "problem_tree/problem_tree.json", "title": "problem_tree.json" },
    { "type": "check", "label": "all 5 diagnoses integrated", "passed": true, "expected": 5, "actual": 5 }
  ],
  "checkpoint": { "step_id": "problem_tree" }
}
EOF

# ── GROW: seed the accumulated brand memory (weeks 1-6) BEFORE the hypothesis,
#    so the hypothesis node genuinely reads prior judgment. ─────────────────────
cp "$FIX/hypothesis/memory_prior.md" "runs/$RUN/memory.md"

cli step hypothesis running --message "reading memory.md (wk1-6), then generating ICE-weighted candidates" >/dev/null
mkdir -p "runs/$RUN/hypothesis"; cp "$FIX/hypothesis/hypothesis.json" "runs/$RUN/hypothesis/hypothesis.json"
cli step hypothesis done --asset hypothesis.json \
  --message "3 candidates; top = refresh on-pattern video (ICE 8.0); 3 generic ideas pruned by memory" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Memory-informed hypothesis: refresh the proven before/after video (ICE 8.0)",
  "status": "complete",
  "support": [
    "Read memory.md first; treated every settled learning as a constraint",
    "H1 (ICE 8.0): new long-story before/after video — applies wk6 (refresh ~4wk + durable pattern) and wk2 (long-story format)",
    "H2 (ICE 7.3): frequency cap + LAL-3% -> LAL-1% — low-effort delivery fix that amplifies H1"
  ],
  "findings": [
    { "title": "Pruned by memory wk2", "detail": "Skipped re-testing short punchy hooks — long-story already proven to win ~1.8x." },
    { "title": "Pruned by memory wk5", "detail": "Skipped a 15-20% off sale to match competitors — %-off was retired; free-shipping framing wins." },
    { "title": "Pruned by problem_tree", "detail": "Skipped defending the hot-sleeper cooling angle — seasonal, contested, transient." },
    { "title": "Brand-specific, not generic", "detail": "A generic week-1 answer would say 'try new creative, maybe a sale, test shorter hooks.' Memory turned that into a named pattern + two explicit refusals + the proven Wed-9am slot." }
  ],
  "evidence": [
    { "type": "document", "path": "hypothesis/hypothesis.json", "title": "hypothesis.json" },
    { "type": "comparison", "title": "what the hypothesis read",
      "left":  { "label": "accumulated memory (wk1-6)", "path": "memory.md" },
      "right": { "label": "memory-informed hypothesis",  "path": "hypothesis/hypothesis.json" } },
    { "type": "check", "label": "candidates pruned by a cited memory entry", "passed": true, "expected": 3, "actual": 3 }
  ],
  "takeaway": "The hypothesis is shaped by what weeks 1-6 proved: it names the exact winning creative pattern and refuses the sale and the short-hook reflex by citing the weeks that settled them.",
  "checkpoint": { "step_id": "hypothesis" }
}
EOF

# ── Decision chain: design → variants → launch ────────────────────────────────
do_step ab_setup    "Test design — fresh video A/B (50/50, ~10-14d) + isolated freq-cap change" ab_setup.json
do_step variant_gen "Variants — control vs. treatment ad + matching landing (specs validated)" variants.md
do_step launch_plan "Launch + tracking checklist — Wed 9am ET, UTM split on utm_content" launch_plan.md

# ── Close the GROW loop: write the grown memory.md ────────────────────────────
cli step memory_writeback running --message "appending week-7 decision + pending playbook entries to memory.md" >/dev/null
mkdir -p "runs/$RUN/memory_writeback"; cp "$FIX/memory_writeback/memory.md" "runs/$RUN/memory_writeback/memory.md"
cli step memory_writeback done --asset memory.md \
  --message "memory.md grown: wk1-6 carried forward + wk7 decision + 2 pending playbook entries" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Brand playbook grown — week 7 learning written back for week 8",
  "status": "complete",
  "support": [
    "Carried forward all wk1-6 settled learnings verbatim (append-mostly)",
    "Added a wk7 decision block: bottleneck, chosen tests, and the candidates skipped (with the memory entry that killed each)",
    "Added 2 PENDING experiment-playbook entries (running) to promote to win/loss next cycle"
  ],
  "findings": [
    { "title": "Loop closed", "detail": "memory.md is now one week richer; week 8's hypothesis reads the fuller file." },
    { "title": "Pending, not a win", "detail": "A test that hasn't read out is logged as 'running', per ab-testing's playbook discipline." }
  ],
  "evidence": [
    { "type": "comparison", "title": "memory grows by one week",
      "left":  { "label": "before (wk1-6)", "path": "memory.md" },
      "right": { "label": "after (wk1-7)",  "path": "memory_writeback/memory.md" } },
    { "type": "document", "path": "memory_writeback/memory.md", "title": "memory.md (updated playbook)" }
  ],
  "takeaway": "This is the GROW payoff: the trace's output is not just this week's test, it is a brand playbook that is more specific than it was last week and will make next week's judgment sharper.",
  "checkpoint": { "step_id": "memory_writeback" }
}
EOF

# ── Deliverable ───────────────────────────────────────────────────────────────
cli deliverable running --message "packaging this week's decision + the grown playbook" >/dev/null
cli deliverable done \
  --asset launch_plan/launch_plan.md \
  --asset variant_gen/variants.md \
  --asset hypothesis/hypothesis.json \
  --asset ab_setup/ab_setup.json \
  --asset memory_writeback/memory.md \
  --message "Week 7: ship fresh before/after video A/B (+freq cap); launch Wed 9am ET; playbook updated" >/dev/null

echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "Done. View: trace serve  →  http://localhost:3000/traces/paid-ads"
