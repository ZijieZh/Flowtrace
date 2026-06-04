#!/usr/bin/env bash
# research-writer — lift a long-form-writing skill into a trace, then run it once.
#
# This is a worked example in the spirit of the README's "Make your own trace"
# section. The source skill is:
#
#   content-research-writer (SKILL.md)
#   by ComposioHQ — https://github.com/ComposioHQ/awesome-claude-skills
#   licensed Apache-2.0
#
# Its eight numbered "Instructions" steps (understand the project / collaborative
# outlining + research-to-do / conduct research / iterate the outline / draft /
# improve the hook / section-by-section feedback / preserve voice / citation
# management / final review + pre-publish checklist) become an 11-node DAG.
#
# The whole point is the ROOT node. understand_project fixes audience / goal /
# length / style — and every other node reads that brief. The run replays a
# concrete deep-dive ("AI Agents in the Enterprise") whose audience the writer
# INFERS as VC investors; every fixture is written in that frame. Because the
# entire DAG hangs off that one judgment, editing the audience mid-run would make
# ~9 downstream nodes go stale (see `flowtrace show --downstream understand_project`).
# That is the node-level STEER story this example exists to demonstrate.
#
# No network, no heavy deps: every node replays a precomputed fixture, so the
# build is deterministic and offline.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"

FIX="$HERE/fixtures"

# ── Authoring: scaffold the trace one piece at a time ───────────────────────
init_empty
scaffold_deliverable
author_file resources/request.md "add input: the writing brief"

# topological order — root first, then its dependents
author_step understand_project
author_step research_todo
author_step outline
author_step research_collect
author_step outline_final
author_step draft
author_step hook_rewrite
author_step section_review
author_step voice_check
author_step polish_citations
author_step prepub_checklist

# ── Orientation: read-side CLI surfaces ─────────────────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt ascii   >/dev/null
cli show --fmt mermaid >/dev/null

# Prove the steer cascade is real before the run: the root's transitive
# dependents are exactly the set that would go stale if audience changed.
echo
echo "=== steer cascade: flowtrace show --downstream understand_project ==="
"$BIN" show --downstream understand_project
echo

# ── Start the run ───────────────────────────────────────────────────────────
RUN=$(cli run new --name "AI Agents in the Enterprise — deep-dive (VC frame)" | tail -1)
cli run show --run "$RUN" >/dev/null

place() { mkdir -p "runs/$RUN/$1"; cp "$FIX/$1/$2" "runs/$RUN/$1/$2"; }

# helper: running → place asset → done → one reply
do_step () {
  local id=$1 asset=$2 done_msg=$3 headline=$4
  cli step "$id" running --message "working" >/dev/null
  place "$id" "$asset"
  cli step "$id" done --asset "$asset" --message "$done_msg" >/dev/null
  cli reply <<EOF >/dev/null
{
  "headline": "$headline",
  "status": "complete",
  "evidence": [
    { "type": "document", "path": "$id/$asset", "title": "$asset" }
  ],
  "checkpoint": { "step_id": "$id" }
}
EOF
}

# ── Root: the judgment everything depends on (richer reply) ──────────────────
cli step understand_project running --message "resolving the six clarifying questions" >/dev/null
place understand_project project.json
cli step understand_project done --asset project.json \
  --message "audience INFERRED: VC investors; goal: persuade; thesis: value migrates up the stack" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "Project framed — audience: VC investors, goal: persuade",
  "status": "complete",
  "support": [
    "topic: AI agents in the enterprise — the 2026 demo-to-deployed inflection",
    "audience INFERRED from the brief: VC / growth investors deciding where to deploy capital",
    "thesis: durable value accrues to the orchestration / eval / integration layer, not the model labs",
    "style: confident, analytical, mildly contrarian — every number sourced"
  ],
  "findings": [
    { "title": "the steerable judgment", "detail": "every downstream node reads this brief; change the audience and ~9 nodes go stale (flowtrace show --downstream understand_project)" },
    { "title": "call to action", "detail": "underwrite the reliability/orchestration layer; demand task-completion metrics, not demos" }
  ],
  "evidence": [
    { "type": "document", "path": "understand_project/project.json", "title": "project.json" }
  ],
  "checkpoint": { "step_id": "understand_project" }
}
EOF

