#!/usr/bin/env python3
"""typeset_report — render report.md (+ charts) into a FIXED-FORMAT research PDF.

The visual format (warm-parchment house style: ink-blue accent, serif headlines,
Inter labels, table + figure styling) is hard-coded in this file and the fonts are
bundled under resources/fonts/. The layout — cover, contents, one chapter per
report section, embedded charts, references — is generated deterministically from
the markdown, so any run on any ticker produces an identically-formatted note.

Renders with WeasyPrint if available; otherwise headless Chrome.

Usage:
    python3 scripts/typeset.py \
      --report runs/<RUN>/investment_report/report.md \
      --figures-dir runs/<RUN>/build_charts \
      --out runs/<RUN>/typeset_report/report.pdf
"""
from __future__ import annotations
import argparse, base64, html as _html, re, shutil, subprocess, sys, tempfile
from pathlib import Path
import markdown

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "resources" / "fonts"
BRAND = "FlowTrace"

# ── house style: warm-parchment design tokens, hard-coded ───────────────────
STYLE_CSS = """
__FACES__
@page { size: A4; margin: 20mm 22mm 22mm 22mm; background: #f5f4ed;
  @bottom-center { content: counter(page) "  \\00b7  __DOC_TITLE__";
    font-family: "Newsreader","Charter",Georgia,serif; font-size: 8.5pt; color: #87867f; } }
@page:first { @bottom-center { content: ""; } }
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --parchment:#f5f4ed; --ivory:#faf9f5; --near-black:#141413; --dark-warm:#3d3d3a;
  --charcoal:#4d4c48; --olive:#5e5d59; --stone:#87867f; --brand:#1B365D;
  --border:#e8e6dc; --border-soft:#e5e3d8; --tag-bg:#E4ECF5;
  --serif:"Newsreader","Charter",Georgia,"Times New Roman",serif;
  --sans:"Inter",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;
  --mono:"JetBrains Mono","SF Mono",Consolas,Monaco,monospace; }
html, body { background: var(--parchment); }
body { color: var(--near-black); font-family: var(--serif); font-size: 10.5pt; line-height: 1.55; }
.sans { font-family: var(--sans); }
.cover { min-height: 240mm; display: flex; flex-direction: column; justify-content: space-between; padding: 40mm 0 0 0; break-after: page; }
.cover-eyebrow { font-family: var(--sans); font-size: 10pt; color: var(--brand); letter-spacing: 2pt; text-transform: uppercase; font-weight: 500; margin-bottom: 18pt; }
.cover-title { font-size: 40pt; font-weight: 500; color: var(--near-black); line-height: 1.12; letter-spacing: -0.5pt; margin-bottom: 18pt; }
.cover-view { font-family: var(--sans); font-size: 13pt; font-weight: 600; color: var(--brand); margin-bottom: 12pt; }
.cover-points { font-family: var(--sans); font-size: 11.5pt; color: var(--olive); line-height: 1.5; list-style: none; max-width: 88%; }
.cover-points li { padding-left: 16pt; text-indent: -16pt; margin-bottom: 6pt; }
.cover-points li::before { content: "—"; color: var(--brand); font-weight: 600; padding-right: 8pt; }
.cover-meta { font-family: var(--sans); font-size: 10pt; color: var(--stone); line-height: 1.55; font-variant-numeric: tabular-nums; }
.cover-meta strong { color: var(--dark-warm); font-weight: 600; }
.toc { break-after: page; }
.toc h2 { font-size: 22pt; font-weight: 500; margin-bottom: 14pt; border-left: 2.5pt solid var(--brand); border-radius: 1.5pt; padding-left: 8pt; }
.toc-item { display: flex; justify-content: space-between; align-items: baseline; padding: 6pt 0; border-bottom: 0.3pt dotted var(--border); font-size: 11pt; }
.toc-num { color: var(--brand); font-weight: 500; min-width: 30pt; font-variant-numeric: tabular-nums; }
.toc-title { flex: 1; color: var(--near-black); padding-left: 6pt; }
h1 { font-size: 24pt; font-weight: 500; line-height: 1.15; letter-spacing: -0.3pt; margin: 0 0 10pt 0; border-left: 2.5pt solid var(--brand); border-radius: 1.5pt; padding-left: 8pt; color: var(--near-black); break-after: avoid; }
h2 { font-size: 15pt; font-weight: 500; line-height: 1.25; margin: 24pt 0 6pt 0; color: var(--near-black); break-after: avoid; }
h3 { font-size: 12pt; font-weight: 500; line-height: 1.3; margin: 18pt 0 4pt 0; color: var(--dark-warm); break-after: avoid; }
.chapter-num { font-family: var(--sans); font-size: 10pt; color: var(--brand); letter-spacing: 2pt; text-transform: uppercase; font-weight: 500; margin-bottom: 6pt; }
p { margin: 0 0 10pt 0; line-height: 1.55; color: var(--near-black); }
.lead { font-size: 12pt; line-height: 1.55; color: var(--dark-warm); margin-bottom: 14pt; }
.hl { color: var(--brand); font-weight: 500; }
ul, ol { margin: 6pt 0 10pt 0; padding-left: 20pt; line-height: 1.55; }
ul li::marker { color: var(--brand); }
ol li::marker { color: var(--brand); font-weight: 500; }
strong { color: var(--near-black); font-weight: 600; }
em { color: var(--olive); }
sup { color: var(--brand); font-size: 0.72em; font-family: var(--sans); }
blockquote { border-left: 2pt solid var(--brand); margin: 12pt 0; padding: 4pt 0 4pt 16pt; color: var(--olive); line-height: 1.55; break-inside: avoid; }
code { font-family: var(--mono); font-size: 9pt; background: var(--ivory); padding: 1pt 4pt; border-radius: 2pt; color: var(--dark-warm); }
pre { font-family: var(--mono); font-size: 8.5pt; line-height: 1.5; background: var(--ivory); border: 0.5pt solid var(--border-soft); border-radius: 4pt; padding: 10pt 14pt; margin: 10pt 0; white-space: pre-wrap; break-inside: avoid; }
pre code { background: transparent; padding: 0; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 12pt 0; break-inside: avoid; }
table th { text-align: left; font-family: var(--sans); font-weight: 500; color: var(--charcoal); padding: 6pt 8pt; border-bottom: 1pt solid var(--brand); background: var(--ivory); }
table td { padding: 5pt 8pt; border-bottom: 0.3pt solid var(--border-soft); vertical-align: top; }
.ratingblock table th { background: var(--brand); color: #fff; border-bottom: none; }
.ratingblock table td { font-size: 11pt; }
.callout { background: var(--ivory); border-left: 2pt solid var(--brand); padding: 10pt 14pt; border-radius: 3pt; margin: 12pt 0; line-height: 1.55; break-inside: avoid; }
figure { margin: 14pt 0; break-inside: avoid; text-align: center; }
figure img { max-width: 100%; border-radius: 4pt; }
figcaption { font-family: var(--sans); font-size: 9pt; color: var(--stone); margin-top: 6pt; text-align: center; }
ol.refs { font-size: 9.5pt; line-height: 1.5; color: var(--dark-warm); padding-left: 22pt; }
ol.refs li { margin-bottom: 7pt; }
.chapter { break-before: page; }
"""


