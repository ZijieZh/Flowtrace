#!/usr/bin/env python3
"""render_deck — assemble a single-file HTML magazine slide deck from the upstream JSON.

OUR OWN renderer. This is a workflow-only lift of op7418/guizang-ppt-skill (歸藏, AGPL-3.0):
we lift only the *workflow* (assemble a self-contained HTML deck from a rhythm table + per-section
layouts). The HTML, the CSS design tokens, and every template string below are original to this
repo — NO source file, template, theme block, prompt, or script from the AGPL skill is copied.

Pure standard library (json / argparse / html / pathlib) — no third-party deps, so the trace's
`environment.python` stays empty. The shipped fixture deck.html is the reference output; this
script is the OPTIONAL deterministic path that regenerates an equivalent self-contained file from
the trace's own JSON (style_decision + rhythm + layouts + image_prompts).

Single file out: inline <style>, system fonts, no network, no real images (CSS placeholder blocks).

Usage:
    python3 scripts/render_deck.py \
        --style       runs/<RUN>/choose_style/style_decision.json \
        --rhythm      runs/<RUN>/rhythm_table/rhythm.json \
        --layouts     runs/<RUN>/select_layouts/layouts.json \
        --prompts     runs/<RUN>/image_prompts/image_prompts.json \
        --out         runs/<RUN>/assemble_deck/deck.html
"""
from __future__ import annotations
import argparse
import html
import json
from pathlib import Path


