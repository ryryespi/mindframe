#!/usr/bin/env python3
"""Render the Gemini-Grok checkpoint paper to PDF. Use /workspace/.pdfenv/bin/python."""
from pathlib import Path
import re, markdown, sys
from weasyprint import HTML, CSS
sys.path.insert(0, "/workspace/crz-framework")
import render_crz

CSS_TEXT = render_crz.CSS_TEXT + """
h1 { font-size: 16.5pt; }
h1:not(:first-of-type) { break-before: page; }
div.protocol { break-inside: auto; page-break-inside: auto; }
div.protocol ul { margin: 0.15em 0 0.4em 1.15em; }
div.protocol li { margin: 0.08em 0; }
table { font-size: 8.5pt; }
code, code.path, a.url, a[href] {
  hyphens: none !important;
  -webkit-hyphens: none !important;
  overflow-wrap: anywhere;
  word-break: break-word;
}
code.path { font-size: 8.2pt; }
div.card-page { break-before: page; page-break-before: always; break-inside: avoid; page-break-inside: avoid; font-size: 9.2pt; }
div.card-page p { margin: 0.28em 0; }
p.card-foot { text-align: center; }
pre { font-size: 7.8pt; line-height: 1.25; white-space: pre; break-inside: avoid; page-break-inside: avoid; }
"""

R = Path(__file__).resolve().parent
name = "Checkpoint-v1.3"
title = "Checkpoint: Returning to the Living, v1.3"
raw = (R / f"{name}.md").read_text(encoding="utf-8")
raw = raw.replace(
    r"\(V(t) = V_0 e^{-\lambda t}\)",
    "<em>V</em>(<em>t</em>) = <em>V</em><sub>0</sub> <em>e</em><sup>−λ<em>t</em></sup>",
)
raw = raw.replace(r"\(v = 0\)", "<em>v</em> = 0")
raw = re.sub(r"^- \[ \] ", "- ☐ ", raw, flags=re.M)
body = markdown.markdown(
    raw,
    extensions=["tables", "fenced_code", "sane_lists", "smarty", "md_in_html"],
    output_format="html5",
)
body = re.sub(
    r'<ol start="(\d+)">',
    lambda m: f'<ol start="{m.group(1)}" style="counter-reset: list-item {int(m.group(1))-1}">',
    body,
)
html = f"<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'/><title>{title}</title></head><body>{body}</body></html>"
HTML(string=html, base_url=str(R)).write_pdf(str(R / f"{name}.pdf"), stylesheets=[CSS(string=CSS_TEXT)])
print("ok")
