#!/usr/bin/env python3
"""Render the Box 4 paper. Run with /workspace/.pdfenv/bin/python."""
from pathlib import Path
import re, markdown, sys
from weasyprint import HTML, CSS
sys.path.insert(0, "/workspace/crz-framework")
import render_crz
CSS_TEXT = render_crz.CSS_TEXT + """
h1 { font-size: 17pt; }
h2 { break-after: avoid; }
table { font-size: 8.4pt; }
code, a[href] { hyphens: none !important; overflow-wrap: anywhere; word-break: break-word; }
pre { font-size: 7.6pt; line-height: 1.25; white-space: pre; break-inside: avoid; page-break-inside: avoid; }
p.figure { text-align: center; break-inside: avoid; }
div.card-page { break-before: page; page-break-before: always; break-inside: avoid; page-break-inside: avoid; font-size: 8.6pt; border: 1.2pt solid #555; padding: 8pt 11pt; }
div.card-page p { margin: 0.25em 0; }
p.protocol-title { font-size: 13pt; font-weight: bold; text-align: center; margin-bottom: 0.2em; }
p.card-foot { text-align: center; }
p.dedication { text-align: center; }
"""
R = Path(__file__).resolve().parent
name = "Box4-Fourth-Box-Research"
raw = (R / f"{name}.md").read_text(encoding="utf-8")
body = markdown.markdown(raw, extensions=["tables", "fenced_code", "sane_lists", "smarty", "md_in_html"], output_format="html5")
body = re.sub(r'<ol start="(\d+)">', lambda m: f'<ol start="{m.group(1)}" style="counter-reset: list-item {int(m.group(1))-1}">', body)
body = re.sub(r'(?<!href=")(https?://[^\s<)"]+?)([.,;]?)(?=[\s<])', lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>{m.group(2)}', body)
html = f"<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'/><title>The Fourth Box</title></head><body>{body}</body></html>"
(R / f"{name}.html").write_text(html, encoding="utf-8")
HTML(string=html, base_url=str(R)).write_pdf(str(R / f"{name}.pdf"), stylesheets=[CSS(string=CSS_TEXT)])
print("ok")