# ── design tokens (ORIGINAL — Style A: warm paper + single ink accent) ──────────
def css(accent: str, paper: str, ink: str) -> str:
    return f"""
  :root{{
    --paper:{paper}; --paper-2:#efe9dc; --ink:{ink}; --ink-soft:#46433c; --muted:#7c776c;
    --accent:{accent}; --accent-soft:#33567f; --line:#d9d2c2;
    --dark:#1c1b18; --dark-2:#23211d; --on-dark:#f2ede1; --on-dark-soft:#bfb7a6;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Times New Roman",serif;
    --sans:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;
  }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  html,body{{background:var(--paper-2);color:var(--ink)}}
  body{{font-family:var(--serif);line-height:1.5;-webkit-font-smoothing:antialiased}}
  .deck{{scroll-snap-type:y mandatory;height:100vh;overflow-y:scroll}}
  .slide{{scroll-snap-align:start;position:relative;height:100vh;width:100%;
    display:flex;flex-direction:column;padding:6.2vh 7vw 7vh;overflow:hidden}}
  .light{{background:var(--paper);color:var(--ink)}}
  .dark{{background:var(--dark);color:var(--on-dark)}}
  .dark .kicker,.dark .meta{{color:var(--on-dark-soft)}}
  .dark .rule{{background:rgba(242,237,225,.22)}}
  .hero-dark{{background:radial-gradient(120% 120% at 80% 10%,var(--dark-2),var(--dark));color:var(--on-dark)}}
  .hero-light{{background:radial-gradient(120% 120% at 15% 0%,#fbf7ee,var(--paper));color:var(--ink)}}
  .chrome{{position:absolute;top:3.4vh;right:7vw;font-family:var(--sans);font-size:11px;
    letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}}
  .dark .chrome,.hero-dark .chrome{{color:var(--on-dark-soft)}}
  .chrome b{{font-weight:600;color:inherit}}
  .kicker{{font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.22em;
    text-transform:uppercase;color:var(--accent);margin-bottom:2.4vh}}
  .hero-dark .kicker{{color:#9fb6d6}}
  .rule{{width:46px;height:2px;background:var(--accent);border:0;margin:0 0 3vh}}
  h1{{font-weight:600;font-size:clamp(30px,5.2vw,72px);line-height:1.04;letter-spacing:-.01em}}
  h2{{font-weight:600;font-size:clamp(24px,3.6vw,46px);line-height:1.12}}
  .body{{font-size:clamp(16px,1.55vw,22px);color:var(--ink-soft);max-width:30ch;margin-top:2.4vh}}
  .dark .body{{color:var(--on-dark-soft)}}
  .meta{{font-family:var(--sans);font-size:13px;color:var(--muted)}}
  .ph{{position:relative;border:1px solid var(--line);border-radius:6px;display:flex;align-items:flex-end;
    overflow:hidden;background:repeating-linear-gradient(45deg,rgba(31,58,95,.06) 0 10px,rgba(31,58,95,.02) 10px 20px)}}
  .dark .ph{{border-color:rgba(242,237,225,.18);
    background:repeating-linear-gradient(45deg,rgba(242,237,225,.06) 0 10px,rgba(242,237,225,.02) 10px 20px)}}
  .ph::before{{content:"IMAGE PLACEHOLDER — no image embedded";position:absolute;top:10px;left:12px;
    font-family:var(--sans);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}}
  .ph .cap{{font-family:var(--sans);font-size:12px;color:var(--ink-soft);padding:10px 12px;
    background:rgba(245,241,232,.85);border-top:1px solid var(--line);width:100%}}
  .dark .ph .cap{{color:var(--on-dark-soft);background:rgba(28,27,24,.6);border-top-color:rgba(242,237,225,.18)}}
  .ratio{{font-variant-numeric:tabular-nums;color:var(--accent);font-weight:600}}
  .r-16x9{{aspect-ratio:16/9}} .r-4x3{{aspect-ratio:4/3}} .r-21x9{{aspect-ratio:21/9}}
  .cols{{display:grid;grid-template-columns:1.05fr .95fr;gap:5vw;align-items:center;flex:1 1 auto}}
  .quote{{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;max-width:20ch}}
  .quote .q{{font-size:clamp(30px,5vw,68px);font-weight:600;line-height:1.06}}
  .quote .q em{{font-style:italic;color:var(--accent-soft)}}
  .quote .src{{margin-top:3.4vh;font-size:clamp(15px,1.5vw,20px);color:var(--ink-soft);max-width:34ch}}
  .dark .quote .src{{color:var(--on-dark-soft)}}
  .stats{{display:grid;grid-template-columns:repeat(3,1fr);gap:4vw;flex:1 1 auto;align-items:center}}
  .stat .v{{font-size:clamp(48px,9vw,128px);font-weight:600;line-height:.9;color:var(--accent)}}
  .stat .l{{margin-top:1.6vh;font-family:var(--sans);font-size:14px;color:var(--ink-soft);max-width:18ch}}
  .statnote{{font-family:var(--sans);font-size:13px;color:var(--muted);margin-top:3vh}}
  .pipe{{display:grid;grid-template-columns:repeat(3,1fr);gap:3vw;flex:1 1 auto;align-items:stretch}}
  .step{{border-top:2px solid var(--accent);padding-top:2.4vh;display:flex;flex-direction:column}}
  .dark .step{{border-top-color:#9fb6d6}}
  .step .n{{font-family:var(--sans);font-size:12px;letter-spacing:.18em;color:var(--muted);margin-bottom:1.4vh}}
  .step .t{{font-size:clamp(20px,2.3vw,30px);font-weight:600;line-height:1.12}}
  .step .b{{margin-top:1.4vh;font-family:var(--sans);font-size:15px;color:var(--ink-soft)}}
  .dark .step .b{{color:var(--on-dark-soft)}}
  .vs{{display:grid;grid-template-columns:1fr 1fr;gap:4vw;flex:1 1 auto;align-items:center}}
  .vs .side .lab{{font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.18em;
    text-transform:uppercase;margin-bottom:1.6vh}}
  .vs .side.bad .lab{{color:var(--muted)}} .vs .side.good .lab{{color:var(--accent)}}
  .vs .side .txt{{font-size:clamp(20px,2.5vw,32px);font-weight:600;line-height:1.14;max-width:18ch}}
  .vs .side.bad .txt{{color:var(--muted);font-weight:400}}
  .cover{{height:100vh;display:grid;grid-template-rows:auto 1fr auto;padding:6.2vh 7vw 7vh}}
  .cover .top{{font-family:var(--sans);font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#9fb6d6}}
  .cover .mid{{display:flex;flex-direction:column;justify-content:center}}
  .cover h1{{max-width:16ch}}
  .cover .sub{{margin-top:3.2vh;font-size:clamp(17px,2vw,26px);color:var(--on-dark-soft);max-width:30ch;line-height:1.4}}
  .cover .foot{{display:flex;justify-content:space-between;align-items:flex-end;font-family:var(--sans);
    font-size:13px;color:var(--on-dark-soft)}}
  .closing{{height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:6.2vh 7vw}}
  .closing .q{{font-size:clamp(30px,5.4vw,76px);font-weight:600;line-height:1.05;max-width:18ch}}
  .closing .meta{{margin-top:4vh}}
  .disc{{position:absolute;left:7vw;bottom:2.6vh;font-family:var(--sans);font-size:10.5px;color:#7f8aa0;max-width:60ch}}
  @media print{{ .deck{{height:auto;overflow:visible}} .slide{{height:100vh;page-break-after:always}} }}
"""


