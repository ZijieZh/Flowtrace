#!/usr/bin/env bash
# talk-to-deck — lift a slide-deck skill into a trace, then run it once.
#
# This is the "Visible" worked example: a long, mostly-sequential creative SKILL.md pulled out
# of prose into 7 openable nodes. The source skill is:
#
#   歸藏 slide-deck skill (SKILL.md) — turns content into a styled single-file HTML "magazine"
#   deck, from op7418/guizang-ppt-skill, licensed AGPL-3.0.
#
# ⚠️ AGPL — WORKFLOW-ONLY LIFT. We lift ONLY the method (the stages + DAG topology) into our own
# STEP.md prose. We copy NO source file: no HTML/CSS templates, no theme blocks, no prompt text,
# no scripts. The deck renderer (template/scripts/render_deck.py), the deck's HTML/CSS, the social
# covers, and every template shipped here are our OWN original work. Same pattern as nvda-decision,
# whose typeset.py is ours, not the source's. (Note in trace.json + the deck + the covers.)
#
# Its real stages become a 7-node DAG:
#
#   intake (需求澄清)
#     → choose_style (Style A editorial vs B Swiss — 需求澄清's first question; the steer node)
#     → rhythm_table (规划主题节奏 / '先做主题节奏表')
#     → select_layouts (挑布局, layouts.md)   ∥   image_prompts (image-prompts.md — TEXT prompts only)
#     → assemble_deck (拷贝模板 + 填充内容 → our single-file HTML)
#     → self_validate (对照检查清单自检, checklist.md)
#     → social_cover (README 平台封面: 公众号 21:9 + 小红书 3:4 — terminal branch)
#
# Subject — "The Quiet Architecture of Slow Software" by Mara Vint at the fictional Cadence 2026 —
# is a FICTIONAL, illustrative talk. No real person's content. The deck ships placeholder blocks,
# not real images (image_prompts is prompts-only).
#
# No network, no heavy deps — every output is a JSON / HTML fixture, so the build is offline and
# deterministic. The deck is an authored, self-contained HTML fixture; an OPTIONAL pure-stdlib
# renderer (scripts/render_deck.py) can regenerate an equivalent file from the JSON.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"
FIX="$HERE/fixtures"
REQ="resources/request.md"
[[ -d "$FIX" ]] || { echo "missing fixtures dir: $FIX" >&2; exit 2; }

# ── Authoring: scaffold the trace one piece at a time ────────────────────────
init_empty
scaffold_deliverable
author_file resources/request.md "add input: the talk content + deck brief"
author_dir  scripts              "add scripts: our own (optional) pure-stdlib deck renderer"

for s in intake choose_style rhythm_table select_layouts image_prompts \
         assemble_deck self_validate social_cover; do
  author_step "$s"
done

# ── Orientation: read-side CLI surfaces ──────────────────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ────────────────────────────────────────────────────────────
RUN=$(cli run new --name "The Quiet Architecture of Slow Software → magazine deck" | tail -1)
cli run show --run "$RUN" >/dev/null

# helper: running → place fixture asset(s) → done → one (plain) reply
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

# ── Intake (root) ────────────────────────────────────────────────────────────
do_fixture intake "Brief — 15-min talk, ~9 slides, editorial lean, 5 must-keep phrases, no images" brief.json

# ── choose_style — the governing judgment (richer reply: shows the steer) ─────
cli step choose_style running --message "choosing the visual system from the brief" >/dev/null
mkdir -p "runs/$RUN/choose_style"; cp "$FIX/choose_style/style_decision.json" "runs/$RUN/choose_style/style_decision.json"
cli step choose_style done --asset style_decision.json \
  --message "Style A (editorial × e-ink) — argument in human voice, not a data deck; Swiss rejected" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Style A — editorial × e-ink (Swiss rejected, with reasons)",
  "status": "complete",
  "support": [
    "The talk is an argument in human voice — Style A's serif hierarchy + whitespace carry it better than a hard grid",
    "Only one numeric beat (the 40-vs-9 contrast) — not enough data density to want Swiss's KPI/grid machinery",
    "One ink accent (#1f3a5f) on warm paper becomes the single anchor reused by the deck and the social covers"
  ],
  "findings": [
    { "title": "the steer node", "detail": "Switch this to Style B and rhythm_table, select_layouts, assemble_deck (and the cover) all go stale — run `flowtrace show --downstream choose_style`." },
    { "title": "preset, not hex", "detail": "Picked one named theme preset per the skill's 'choose a preset, not a colour' rule; no custom palette invented." }
  ],
  "evidence": [
    { "type": "document", "path": "choose_style/style_decision.json", "title": "style_decision.json" },
    { "type": "check", "label": "exactly one style chosen with the other explicitly rejected", "passed": true, "expected": "A xor B", "actual": "A (B rejected)" }
  ],
  "note": "Illustrative — a fictional talk; the style call is shown as a judgment a reader could overrule.",
  "checkpoint": { "step_id": "choose_style" }
}
EOF

# ── rhythm_table — pace BEFORE layout ────────────────────────────────────────
do_fixture rhythm_table "Rhythm — 9 slides, heroes at 1/5/9, no 3+ same-theme run" rhythm.json

# ── select_layouts ∥ image_prompts (both depend only on the rhythm) ──────────
do_fixture select_layouts "Layouts — 8 registered Style-A layouts bound to slots (no invented structures)" layouts.json
do_fixture image_prompts  "Image prompts — 5 text-only prompts (NO generation); deck uses placeholders" image_prompts.json

