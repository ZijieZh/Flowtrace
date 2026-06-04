#!/usr/bin/env bash
# saas-dd — lift a board of C-suite + compliance skills into ONE reusable trace, then run it.
#
# This is a worked COMPOSE example: the knowledge is in the arrows, and the trace `template/`
# (trace.json + the 16 STEP.md contracts) is INPUT-AGNOSTIC — the node definitions describe the
# METHOD only, never a particular company's answers. The run's company-specific answers live
# entirely in the replayed fixtures + request:
#
#   bash build.sh            # -> ~/traces/saas-dd
#
#   fixtures/<step>/<asset>              the run's numbers (fixtures SHOULD carry answers)
#   template/resources/request.md       the deal request
#
# The target — "Acme RevOps, Inc." — is a FICTIONAL placeholder; every figure and finding is
# illustrative and is not a claim about any real company.
#
# The source skills are from alirezarezvani/claude-skills (MIT):
#   finance/skills/financial-analyst            — DCF / ratios / forecasting
#   finance/skills/saas-metrics-coach           — ARR / NRR / GRR / CAC / Rule of 40
#   finance/business-investment-advisor/...     — NPV / IRR / hurdle / downside case
#   c-level-advisor/skills/{cfo,ceo,cto,cro,general-counsel}-advisor — the five lenses
#   c-level-advisor/c-level-agents/skills/{cfo,cro,cto,gc}-review    — the forcing-question verdicts
#   c-level-advisor/c-level-agents/skills/cross-eval                 — steelman / devil's-advocate
#   compliance-os/skills/{compliance-os,compliance-readiness,soc2-audit-prep} — the veto gate
#
# The DAG (~16 nodes): one intake root -> four parallel ingest lanes -> five C-suite lenses
# that run in PARALLEL (serial would let the CFO's framing contaminate the rest) -> a synergy
# roll-up -> a two-sided thesis (pro/contra) built BEFORE valuation so the price can't anchor
# the argument -> valuation -> a compliance gate that sits LAST but truly vetoes -> the IC memo.
#
# No network, no heavy deps — every output is a JSON/markdown fixture, so the build is offline
# and deterministic.
set -euo pipefail

RUN_NAME='Acme RevOps (a fictional company) — acquire? (go/no-go + price)'

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
cli_commit "add input: the acquisition request"

for s in intake \
         ingest_financials ingest_product ingest_market ingest_legal \
         lens_cfo lens_ceo lens_cto lens_cro lens_gc \
         synergy_model thesis_pro thesis_contra \
         valuation compliance_gate ic_memo; do
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

# A tiny helper to pull a one-line headline out of a fixture's own content, so the build
# narrates from the chosen target's fixtures and bakes in NO single run's answers itself.
# Usage: headline_from <step>/<asset.json> <field1> [field2 ...]
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

