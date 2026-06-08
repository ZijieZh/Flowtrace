#!/usr/bin/env bash
# distill-mind — lift a "distill a mind into a skill" SKILL into ONE reusable trace, then run it.
#
# This is a worked COMPOSE example: the knowledge is in the arrows. The trace template/
# (trace.json + the 12 STEP.md contracts) is INPUT-AGNOSTIC — every node describes the METHOD
# only, never one subject's answers. The run's subject-specific answers live entirely in the
# replayed fixtures + the request.
#
#   bash build.sh            # -> ~/traces/distill-mind
#
# The source skill is the "造人术 / 女娲" persona-distiller:
#   alchaincyf/nuwa-skill  —  SKILL.md (huashu-nuwa)  +  references/extraction-framework.md
#   + references/skill-template.md  —  licensed MIT.
# Its pipeline (Phase 0A intake -> Phase 1 six-agent research swarm -> Phase 1.5 review +
# extraction-framework triple test -> Phase 2 synthesis -> Phase 4 validation split -> Phase 3
# build) becomes a 12-node DAG. Every STEP.md cites the real section it lifts.
#
# ⚠️ SUBJECT SAFETY: distilling a real person into a "persona skill" is an impersonation risk,
# so the demo run distills a FICTIONAL figure — "Mira Tan", a veteran product-design mentor —
# from an entirely INVENTED corpus (essays/podcast/posts that do not exist). The request and the
# persona deliverable both open with a prominent disclaimer. No real individual is named or
# characterized.
#
# No network, no heavy deps — every output is a JSON/markdown fixture, so the build is offline
# and deterministic.
set -euo pipefail

RUN_NAME='Distill "Mira Tan" (a fictional design mentor) into a runnable persona skill'

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"
FIX="$HERE/fixtures"
REQ="resources/request.md"
[[ -d "$FIX" ]] || { echo "missing fixtures dir: $FIX" >&2; exit 2; }
[[ -f "$HERE/template/$REQ" ]] || { echo "missing request file: template/$REQ" >&2; exit 2; }

# ── Authoring: scaffold the trace one piece at a time ────────────────────────
init_empty
scaffold_deliverable
# The intake step reads resources/request.md; author the request into that path.
mkdir -p resources
cp "$HERE/template/$REQ" resources/request.md
git add resources/request.md
cli_commit "add input: the persona-distill request (fictional subject)"

for s in intake \
         research_1 research_2 research_3 research_4 research_5 research_6 \
         triple_verify synthesize \
         known_traits novel_inferences persona_skill; do
  author_step "$s"
done

# ── Orientation: read-side CLI surfaces ──────────────────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ────────────────────────────────────────────────────────────
RUN=$(cli run new --name "$RUN_NAME" | tail -1)
cli run show --run "$RUN" >/dev/null

# headline_from <step>/<asset.json> <field1> [field2 ...] — pull a one-line headline from a
# fixture's OWN content, so the build narrates from the fixtures and bakes in no answers itself.
headline_from() {
  local relpath=$1; shift
  python3 - "$FIX/$relpath" "$@" <<'PY'
import sys, json
path = sys.argv[1]; fields = sys.argv[2:]
try:
    d = json.load(open(path))
except Exception:
    print(""); sys.exit(0)
parts = []
for f in fields:
    v = d.get(f)
    if isinstance(v, (str, int, float)) and str(v).strip():
        parts.append(str(v))
print(" — ".join(parts)[:240])
PY
}