def font_face(family, fname, weight):
    f = FONTS / fname
    if not f.exists():
        return ""
    uri = "data:font/woff2;base64," + base64.b64encode(f.read_bytes()).decode()
    return (f'@font-face{{font-family:"{family}";src:url("{uri}") format("woff2");'
            f'font-weight:{weight};font-style:normal;}}')


def style(doc_title: str) -> str:
    faces = "\n".join([
        font_face("Newsreader", "Newsreader.woff2", 400),
        font_face("Newsreader", "Newsreader.woff2", 500),
        font_face("Inter", "Inter.woff2", 400),
        font_face("Inter", "Inter-500.woff2", 500),
        font_face("Inter", "Inter-600.woff2", 600),
    ])
    return STYLE_CSS.replace("__FACES__", faces).replace("__DOC_TITLE__", _html.escape(doc_title))


def embed_figures(md_text: str, figures_dir: Path) -> str:
    def repl(m):
        alt, path = m.group(1), m.group(2)
        png = figures_dir / Path(path).name
        if not png.exists():
            return m.group(0)
        uri = "data:image/png;base64," + base64.b64encode(png.read_bytes()).decode()
        cap = f"<figcaption>{_html.escape(alt)}</figcaption>" if alt else ""
        return f'<figure><img alt="{_html.escape(alt)}" src="{uri}"/>{cap}</figure>'
    return re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", repl, md_text)


def superscript_cites(text: str) -> str:
    # turn inline [1] / [1,2] citation markers into superscripts
    return re.sub(r"\[(\d+(?:\s*,\s*\d+)*)\]", r"<sup>[\1]</sup>", text)


def md2html(text: str) -> str:
    # ensure a blank line before tight lists so "**Label**\n- item" bullets render
    out, prev = [], ""
    for ln in text.splitlines():
        if re.match(r"\s*[-*+] ", ln) and prev.strip() and not re.match(r"\s*[-*+] ", prev):
            out.append("")
        out.append(ln); prev = ln
    html = markdown.markdown("\n".join(out), extensions=["tables"])
    return superscript_cites(html)