# do_fixture: running -> place fixture asset(s) -> done -> one (plain) reply.
# The done-message headline is derived from the FIRST asset's own fields when present.
do_fixture() {
  local id=$1; shift
  local -a hfields=()
  # optional: --head f1,f2 to choose which fixture fields form the headline
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

# A richer reply for the five lenses, surfacing each lens's OWN verdict + bottom line + a check,
# read straight from its fixture — so the compose story (do the five converge or diverge?) is
# visible without build.sh hardcoding any verdict.
do_lens() {
  local id=$1 asset=$2 running_msg=$3
  cli step "$id" running --message "$running_msg" >/dev/null
  mkdir -p "runs/$RUN/$id"; cp "$FIX/$id/$asset" "runs/$RUN/$id/$asset"
  local head; head=$(headline_from "$id/$asset" verdict bottom_line)
  [[ -z "$head" ]] && head="$id verdict"
  cli step "$id" done --asset "$asset" --message "$head" >/dev/null
  python3 - "$id" "$asset" "$RUN" <<'PY' | cli reply >/dev/null
import sys, json
sid, asset, run = sys.argv[1:4]
d = json.load(open(f"runs/{run}/{sid}/{asset}"))
lens = d.get("lens", sid)
verdict = str(d.get("verdict", "see review"))
support = []
for k in ("bottom_line",):
    if d.get(k): support.append(str(d[k]))
# pull a couple of skill-grounded supporting lines if present
for key in ("numbers", "retention_decomposition", "scaling_cliff", "six_questions"):
    v = d.get(key)
    if isinstance(v, dict):
        for kk, vv in v.items():
            if isinstance(vv, str) and ("read" in kk or kk.endswith("_read") or kk == "finding"):
                support.append(f"{kk}: {vv}");
        if len(support) >= 3: break
support = support[:3] or ["independent lens verdict — see review"]
conds = d.get("conditions") or d.get("outside_counsel_action_items") or []
findings = [{"title": "conditions", "detail": c} for c in conds[:2]]
out = {
  "headline": f"{lens} — {verdict}",
  "status": "complete",
  "support": support,
  "evidence": [{"type": "document", "path": f"{sid}/{asset}", "title": asset}],
  "checkpoint": {"step_id": sid},
}
if findings: out["findings"] = findings
basis = d.get("basis")
if isinstance(basis, str) and basis.upper().startswith("ILLUSTRATIVE"):
    out["note"] = basis
print(json.dumps(out))
PY
}

# ── Intake (root) ────────────────────────────────────────────────────────────
do_fixture intake --head target,ic_question deal_brief.json

# ── 4 parallel ingest lanes ──────────────────────────────────────────────────
do_fixture ingest_financials --head target financials.json
do_fixture ingest_product    --head target,product product_tech.json
do_fixture ingest_market     --head target market_gtm.json
do_fixture ingest_legal      --head assessment_status,target legal_pack.json

# ── 5 C-suite lenses, run in PARALLEL (no cross-pollination) ─────────────────
# Each surfaces its OWN verdict from its fixture: the five may converge or diverge by target.
do_lens lens_cfo cfo_review.json "CFO: the numerate skeptic"
do_lens lens_ceo ceo_review.json "CEO: the strategic allocator"
do_lens lens_cto cto_review.json "CTO: the architecture skeptic"
do_lens lens_cro cro_review.json "CRO: the pipeline-paranoid operator"
do_lens lens_gc  gc_review.json  "GC: the six forcing questions (not legal advice)"

# ── Synergy roll-up (fan-in over the operating lenses) ───────────────────────
do_fixture synergy_model --head purpose synergy_model.json

# ── Two-sided thesis, BEFORE valuation (cross-eval) ──────────────────────────
do_fixture thesis_pro    --head vote,confidence thesis_pro.json
do_fixture thesis_contra --head vote,confidence thesis_contra.json

# ── Valuation (after the thesis) ─────────────────────────────────────────────
do_fixture valuation --head the_number valuation.json

# ── Compliance gate — sits last, but VETOES ──────────────────────────────────
do_fixture compliance_gate --head verdict compliance_gate.json

# ── IC memo (fan-in: valuation + both thesis sides + gate) ────────────────────
cli step ic_memo running --message "composing the investment-committee memo" >/dev/null
mkdir -p "runs/$RUN/ic_memo"; cp "$FIX/ic_memo/ic_memo.md" "runs/$RUN/ic_memo/"
# Headline = the memo's own recommendation line (first table data row), target-agnostic.
MEMO_HEAD=$(python3 - "runs/$RUN/ic_memo/ic_memo.md" <<'PY'
import sys, re
text = open(sys.argv[1]).read()
# first markdown table data row whose first cell is bold (the recommendation row)
for line in text.splitlines():
    if line.strip().startswith("|") and "**" in line:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        cells = [re.sub(r"\*\*|\[|\]", "", c) for c in cells if c]
        if cells:
            print("IC memo — " + " · ".join(cells[:4])[:200]); break
PY
)
[[ -z "$MEMO_HEAD" ]] && MEMO_HEAD="IC memo composed"
cli step ic_memo done --asset ic_memo.md --message "$MEMO_HEAD" >/dev/null
python3 - "$RUN" "$MEMO_HEAD" <<'PY' | cli reply >/dev/null
import sys, json
run, head = sys.argv[1:3]
out = {"headline": head, "status": "complete",
  "support": ["Fans in from valuation + both thesis sides + the compliance gate",
              "Five lens votes shown side by side — convergence or divergence is itself the finding"],
  "evidence": [{"type": "document", "path": "ic_memo/ic_memo.md", "title": "ic_memo.md"}],
  "checkpoint": {"step_id": "ic_memo"}}
print(json.dumps(out))
PY

# ── Deliverable ──────────────────────────────────────────────────────────────
cli deliverable running --message "packaging the IC deliverable" >/dev/null
cli deliverable done \
  --asset ic_memo/ic_memo.md \
  --asset valuation/valuation.json \
  --asset thesis_pro/thesis_pro.json \
  --asset thesis_contra/thesis_contra.json \
  --asset compliance_gate/compliance_gate.json \
  --message "$MEMO_HEAD" >/dev/null

echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "Done. Trace folder: $TARGET"
echo "View: trace serve  ->  http://localhost:3000/traces/$(basename "$TARGET")"