RATIO_CLASS = {"16:9": "r-16x9", "4:3": "r-4x3", "21:9": "r-21x9", "16:10": "r-16x9"}


def esc(x) -> str:
    return html.escape(str(x), quote=True)


def placeholder(slot: dict | None, prompts_by_slot: dict) -> str:
    if not slot:
        return ""
    sid = slot.get("id", "")
    aspect = slot.get("aspect", "16:9")
    cls = RATIO_CLASS.get(aspect, "r-16x9")
    label = prompts_by_slot.get(sid, {}).get("placeholder", sid or "image slot")
    return (f'<div class="ph {cls}" aria-hidden="true"><span class="cap">{esc(label)} '
            f'&nbsp;·&nbsp; <span class="ratio">{esc(aspect)}</span></span></div>')


def render_slide(row: dict, lay: dict, prompts_by_slot: dict, total: int) -> str:
    n = row["n"]
    theme = row["theme"]
    layout = lay.get("layout", "")
    s = lay.get("slots", {})
    img = placeholder(lay.get("image_slot"), prompts_by_slot)
    chrome = f'<div class="chrome"><b>{n:02d}</b> / {total:02d}</div>'

    # cover (开场封面)
    if row["role"] == "cover" or "开场封面" in layout:
        disc = ('Illustrative example — a fictional talk by a fictional speaker. Deck rendered by '
                "talk-to-deck's own renderer (workflow-only lift of 歸藏 / op7418/guizang-ppt-skill, "
                'AGPL-3.0; no source files copied).')
        return (f'<section class="slide hero-dark cover" id="s{n}">{chrome}'
                f'<div class="top">{esc(s.get("meta",""))}</div>'
                f'<div class="mid"><h1>{esc(s.get("title",""))}</h1>'
                f'<p class="sub">{esc(s.get("subtitle",""))}</p></div>'
                f'{img}'
                f'<div class="foot"><span>{esc(s.get("speaker","") or "")}</span><span>A talk in six beats</span></div>'
                f'<div class="disc">{esc(disc)}</div></section>')

    # closing (悬念收束 / hero question)
    if row["role"] == "closing" or "悬念收束" in layout:
        return (f'<section class="slide hero-dark closing" id="s{n}">{chrome}'
                f'<div class="q">{esc(s.get("question",""))}</div>'
                f'<div class="meta">{esc(s.get("meta",""))}</div></section>')

    # big quote (大引用页)
    if "大引用页" in layout:
        q = esc(s.get("quote", ""))
        # emphasize the 'slowness is a design budget' phrase if present (cosmetic only;
        # wrap the WHOLE phrase so it stays a contiguous text run for must-keep checks).
        for phrase in ("Slowness is a design budget", "slowness is a design budget"):
            if phrase in q:
                q = q.replace(phrase, f"<em>{phrase}</em>")
                break
        return (f'<section class="slide {theme}" id="s{n}">{chrome}'
                f'<div class="kicker">{esc(s.get("kicker","The claim"))}</div><hr class="rule">'
                f'<div class="quote"><div class="q">{q}</div>'
                f'<div class="src">{esc(s.get("attribution",""))}</div></div></section>')

    # big numbers grid (数据大字报)
    if "数据大字报" in layout:
        cells = "".join(
            f'<div class="stat"><div class="v">{esc(st.get("value",""))}</div>'
            f'<div class="l">{esc(st.get("label",""))}</div></div>'
            for st in s.get("stats", []))
        return (f'<section class="slide {theme}" id="s{n}">{chrome}'
                f'<div class="kicker">{esc(s.get("kicker",""))}</div><hr class="rule">'
                f'<div class="stats">{cells}</div>'
                f'<p class="statnote">{esc(s.get("note",""))}</p></section>')

    # pipeline (两列流水线) — the named forces
    if "两列流水线" in layout:
        steps = "".join(
            f'<div class="step"><div class="n">FORCE {i+1:02d}</div>'
            f'<div class="t">{esc(st.get("title",""))}</div>'
            f'<div class="b">{esc(st.get("body",""))}</div></div>'
            for i, st in enumerate(s.get("steps", [])))
        return (f'<section class="slide {theme}" id="s{n}">{chrome}'
                f'<div class="kicker">{esc(s.get("kicker",""))}</div><hr class="rule">'
                f'<div class="pipe">{steps}</div></section>')

    # before/after (并列对比)
    if "并列对比" in layout:
        left, right = s.get("left", {}), s.get("right", {})
        return (f'<section class="slide {theme}" id="s{n}">{chrome}'
                f'<div class="kicker">{esc(s.get("kicker",""))}</div><hr class="rule">'
                f'<div class="vs">'
                f'<div class="side bad"><div class="lab">{esc(left.get("label","Not this"))}</div>'
                f'<div class="txt">{esc(left.get("text",""))}</div></div>'
                f'<div class="side good"><div class="lab">{esc(right.get("label","This"))}</div>'
                f'<div class="txt">{esc(right.get("text",""))}</div></div></div></section>')

    # two-column text+image (左文右图 / 图文混排) — default
    return (f'<section class="slide {theme}" id="s{n}">{chrome}'
            f'<div class="cols"><div>'
            f'<div class="kicker">{esc(s.get("kicker",""))}</div><hr class="rule">'
            f'<h2>{esc(s.get("headline",""))}</h2>'
            f'<p class="body">{esc(s.get("body",""))}</p></div>'
            f'{img or ""}</div></section>')