def parse(md_text: str) -> dict:
    lines = md_text.splitlines()
    title_full = next((l[2:].strip() for l in lines if l.startswith("# ")), "Equity Research")
    company, _, tagline = title_full.partition(" — ")
    mast = next((l for l in lines if l.strip().startswith("**")), "")
    parts = [p.strip() for p in re.sub(r"[*`]", "", mast).split("·")]
    ticker = parts[0] if parts else ""
    date = parts[-1] if len(parts) > 1 else ""
    # house view line + its bullet points (for the cover)
    house_view, house_points, collecting = "", [], False
    for l in lines:
        s = l.strip()
        if s.lower().startswith("**house view"):
            house_view = re.sub(r"[*`]", "", s)
            house_view = re.sub(r"(?i)^house view\s*[—-]\s*", "", house_view).strip()
            collecting = True
            continue
        if collecting:
            if s.startswith("- "):
                pt = re.sub(r"\s*\[\d+(?:\s*,\s*\d+)*\]", "", s[2:]).strip()  # drop citations on cover
                house_points.append(pt)
            elif s == "":
                continue
            else:
                break
    body = "\n".join(l for l in lines if not l.startswith("# "))
    chunks = re.split(r"(?m)^## +", body)
    sections = []
    for ch in chunks[1:]:
        head, _, rest = ch.partition("\n")
        sections.append((head.strip(), rest.strip()))
    return {"company": company.strip(), "tagline": (tagline or "Equity Research").strip(),
            "ticker": ticker, "date": date, "house_view": house_view, "house_points": house_points,
            "preamble": chunks[0].strip(), "sections": sections}


def build_html(report: Path, figures_dir: Path) -> str:
    raw = embed_figures(report.read_text(), figures_dir)
    d = parse(raw)
    doc_title = f"{d['company']} · {d['tagline']}"
    eyebrow = f"{d['tagline']} · {d['ticker']}" if d['ticker'] else d['tagline']

    chapters = [("Rating & Executive Summary", d["preamble"], True)]
    chapters += [(t, c, False) for t, c in d["sections"]]

    pts = "".join(f"<li>{_html.escape(p)}</li>" for p in d["house_points"])
    cover = f"""<section class="cover">
  <div><div class="cover-eyebrow">{_html.escape(eyebrow)}</div>
  <div class="cover-title">{_html.escape(d['company'])}</div>
  <div class="cover-view">{_html.escape(d['house_view'])}</div>
  <ul class="cover-points">{pts}</ul></div>
  <div class="cover-meta"><strong>{BRAND}</strong> · nvda-decision<br>{_html.escape(d['date'])}</div>
</section>"""

    toc_items = "".join(
        f'<div class="toc-item"><span class="toc-num">{i:02d}</span>'
        f'<span class="toc-title">{_html.escape(t)}</span></div>'
        for i, (t, _, _) in enumerate(chapters, 1))
    toc = f'<section class="toc"><h2>Contents</h2>{toc_items}</section>'

    secs = []
    for i, (title, content, is_rating) in enumerate(chapters, 1):
        is_refs = title.lower().startswith("reference")
        inner = md2html(content)
        if is_rating:
            inner = f'<div class="ratingblock">{inner}</div>'
        if is_refs:  # render the bibliography as a numbered list, keep any trailing note
            items = re.findall(r"(?m)^\s*\d+\.\s+(.*)$", content)
            if items:
                tail = re.sub(r"(?m)^\s*\d+\.\s+.*$", "", content).replace("---", "").strip()
                inner = "<ol class='refs'>" + "".join(f"<li>{superscript_cites(md2html_inline(x))}</li>" for x in items) + "</ol>"
                if tail:
                    inner += md2html(tail)
        secs.append(
            f'<section class="chapter"><div class="chapter-num">{i:02d} · {_html.escape(title)}</div>'
            f'<h1>{_html.escape(title)}</h1>{inner}</section>')

    return (f"<!doctype html><html lang='en'><head><meta charset='utf-8'>"
            f"<title>{_html.escape(doc_title)}</title><style>{style(doc_title)}</style></head>"
            f"<body>{cover}{toc}{''.join(secs)}</body></html>")


def md2html_inline(text: str) -> str:
    h = markdown.markdown(text, extensions=[])
    return re.sub(r"^<p>|</p>$", "", h.strip())


def render_weasyprint(html: str, out: Path) -> bool:
    try:
        from weasyprint import HTML
    except Exception:
        return False
    try:
        HTML(string=html).write_pdf(str(out))
        return out.exists() and out.stat().st_size > 0
    except Exception as e:
        print(f"  weasyprint unavailable ({type(e).__name__}); trying Chrome", file=sys.stderr)
        return False


def find_chrome():
    cands = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
             "/Applications/Chromium.app/Contents/MacOS/Chromium"]
    for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"):
        w = shutil.which(n)
        if w:
            cands.append(w)
    return next((c for c in cands if Path(c).exists()), None)


def render_chrome(html: str, out: Path) -> bool:
    chrome = find_chrome()
    if not chrome:
        return False
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as tf:
        tf.write(html); html_path = tf.name
    subprocess.run([chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={out}", f"file://{html_path}"],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return out.exists() and out.stat().st_size > 0


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--report", required=True)
    p.add_argument("--figures-dir", required=True)
    p.add_argument("--out", required=True)
    a = p.parse_args()
    out = Path(a.out); out.parent.mkdir(parents=True, exist_ok=True)
    html = build_html(Path(a.report), Path(a.figures_dir))
    if render_weasyprint(html, out) or render_chrome(html, out):
        print(f"PDF written: {out} ({out.stat().st_size//1024} KB)")
    else:
        sys.exit("ERROR: no PDF engine. Install weasyprint (with native libs) or Google Chrome / Chromium.")


if __name__ == "__main__":
    main()
