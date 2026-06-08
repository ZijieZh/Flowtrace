#!/usr/bin/env bash
# nvda-decision — lift a stock-analysis skill into a trace, then run it once.
#
# This is the worked example behind the README's "Make your own trace" section.
# The source skill is:
#
#   us-stock-analysis (SKILL.md) — comprehensive single-stock equity analysis
#   from tradermonty/claude-trading-skills, licensed MIT
#
# Its "Comprehensive Investment Report" workflow, composed with sibling skills in
# the same repo (position sizing, exposure, macro/news/sector, scenario synthesis),
# becomes a 16-node fan-in/fan-out DAG: four ingest lanes run in parallel and fan
# into a synthesized thesis; sizing + risk-controls chain off it; the report fans
# in from everything; then two presentation nodes render the charts and typeset a
# fixed-format research-note PDF (the format is enforced in scripts/typeset.py).
#
# The run replays a canonical NVDA decision (1y lookback, $100k book) from fixtures
# for the judgment lanes + real price data; the chart and PDF nodes run for real.
#
# Requires: python3 with pandas, numpy, matplotlib, pyarrow, markdown; and a PDF
# engine (WeasyPrint, else Google Chrome / Chromium). No network — price data ships
# as a fixture so the build is deterministic and offline.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"
FIX="$HERE/fixtures"

# ── Authoring: scaffold the trace one piece at a time ────────────────────────
init_empty

# init_empty writes only the trace shell; re-add the typed inputs (ticker /
# lookback / account_size) from the template before any from_inputs is validated.
python3 - "$HERE/template/trace.json" "$PWD/trace.json" <<'PY'
import json, sys
t = json.load(open(sys.argv[1])); live = json.load(open(sys.argv[2]))
live["inputs"] = t.get("inputs", {}); json.dump(live, open(sys.argv[2], "w"), indent=2)
PY
git add trace.json && cli_commit "add inputs: ticker / lookback / account_size"

scaffold_deliverable
author_file resources/request.md   "add input: the decision request"
author_dir  resources/fonts        "add bundled fonts for the house style"
author_dir  scripts                "add scripts: price_pack / make_charts / typeset"

for s in ingest_price ingest_fundamentals ingest_macro ingest_news \
         valuation business_quality technical_read entry_levels \
         industry_health catalysts_risks synthesize_thesis \
         position_sizing risk_controls investment_report \
         build_charts typeset_report; do
  author_step "$s"
done

# ── Orientation: read-side CLI surfaces ───────────────────────────────────────
cli validate >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ─────────────────────────────────────────────────────────────
RUN=$(cli run new --name "NVDA — should I buy? (1y, \$100k)" | tail -1)

