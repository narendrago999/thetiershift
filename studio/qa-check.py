from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
js = (ROOT / "studio.js").read_text(encoding="utf-8")
css = (ROOT / "studio.css").read_text(encoding="utf-8")

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.assets = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "script" and attrs.get("src"):
            self.assets.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.assets.append(attrs.get("href", ""))

parser = PageParser()
parser.feed(html)
duplicates = sorted({x for x in parser.ids if parser.ids.count(x) > 1})
if duplicates:
    raise SystemExit(f"Duplicate HTML ids: {duplicates}")

for asset in parser.assets:
    if asset.startswith(("http://", "https://", "//")):
        continue
    target = (ROOT / asset).resolve()
    if not target.is_file():
        raise SystemExit(f"Missing local asset: {asset}")

static_ids = set(parser.ids)
dynamic_ids = set(re.findall(r"""id=["']([A-Za-z][A-Za-z0-9_-]*)["']""", js))
referenced_ids = set(re.findall(r"""\$\(['"]#([A-Za-z][A-Za-z0-9_-]*)['"]\)""", js))
missing = sorted(referenced_ids - static_ids - dynamic_ids)
if missing:
    raise SystemExit(f"JavaScript references unknown element ids: {missing}")

catalog_block = js.split("const catalog=[", 1)[1].split("].map(x=>", 1)[0]
catalog_ids = set(re.findall(r"""^\['([^']+)'""", catalog_block, re.M))
if len(catalog_ids) < 40:
    raise SystemExit(f"Expected at least 40 catalogue components, found {len(catalog_ids)}")

template_block = js.split("const templates=[", 1)[1].split("\n];", 1)[0]
template_ids = re.findall(r"""\{id:'([^']+)'""", template_block)
if len(template_ids) != 6:
    raise SystemExit(f"Expected six starter templates, found {len(template_ids)}")
for match in re.finditer(r"""nodes:\[([^\]]+)\]""", template_block):
    component_ids = re.findall(r"""'([^']+)'""", match.group(1))
    unknown = sorted(set(component_ids) - catalog_ids)
    if unknown:
        raise SystemExit(f"Template references unknown components: {unknown}")

required = ["function portsCompatible", "function validate()", "function importProject", "function exportJSON", "function exportSVG", "function printBlueprint"]
for token in required:
    if token not in js:
        raise SystemExit(f"Missing expected Studio capability: {token}")

if 'href="./studio.css"' not in html or 'src="./studio.js"' not in html:
    raise SystemExit("Studio must use its relative local CSS and JavaScript assets")

print(f"Studio QA passed: {len(static_ids)} HTML ids, {len(catalog_ids)} components, {len(template_ids)} templates, {len(parser.assets)} local assets.")