# ── assemble_deck — the fan-in; OUR renderer emits the single-file HTML ───────
cli step assemble_deck running --message "assembling the single-file HTML deck (our renderer)" >/dev/null
mkdir -p "runs/$RUN/assemble_deck"; cp "$FIX/assemble_deck/deck.html" "runs/$RUN/assemble_deck/deck.html"
cli step assemble_deck done --asset deck.html \
  --message "deck.html — 9 self-contained slides, inline CSS, system fonts, placeholder blocks (no real images)" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Magazine deck assembled — one self-contained HTML file, 9 slides",
  "status": "complete",
  "support": [
    "Single file: inline <style>, system-font stacks, no <link>/CDN/web-font fetch — opens offline, renders with JS off",
    "Fan-in of select_layouts (slot bindings) + image_prompts (placeholder labels); every image slot is a CSS placeholder block, no <img>",
    "Theme rhythm honored: hero-dark / light / dark / light / hero-light / dark / light / dark / hero-dark"
  ],
  "findings": [
    { "title": "our own renderer", "detail": "Deck HTML/CSS is original; AGPL source — we lift only the workflow and ship our own renderer, no source files copied (cf. template/scripts/render_deck.py)." },
    { "title": "must-keep present", "detail": "'slowness is a design budget', the three named forces, and 'measure time-to-out-of-the-way' all appear verbatim." }
  ],
  "evidence": [
    { "type": "document", "path": "assemble_deck/deck.html", "title": "deck.html" },
    { "type": "check", "label": "self-contained (no external URL / CDN / web font)", "passed": true, "expected": 0, "actual": 0 },
    { "type": "check", "label": "real images embedded", "passed": true, "expected": 0, "actual": 0 }
  ],
  "note": "Illustrative deck for a fictional talk; AGPL source — workflow-only lift, our own renderer, no source files copied.",
  "checkpoint": { "step_id": "assemble_deck" }
}
EOF

# ── self_validate — audit the deck AS BUILT (richer reply: the checklist) ─────
cli step self_validate running --message "auditing deck.html against the checklist" >/dev/null
mkdir -p "runs/$RUN/self_validate"; cp "$FIX/self_validate/validation.json" "runs/$RUN/self_validate/validation.json"
cli step self_validate done --asset validation.json \
  --message "Self-check: 10/10 pass, 0 P0/P1 — ready" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Self-check passes — 10/10 items, 0 P0/P1 failures, deck ready",
  "status": "complete",
  "support": [
    "structure + theme_rhythm: 9 slides = budget; longest same-theme run = 1; 3 heroes (1/5/9)",
    "image_handling: every slot a placeholder block at a standard aspect (16:9 / 4:3); no <img>, no raw source ratios",
    "self_contained: no external URL/CDN/web-font; renders with JS disabled"
  ],
  "findings": [
    { "title": "must-keep verbatim", "detail": "All 5 required phrases found in the built HTML (s3 / s6 / s8)." },
    { "title": "steer would re-open it", "detail": "Switching choose_style to B re-opens typography_serif + single_accent (Swiss is sans-serif with its own rules) — this report would re-run." }
  ],
  "evidence": [
    { "type": "document", "path": "self_validate/validation.json", "title": "validation.json" },
    { "type": "check", "label": "P0/P1 checklist failures", "passed": true, "expected": 0, "actual": 0 },
    { "type": "check", "label": "must-keep phrases present in deck.html", "passed": true, "expected": 5, "actual": 5 }
  ],
  "checkpoint": { "step_id": "self_validate" }
}
EOF

# ── social_cover — terminal branch off the deck (richer reply) ────────────────
cli step social_cover running --message "deriving a matching social-cover pair from the deck's core message" >/dev/null
mkdir -p "runs/$RUN/social_cover"; cp "$FIX/social_cover/covers.html" "runs/$RUN/social_cover/covers.html"
cli step social_cover done --asset covers.html \
  --message "Cover pair — WeChat 21:9 + Xiaohongshu 3:4, same accent + type family, placeholder backgrounds" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "Matching social-cover pair — WeChat 21:9 + Xiaohongshu 3:4",
  "status": "complete",
  "support": [
    "Reuses the deck's single accent + serif/sans type family — the set reads as one family",
    "True platform aspect ratios held (21:9 banner, 3:4 portrait card); placeholder backgrounds, no real images",
    "Compresses the deck's existing hook ('slowness is a design budget') — no new argument"
  ],
  "evidence": [
    { "type": "document", "path": "social_cover/covers.html", "title": "covers.html" },
    { "type": "check", "label": "covers are a matched pair at platform ratios", "passed": true, "expected": "21:9 + 3:4", "actual": "21:9 + 3:4" }
  ],
  "note": "Illustrative covers for a fictional talk; our own renderer, no AGPL source files copied.",
  "checkpoint": { "step_id": "social_cover" }
}
EOF

# ── Deliverable ──────────────────────────────────────────────────────────────
cli deliverable running --message "packaging the deck + decisions + covers" >/dev/null
cli deliverable done \
  --asset assemble_deck/deck.html \
  --asset choose_style/style_decision.json \
  --asset rhythm_table/rhythm.json \
  --asset self_validate/validation.json \
  --asset social_cover/covers.html \
  --message "Magazine deck (9 slides, single-file HTML) + style/rhythm decisions + self-check + social covers" >/dev/null

echo
echo "=== final state ==="
"$BIN" run show --run "$RUN"
echo
echo "Deck: runs/$RUN/assemble_deck/deck.html"
echo "Done. Trace folder: $TARGET"
echo "View: trace serve  →  http://localhost:3000/traces/$(basename "$TARGET")"