# helper: running → place fixture asset(s) → done → one reply
do_fixture() {
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

# helper: like do_fixture but emits a custom RICH reply (figures + checks + findings)
rich_step() {
  local id=$1 head=$2 reply=$3; shift 3
  cli step "$id" running --message "working" >/dev/null
  local args=()
  for a in "$@"; do
    mkdir -p "runs/$RUN/$id"; cp "$FIX/$id/$a" "runs/$RUN/$id/$a"
    args+=(--asset "$a")
  done
  cli step "$id" done "${args[@]}" --message "$head" >/dev/null
  printf '%s' "$reply" | cli reply >/dev/null
}

# ── 4 parallel ingest roots ───────────────────────────────────────────────────
do_fixture ingest_price        "Price & indicators — last \$224.36, RSI 60" price_pack.json indicators.parquet
do_fixture ingest_fundamentals "Fundamentals — Tech/Semis, fwd P/E 17.7x"   fundamentals.json
do_fixture ingest_macro        "Macro — risk-on, late-cycle"                macro.json
do_fixture ingest_news         "News & calendar — next earnings ~late Aug"  news.json

# ── per-lane analysis ─────────────────────────────────────────────────────────
do_fixture valuation         "Valuation — 12-mo target \$304 (+35.5%)"  valuation.json
do_fixture business_quality  "Business quality A — wide moat"           business_quality.json
do_fixture technical_read    "Technical — uptrend, capped under \$236.54" technical.json
do_fixture industry_health   "Industry — AI/semis mid-to-late expansion" industry.json
do_fixture catalysts_risks   "Catalysts vs risks, dated"                catalysts_risks.json
do_fixture entry_levels      "Entry \$215-224, stop \$204.79 (2x ATR)"  entry_levels.json

# ── fan-in synthesis + decision chain ─────────────────────────────────────────
rich_step synthesize_thesis "Thesis: BUY" '{"headline":"BUY · medium conviction","status":"complete","takeaway":"4 of 5 lanes bullish; 12-mo target $304 (+35.5%)","findings":[{"title":"Valuation supportive","detail":"fwd P/E 17.7x; 12-mo target $304 vs ~$224 spot"},{"title":"Technicals constructive","detail":"uptrend, capped under resistance $236.54"},{"title":"Macro risk-on","detail":"late-cycle, supportive for semis"}],"evidence":[{"type":"check","label":"lanes bullish","passed":true,"expected":">= 3 / 5","actual":"4 / 5"},{"type":"check","label":"reward : risk","passed":true,"expected":">= 2 : 1","actual":"3.1 : 1"},{"type":"document","path":"synthesize_thesis/thesis.json","title":"thesis.json"}],"checkpoint":{"step_id":"synthesize_thesis"}}' thesis.json
# position_sizing: a first over-budget cut, then the final size (versioned step -> time-travel demo)
cli step position_sizing running --message "first cut at size" >/dev/null
mkdir -p "runs/$RUN/position_sizing"; cp "$FIX/position_sizing/position.json" "runs/$RUN/position_sizing/position.json"
cli step position_sizing done --asset position.json --message "Size v1: 50 shares (0.75% risk)" >/dev/null
printf '%s' '{"headline":"Size v1: 50 shares (over budget)","status":"complete","support":["50 shares = 0.75% account risk","exceeds the 0.6% per-trade budget"],"evidence":[{"type":"check","label":"risk per trade","passed":false,"expected":"<= 0.6%","actual":"0.75%"}],"checkpoint":{"step_id":"position_sizing"}}' | cli reply >/dev/null
rich_step position_sizing "Position" '{"headline":"Position · 45 shares","status":"complete","support":["$9,900 notional on a $100k book","0.68% account risk to the stop","sized off the 2x ATR entry band"],"evidence":[{"type":"check","label":"risk per trade","passed":true,"expected":"<= 1.0%","actual":"0.68%"},{"type":"check","label":"position weight","passed":true,"expected":"<= 15%","actual":"9.9%"},{"type":"document","path":"position_sizing/position.json","title":"position.json"}],"checkpoint":{"step_id":"position_sizing"}}' position.json
rich_step risk_controls "Risk" '{"headline":"Risk · stop $204.79","status":"complete","support":["hard stop at $204.79 (2x ATR)","portfolio heat 0.68%","exit on a close below the stop"],"evidence":[{"type":"check","label":"portfolio heat","passed":true,"expected":"<= 2%","actual":"0.68%"},{"type":"check","label":"stop distance","passed":true,"expected":"<= 10%","actual":"8.7%"},{"type":"document","path":"risk_controls/risk_controls.json","title":"risk_controls.json"}],"checkpoint":{"step_id":"risk_controls"}}' risk_controls.json
do_fixture investment_report "Investment report composed"               report.md

# ── presentation: charts + PDF run for real from the shipped scripts ──────────
cli step build_charts running --message "rendering charts" >/dev/null
python3 scripts/make_charts.py \
  --indicators   "runs/$RUN/ingest_price/indicators.parquet" \
  --price-pack   "runs/$RUN/ingest_price/price_pack.json" \
  --entry-levels "runs/$RUN/entry_levels/entry_levels.json" \
  --out-dir      "runs/$RUN/build_charts" >/dev/null
cli step build_charts done --asset price.png --asset rsi.png --asset macd.png --asset drawdown.png \
  --message "4 charts rendered (fixed style)" >/dev/null
printf '%s' '{"headline":"4 research charts","status":"complete","takeaway":"Trend, momentum and risk all line up — a constructive technical backdrop for the entry.","findings":[{"title":"Trend intact","detail":"price holds above MA20/50/200; the 52-week structure is higher-highs"},{"title":"Momentum healthy","detail":"RSI mid-range and MACD positive — room to run, not overbought"},{"title":"Drawdown contained","detail":"worst drawdown ~20% over the window, currently recovering"}],"support":["price vs MA20/50/200 + Bollinger bands","RSI, MACD and drawdown panels","stop and resistance lines overlaid"],"evidence":[{"type":"figure","path":"build_charts/price.png","caption":"price · moving averages · Bollinger bands"},{"type":"figure","path":"build_charts/rsi.png","caption":"RSI(14) — momentum"},{"type":"figure","path":"build_charts/macd.png","caption":"MACD(12,26,9)"},{"type":"figure","path":"build_charts/drawdown.png","caption":"underwater / drawdown"},{"type":"check","label":"trend + momentum aligned","passed":true,"actual":"yes"}],"checkpoint":{"step_id":"build_charts"}}' | cli reply >/dev/null

cli step typeset_report running --message "typesetting PDF" >/dev/null
python3 scripts/typeset.py \
  --report      "runs/$RUN/investment_report/report.md" \
  --figures-dir "runs/$RUN/build_charts" \
  --out         "runs/$RUN/typeset_report/report.pdf" >/dev/null
cli step typeset_report done --asset report.pdf --message "research note PDF (fixed format)" >/dev/null
printf '{"headline":"PDF typeset","status":"complete","evidence":[{"type":"document","path":"typeset_report/report.pdf","title":"report.pdf"}],"checkpoint":{"step_id":"typeset_report"}}' | cli reply >/dev/null

# ── Deliverable ───────────────────────────────────────────────────────────────
cli deliverable done \
  --asset typeset_report/report.pdf \
  --asset investment_report/report.md \
  --asset synthesize_thesis/thesis.json \
  --asset position_sizing/position.json \
  --asset risk_controls/risk_controls.json \
  --message "NVDA decision: BUY (Medium), 45 sh @ ~\$220, stop \$204.79, target \$304" >/dev/null

echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "Done. View: flowtrace serve  →  http://localhost:3000/traces/nvda-decision"