# ── Two parallel children of the root: outline + research-to-do ──────────────
do_step research_todo  research_todo.json "8 sourcing to-dos, framed for an investor read"     "Research to-do enumerated (8 claims)"
do_step outline        outline.json       "hook + 5 main sections + CTA, investor structure"   "Draft outline (5 sections)"

# ── Research, then iterate the outline (first fan-in) ────────────────────────
do_step research_collect research.json    "8 findings sourced; 1 claim QUALIFIED, not rubber-stamped" "Research compiled (8 citations)"
do_step outline_final    outline_final.json "research folded in, killed claim reframed, order locked"  "Final outline locked"

# ── Draft the body (richer reply) ────────────────────────────────────────────
cli step draft running --message "drafting section by section against the locked outline" >/dev/null
place draft draft.md
cli step draft done --asset draft.md \
  --message "full first draft: hook placeholder + intro + 5 sections + conclusion, inline [Cn] markers" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "First draft complete — 5 sourced sections in the investor frame",
  "status": "complete",
  "support": [
    "every load-bearing number carries an inline [Cn] marker back to research.json",
    "each section leads with the 'so what for capital' per the audience brief",
    "hook left as a placeholder for hook_rewrite; citations left raw for polish_citations"
  ],
  "findings": [
    { "title": "sharpest argument", "detail": "90%-per-step reliability still fails a 10-step task more often than not" },
    { "title": "honesty kept", "detail": "the 'agents replace SaaS seats' section pressure-tests the thesis rather than repeating it" }
  ],
  "evidence": [
    { "type": "document", "path": "draft/draft.md", "title": "draft.md" }
  ],
  "checkpoint": { "step_id": "draft" }
}
EOF

# ── Two parallel critiques of the draft: hook + section review ───────────────
do_step hook_rewrite hooks.json "3 hooks (bold / story / data); recommend the sourced-data open" "Hook candidates (3)"

cli step section_review running --message "reviewing every section: clarity / flow / evidence / style" >/dev/null
place section_review section_review.json
cli step section_review done --asset section_review.json \
  --message "5 sections reviewed; 3 calibration line-edits; protect the staccato voice lines" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "Section review complete — clarity / flow / evidence / style",
  "status": "complete",
  "support": [
    "s1: soften 'essentially complete' overclaim for a skeptical reader",
    "s2: complete the chain into the reliability section",
    "s3/s4: protect the punchy voice lines; do not pad the evidence"
  ],
  "findings": [
    { "title": "most credible passage", "detail": "the s4 pressure-test of the replace-seats thesis — keep the qualified verdict" },
    { "title": "no structural change", "detail": "section order is right; only calibration edits + voice protection needed" }
  ],
  "evidence": [
    { "type": "document", "path": "section_review/section_review.json", "title": "section_review.json" }
  ],
  "checkpoint": { "step_id": "section_review" }
}
EOF

# ── Voice pass (suggest, don't replace) ──────────────────────────────────────
do_step voice_check voice_check.json "2 accept, 1 soften, 1 REJECT to protect the contrarian POV" "Voice preserved (1 edit rejected)"

# ── Second fan-in: apply hook + voice-checked edits, format citations ────────
do_step polish_citations report.md "chosen hook in, edits applied, [n] citations + References, polished" "Publication-ready report"

# ── Final gate: pre-publish checklist ────────────────────────────────────────
do_step prepub_checklist checklist.json "all 7 gates pass — ready to publish" "Pre-publish checklist: ready"

# ── Deliverable ──────────────────────────────────────────────────────────────
cli deliverable running --message "packaging deliverable" >/dev/null
cli deliverable done \
  --asset polish_citations/report.md \
  --asset outline_final/outline_final.json \
  --asset understand_project/project.json \
  --asset prepub_checklist/checklist.json \
  --message "Deep-dive 'AI Agents in the Enterprise' (VC frame): publishable report + locked outline + project brief + pre-publish checklist" >/dev/null

echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "Done. View: trace serve  →  http://localhost:3000/traces/research-writer"