# do_fixture <step> [--head f1,f2] <asset>... : running -> place fixture(s) -> done -> one reply.
do_fixture() {
  local id=$1; shift
  local -a hfields=()
  if [[ "${1:-}" == "--head" ]]; then IFS=',' read -r -a hfields <<< "$2"; shift 2; fi
  cli step "$id" running --message "working" >/dev/null
  local args=() first=""
  for a in "$@"; do
    mkdir -p "runs/$RUN/$id"; cp "$FIX/$id/$a" "runs/$RUN/$id/$a"
    args+=(--asset "$a"); [[ -z "$first" ]] && first="$a"
  done
  local head=""
  if ((${#hfields[@]})); then head=$(headline_from "$id/$first" "${hfields[@]}"); fi
  [[ -z "$head" ]] && head="$id complete"
  cli step "$id" done "${args[@]}" --message "$head" >/dev/null
  python3 - "$id" "$first" "$head" <<'PY' | cli reply >/dev/null
import sys, json
sid, asset, head = sys.argv[1:4]
print(json.dumps({"headline": head, "status": "complete",
  "evidence": [{"type": "document", "path": f"{sid}/{asset}", "title": asset}],
  "checkpoint": {"step_id": sid}}))
PY
}

# do_research <step> <asset> <running_msg> : a research lane — surfaces its own corpus +
# a sample finding from the fixture, so the parallel-swarm story is visible.
do_research() {
  local id=$1 asset=$2 running_msg=$3
  cli step "$id" running --message "$running_msg" >/dev/null
  mkdir -p "runs/$RUN/$id"; cp "$FIX/$id/$asset" "runs/$RUN/$id/$asset"
  cli step "$id" done --asset "$asset" --message "$running_msg — lane done" >/dev/null
  python3 - "$id" "$asset" "$RUN" <<'PY' | cli reply >/dev/null
import sys, json
sid, asset, run = sys.argv[1:4]
d = json.load(open(f"runs/{run}/{sid}/{asset}"))
support = []
if d.get("corpus"): support.append("corpus: " + str(d["corpus"]))
# one representative finding, whichever list the lane carries
for key in ("repeated_core_claims","improvised_analogies","signature_vocabulary",
            "observed_patterns","decisions","milestones"):
    v = d.get(key)
    if isinstance(v, list) and v:
        item = v[0]
        if isinstance(item, dict):
            label = item.get("claim") or item.get("analogy") or item.get("pattern") or item.get("decision") or item.get("event") or str(list(item.values())[0])
            support.append("e.g. " + str(label)[:120])
        break
    if isinstance(v, dict) and v.get("high_frequency"):
        support.append("high-freq: " + ", ".join(v["high_frequency"][:4])); break
if d.get("contradictions_noted"):
    support.append("kept contradiction: " + str(d["contradictions_noted"][0])[:120])
support = support[:3] or ["research lane complete"]
print(json.dumps({"headline": f"{sid}: " + str(d.get("lane", sid)),
  "status": "complete", "support": support,
  "note": str(d.get("disclaimer","")) or None,
  "evidence": [{"type": "document", "path": f"{sid}/{asset}", "title": asset}],
  "checkpoint": {"step_id": sid}}))
PY
}

# ── Intake (root) ────────────────────────────────────────────────────────────
do_fixture intake --head subject,intended_use persona_brief.json

# ── 6 research lanes, run in PARALLEL (independent Agent swarm) ───────────────
do_research research_1 01-writings.json      "Agent 1 — writings (Notes on Friction)"
do_research research_2 02-conversations.json "Agent 2 — conversations (The Second Draft)"
do_research research_3 03-expression-dna.json "Agent 3 — expression DNA (short posts)"
do_research research_4 04-external-views.json "Agent 4 — external views (others on her method)"
do_research research_5 05-decisions.json     "Agent 5 — decisions (narrated case studies)"
do_research research_6 06-timeline.json      "Agent 6 — timeline (career + last 12 months)"

# ── Triple-verify (fan-in over all six lanes) — KEY NODE, richer reply ───────
cli step triple_verify running --message "rolling up 6 lanes; triple-testing each candidate" >/dev/null
mkdir -p "runs/$RUN/triple_verify"; cp "$FIX/triple_verify/verification.json" "runs/$RUN/triple_verify/"
cli step triple_verify done --asset verification.json \
  --message "candidates triple-tested -> models / heuristics / dropped; contradictions kept" >/dev/null
python3 - "$RUN" <<'PY' | cli reply >/dev/null
import json, sys
d = json.load(open("runs/" + sys.argv[1] + "/triple_verify/verification.json"))
tiers = d.get("tiers_after", {})
models = [c["claim"] for c in d.get("candidates", []) if c.get("tier") == "mental_model"]
dropped = [c for c in d.get("candidates", []) if c.get("tier") == "dropped"]
support = [
  f"{d.get('candidate_count_before','?')} candidates -> "
  f"{tiers.get('mental_model',0)} mental models, {tiers.get('heuristic',0)} heuristics, {tiers.get('dropped',0)} dropped",
  "the 3/3 survivors (cross-domain · generative · exclusive): " + "; ".join(models[:4]),
]
if dropped:
    support.append("dropped as a model: " + dropped[0]["claim"] + " (" + dropped[0].get("note","")[:80] + ")")
findings = [{"title": f"tension kept ({t['type']})", "detail": t["tension"]} for t in d.get("tensions", [])[:3]]
out = {"headline": "Triple-test: candidates -> models / heuristics, contradictions kept as tensions",
  "status": "complete", "support": support[:3], "findings": findings,
  "evidence": [
    {"type": "document", "path": "triple_verify/verification.json", "title": "verification.json"},
    {"type": "check", "label": "every candidate triple-tested", "passed": True,
     "expected": d.get("candidate_count_before"), "actual": sum(tiers.values())}],
  "checkpoint": {"step_id": "triple_verify"}}
print(json.dumps(out))
PY

# ── Synthesize — KEY NODE, richer reply ──────────────────────────────────────
cli step synthesize running --message "integrating survivors into the persona framework (Phase 2)" >/dev/null
mkdir -p "runs/$RUN/synthesize"; cp "$FIX/synthesize/framework.json" "runs/$RUN/synthesize/"
cli step synthesize done --asset framework.json \
  --message "framework: mental models + heuristics + expression DNA + tensions + honest boundary" >/dev/null
python3 - "$RUN" <<'PY' | cli reply >/dev/null
import json, sys
d = json.load(open("runs/" + sys.argv[1] + "/synthesize/framework.json"))
mm = d.get("mental_models", []); hs = d.get("decision_heuristics", [])
support = [
  f"{len(mm)} mental models (each with evidence + an explicit limit) — fewer-but-deeper, ordered by exclusivity",
  f"{len(hs)} decision heuristics, each tied to a case from the decisions lane",
  "voice rules + taboo words from the expression-DNA lane; honest boundary names what the lens cannot do",
]
findings = [{"title": m["name"], "detail": m["one_line"] + "  (limit: " + m.get("limit","")[:80] + ")"} for m in mm[:4]]
out = {"headline": "Framework synthesized: a runnable cognitive operating system",
  "status": "complete", "support": support, "findings": findings,
  "note": d.get("disclaimer",""),
  "evidence": [
    {"type": "document", "path": "synthesize/framework.json", "title": "framework.json"},
    {"type": "check", "label": "mental models in the skill's 3-7 band", "passed": 3 <= len(mm) <= 7,
     "expected": "3-7", "actual": len(mm)}],
  "checkpoint": {"step_id": "synthesize"}}
print(json.dumps(out))
PY

# ── Validation split: known (on-record) ∥ novel (hedged) — run in PARALLEL ────
cli step known_traits running --message "Phase 4.1 sanity check: framework vs on-record positions" >/dev/null
mkdir -p "runs/$RUN/known_traits"; cp "$FIX/known_traits/known_traits.json" "runs/$RUN/known_traits/"
cli step known_traits done --asset known_traits.json \
  --message "on-record positions direction-matched (match / partial)" >/dev/null
python3 - "$RUN" <<'PY' | cli reply >/dev/null
import json, sys
d = json.load(open("runs/" + sys.argv[1] + "/known_traits/known_traits.json"))
probes = d.get("probes", [])
verdicts = {}
for p in probes: verdicts[p.get("verdict","?")] = verdicts.get(p.get("verdict","?"),0)+1
support = [
  "probes vs on-record stance: " + ", ".join(f"{k}×{v}" for k,v in verdicts.items()),
  "established (assert with confidence): " + "; ".join(d.get("established_traits_confirmed", [])[:2]),
  "one 'partial' flagged the model as more absolute than she is — limit tightened, per Phase 4.1",
]
out = {"headline": "Sanity check: on-record traits confirmed (the confident core)",
  "status": "complete", "support": support,
  "evidence": [{"type": "document", "path": "known_traits/known_traits.json", "title": "known_traits.json"}],
  "checkpoint": {"step_id": "known_traits"}}
print(json.dumps(out))
PY

cli step novel_inferences running --message "Phase 4.2 edge case: framework on unseen questions (hedged)" >/dev/null
mkdir -p "runs/$RUN/novel_inferences"; cp "$FIX/novel_inferences/novel_inferences.json" "runs/$RUN/novel_inferences/"
cli step novel_inferences done --asset novel_inferences.json \
  --message "novel inferences derived — hedged, falsifiable, kept separate from on-record" >/dev/null
python3 - "$RUN" <<'PY' | cli reply >/dev/null
import json, sys
d = json.load(open("runs/" + sys.argv[1] + "/novel_inferences/novel_inferences.json"))
probes = d.get("probes", [])
support = [
  d.get("generativity_check","generativity check"),
  "each inference: hedged, names the models used, states what would falsify it",
  "kept visibly separate from known_traits — an inference is never asserted as fact",
]
findings = [{"title": p["question"], "detail": p["inference"][:140] + "  [conf: " + str(p.get("confidence","")) + "]"} for p in probes[:2]]
out = {"headline": "Edge case: hedged novel inferences (the inferred layer)",
  "status": "complete", "support": support, "findings": findings,
  "note": d.get("disclaimer",""),
  "evidence": [{"type": "document", "path": "novel_inferences/novel_inferences.json", "title": "novel_inferences.json"}],
  "checkpoint": {"step_id": "novel_inferences"}}
print(json.dumps(out))
PY

# ── Build the persona skill (fan-in: framework + both validation lanes) — KEY ─
cli step persona_skill running --message "assembling the runnable persona SKILL.md (Phase 3, from the template)" >/dev/null
mkdir -p "runs/$RUN/persona_skill"; cp "$FIX/persona_skill/SKILL.md" "runs/$RUN/persona_skill/"
cli step persona_skill done --asset SKILL.md \
  --message "persona skill built: role rules, 4 models, 5 heuristics, voice, honest boundary" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "Runnable persona skill assembled — the deliverable",
  "status": "complete",
  "support": [
    "Fans in from the framework + both validation lanes (on-record core, hedged-inference layer)",
    "Built from the skill-template: role rules, identity card, models w/ limits, heuristics, expression DNA, timeline, values, lineage, honest boundary, sources",
    "Opens with a prominent FICTIONAL-subject disclaimer; on-record vs inferred kept visibly separate"
  ],
  "note": "Illustrative — the subject 'Mira Tan' is fictional and the source corpus is invented; this is not a real persona and characterizes no real person.",
  "evidence": [
    { "type": "document", "path": "persona_skill/SKILL.md", "title": "SKILL.md (runnable persona)" },
    { "type": "check", "label": "honest boundary present", "passed": true, "expected": ">=3 limits", "actual": "6 limits" }
  ],
  "checkpoint": { "step_id": "persona_skill" }
}
EOF

# ── Deliverable ──────────────────────────────────────────────────────────────
cli deliverable running --message "packaging the persona-skill deliverable" >/dev/null
cli deliverable done \
  --asset persona_skill/SKILL.md \
  --asset synthesize/framework.json \
  --asset triple_verify/verification.json \
  --asset known_traits/known_traits.json \
  --asset novel_inferences/novel_inferences.json \
  --message "Runnable persona skill for a FICTIONAL design mentor + the framework, verification, and two-sided validation behind it" >/dev/null

echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "Done. Trace folder: $TARGET"
echo "View: flowtrace serve  ->  http://localhost:3000/traces/$(basename "$TARGET")"
