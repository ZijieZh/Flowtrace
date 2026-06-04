#!/usr/bin/env bash
# tailored-resume — lift a SKILL.md into a trace, then run it once.
#
# This is the worked example behind the README's "Make your own trace"
# section. The source skill is:
#
#   tailored-resume-generator (SKILL.md)
#   by ComposioHQ — https://github.com/ComposioHQ/awesome-claude-skills
#   licensed Apache-2.0
#
# Its six prose "Key Process Steps" become a 7-node fan-in/fan-out DAG:
#
#   job_description → read_jd → extract_keywords ─┬─→ score_bullets → rewrite_bullets ─┐
#                                                 │        ↑                            ├─→ reorder_format
#   resume_before  → parse_resume ───────────────┘────────┘         (extract_keywords)─┘
#                       extract_keywords + score_bullets ──→ strategic_recommendations
#
# The run tailors a deliberately generic resume (Jordan Lee) to a specific
# backend-payments JD (PayCore), so the before/after is visibly different.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"

FIX="$HERE/fixtures"

# ── Authoring: scaffold the trace one piece at a time ───────────────────
init_empty
scaffold_deliverable
author_file resources/job_description.md "add input: target JD"
author_file resources/resume_before.md  "add input: candidate resume"
author_step read_jd
author_step parse_resume
author_step extract_keywords
author_step score_bullets
author_step rewrite_bullets
author_step reorder_format
author_step strategic_recommendations

# ── Orientation: read-side CLI surfaces ───────────────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ─────────────────────────────────────────────────────────
RUN=$(cli run new --name "Jordan Lee → PayCore Backend Engineer" | tail -1)
cli run show --run "$RUN" >/dev/null
place() { mkdir -p "runs/$RUN/$1"; cp "$FIX/$1/$2" "runs/$RUN/$1/$2"; }

# Copy the original resume into the run so the before/after comparison can
# cite it run-relative (evidence paths forbid '..').
cp resources/resume_before.md "runs/$RUN/resume_before.md"

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

# ── Parallel roots: JD side and resume side are independent ───────────────
do_step read_jd       jd_parsed.json     "parsed JD: 6 must-have, 3 nice-to-have"        "JD parsed"
do_step parse_resume  resume_parsed.json "structured resume: 18 bullets across 3 roles"  "resume parsed"

# ── Job analysis ──────────────────────────────────────────────────────────
do_step extract_keywords keywords.json   "13 weighted keywords; 6 must-have hard skills" "keywords extracted"

# ── Fan-in: scoring needs both keywords and parsed resume ─────────────────
cli step score_bullets running --message "scoring bullets against keywords" >/dev/null
place score_bullets bullet_scores.json
cli step score_bullets done --asset bullet_scores.json --message "18 bullets scored: 6 irrelevant, 12 weak; distributed/Kafka are real gaps" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "18 bullets scored against the JD",
  "status": "complete",
  "support": [
    "6 irrelevant (a whole frontend/marketing role + a React bullet), 12 weak — none strong as written",
    "Python + Flask services + relational-DB + a buried Stripe payments integration are the real bridges",
    "distributed systems and Kafka are honest gaps"
  ],
  "findings": [
    { "title": "transferable signal", "detail": "MySQL → PostgreSQL; Stripe checkout → payments domain; logging/dashboards → observability" },
    { "title": "must-have missing",   "detail": "Go/Java, distributed systems, Kafka — flagged for the recommendations branch" }
  ],
  "evidence": [
    { "type": "document", "path": "score_bullets/bullet_scores.json", "title": "bullet_scores.json" },
    { "type": "check", "label": "every bullet scored", "passed": true, "expected": 18, "actual": 18 }
  ],
  "checkpoint": { "step_id": "score_bullets" }
}
EOF

# ── Fan-out: rewrite + format on one branch, recommendations on another ───
do_step rewrite_bullets bullets_rewritten.json "rewrote 12 weak bullets, dropped 6 (a whole frontend role + a React bullet), new summary" "bullets rewritten (no fabrication)"

cli step reorder_format running --message "assembling ATS-safe resume" >/dev/null
place reorder_format resume_after.md
cli step reorder_format done --asset resume_after.md --message "backend-first reorder, skills section promoted, ATS-safe" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "tailored resume assembled",
  "status": "complete",
  "support": [
    "backend bullets surfaced; frontend dropped",
    "Skills section promoted (technical role — Special Guidance)",
    "JD keywords incorporated; standard ATS headings"
  ],
  "evidence": [
    { "type": "comparison", "title": "resume: before → after",
      "left":  { "label": "before (generic)",  "path": "resume_before.md" },
      "right": { "label": "after (tailored)",   "path": "reorder_format/resume_after.md" } },
    { "type": "document", "path": "reorder_format/resume_after.md", "title": "resume_after.md" }
  ],
  "checkpoint": { "step_id": "reorder_format" }
}
EOF

do_step strategic_recommendations recommendations.md "strengths + honest gap plan + interview points + cover hooks" "strategic recommendations"

# ── Deliverable ───────────────────────────────────────────────────────────
cli deliverable running --message "packaging deliverable" >/dev/null
cli deliverable done \
  --asset reorder_format/resume_after.md \
  --asset strategic_recommendations/recommendations.md \
  --asset score_bullets/bullet_scores.json \
  --asset extract_keywords/keywords.json \
  --message "Resume tailored to PayCore Backend Engineer + interview-prep recommendations" >/dev/null

echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "Done. View: trace serve  →  http://localhost:3000/traces/tailored-resume"
