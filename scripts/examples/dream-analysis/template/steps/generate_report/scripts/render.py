"""Render dream_analysis.json into a Markdown report and a PDF.

Run with the working folder as the current working directory.
Reads dream_analysis.json (and optionally dream_image.png).
Writes dream_report.md and dream_report.pdf.
Appends an entry to dream_history.json (creating it if absent).
"""

import json
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Template
from weasyprint import HTML, CSS

HERE = Path(__file__).parent
WORKING = Path.cwd()


def main():
    analysis_path = WORKING / "dream_analysis.json"
    if not analysis_path.exists():
        raise SystemExit(f"missing {analysis_path}")

    analysis = json.loads(analysis_path.read_text())
    image_path = WORKING / "dream_image.png"
    has_image = image_path.exists() and image_path.stat().st_size > 0

    # Render Markdown via Jinja
    template_text = (HERE / "template.md.j2").read_text()
    md = Template(template_text).render(
        analysis=analysis,
        has_image=has_image,
        image_filename=image_path.name if has_image else None,
    )
    md_path = WORKING / "dream_report.md"
    md_path.write_text(md)

    # Render PDF via WeasyPrint
    css = CSS(filename=str(HERE / "report.css"))
    html_body = markdown_to_html(md)
    pdf_path = WORKING / "dream_report.pdf"
    HTML(string=html_body, base_url=str(WORKING)).write_pdf(
        str(pdf_path), stylesheets=[css]
    )

    append_to_history(analysis)
    print(f"wrote {md_path.name} and {pdf_path.name}")


def markdown_to_html(md_text):
    import markdown
    return markdown.markdown(md_text, extensions=["tables", "fenced_code"])


def append_to_history(analysis):
    history_path = WORKING / "dream_history.json"
    if history_path.exists():
        history = json.loads(history_path.read_text())
    else:
        history = []
    history.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dream_title": analysis.get("dream_title"),
        "dream_type": analysis.get("dream_type"),
        "emotion_intensity": analysis.get("emotion_intensity"),
        "key_symbols": [s.get("symbol") for s in analysis.get("key_symbols", [])],
    })
    history_path.write_text(json.dumps(history, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