SCRIPT = """
  (function(){
    var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    if(!slides.length) return; var cur=0;
    function go(i){ i=Math.max(0,Math.min(slides.length-1,i)); slides[i].scrollIntoView({behavior:'smooth'}); cur=i; }
    document.addEventListener('keydown',function(e){
      if(['ArrowDown','ArrowRight',' ','PageDown'].indexOf(e.key)>=0){e.preventDefault();go(cur+1);}
      else if(['ArrowUp','ArrowLeft','PageUp'].indexOf(e.key)>=0){e.preventDefault();go(cur-1);}
      else if(e.key==='Home'){e.preventDefault();go(0);} else if(e.key==='End'){e.preventDefault();go(slides.length-1);}
    });
    var deck=document.querySelector('.deck');
    deck.addEventListener('scroll',function(){cur=Math.round(deck.scrollTop/window.innerHeight);},{passive:true});
  })();
"""


def build(style: dict, rhythm: dict, layouts: dict, prompts: dict) -> str:
    accent = style.get("accent", "#1f3a5f")
    paper = style.get("paper", "#f5f1e8")
    ink = style.get("ink", "#1c1b18")
    title = ""
    lay_by_n = {l["n"]: l for l in layouts.get("slides", [])}
    prompts_by_slot = {p["slot"]: p for p in prompts.get("prompts", [])}
    rows = rhythm.get("slides", [])
    total = len(rows)

    # pull deck title from the cover layout's title slot
    for l in layouts.get("slides", []):
        if "开场封面" in l.get("layout", ""):
            title = l.get("slots", {}).get("title", "")
            break

    slides_html = "\n".join(
        render_slide(row, lay_by_n.get(row["n"], {}), prompts_by_slot, total)
        for row in rows)

    head_comment = (
        "<!--\n  talk-to-deck deck.html — generated by render_deck.py (OUR OWN renderer).\n"
        "  Single-file, self-contained: inline CSS, system fonts, no external deps, no real images.\n"
        "  Workflow-only lift of op7418/guizang-ppt-skill (歸藏, AGPL-3.0); NO source files copied.\n"
        "  Illustrative example: a fictional talk.\n-->")

    return (f"<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            f"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
            f"<title>{esc(title)} — slide deck</title>\n{head_comment}\n"
            f"<style>{css(accent, paper, ink)}</style>\n</head>\n<body>\n"
            f"<main class=\"deck\">\n{slides_html}\n</main>\n"
            f"<script>{SCRIPT}</script>\n</body>\n</html>\n")


def main() -> None:
    ap = argparse.ArgumentParser(description="Render a single-file HTML magazine deck (our own renderer).")
    ap.add_argument("--style", required=True)
    ap.add_argument("--rhythm", required=True)
    ap.add_argument("--layouts", required=True)
    ap.add_argument("--prompts", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    style = json.loads(Path(a.style).read_text())
    rhythm = json.loads(Path(a.rhythm).read_text())
    layouts = json.loads(Path(a.layouts).read_text())
    prompts = json.loads(Path(a.prompts).read_text())
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(style, rhythm, layouts, prompts))
    print(f"deck written: {out} ({out.stat().st_size // 1024} KB, {len(rhythm.get('slides', []))} slides)")


if __name__ == "__main__":
    main()
