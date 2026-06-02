"""Resolve [src_NNN] citation markers into proper citations and render to PDF.

Run with the working folder as the current working directory.
Reads synthesis.md and sources.json. Writes report.md and report.pdf.
"""

import json
import re
from pathlib import Path

from weasyprint import HTML, CSS
import markdown

HERE = Path(__file__).parent
WORKING = Path.cwd()

CITATION_STYLE = "numeric"  # "numeric" or "author_year"


def main():
    synthesis = (WORKING / "synthesis.md").read_text()
    sources = {s["id"]: s for s in json.loads((WORKING / "sources.json").read_text())}

    resolved_md, citation_order = resolve_citations(synthesis, sources)
    bibliography_md = render_bibliography(citation_order, sources)
    final_md = resolved_md + "\n\n## References\n\n" + bibliography_md

    md_path = WORKING / "report.md"
    md_path.write_text(final_md)

    html_body = markdown.markdown(final_md, extensions=["tables", "footnotes"])
    css = CSS(filename=str(HERE / "report.css"))
    pdf_path = WORKING / "report.pdf"
    HTML(string=html_body, base_url=str(WORKING)).write_pdf(
        str(pdf_path), stylesheets=[css]
    )

    print(f"wrote {md_path.name} and {pdf_path.name}")


def resolve_citations(text, sources):
    pattern = re.compile(r"\[(src_\d+)\]")
    citation_order = []
    seen = {}

    def replace(match):
        src_id = match.group(1)
        if src_id not in seen:
            seen[src_id] = len(citation_order) + 1
            citation_order.append(src_id)
        n = seen[src_id]
        if CITATION_STYLE == "numeric":
            return f"[{n}]"
        src = sources.get(src_id, {})
        first_author = (src.get("authors") or ["Unknown"])[0].split()[-1]
        year = (src.get("published") or "n.d.")[:4]
        return f"({first_author}, {year})"

    resolved = pattern.sub(replace, text)
    return resolved, citation_order


def render_bibliography(citation_order, sources):
    lines = []
    for i, src_id in enumerate(citation_order, start=1):
        src = sources.get(src_id, {})
        authors = ", ".join(src.get("authors") or ["Unknown"])
        title = src.get("title", "Untitled")
        published = src.get("published", "n.d.")
        locator = src.get("url_or_locator", "")
        lines.append(f"{i}. {authors}. *{title}*. {published}. {locator}")
    return "\n".join(lines)


if __name__ == "__main__":
    main()
