from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
js = (ROOT / "studio.js").read_text(encoding="utf-8")
css = (ROOT / "studio.css").read_text(encoding="utf-8")
nav = (ROOT.parent / "assets/js/site-navigation.js").read_text(encoding="utf-8")

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
    target = ((ROOT.parent / asset.lstrip("/")) if asset.startswith("/") else (ROOT / asset)).resolve()
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

if '/studio/' not in nav or "Engineering Studio" not in nav:
    raise SystemExit("Engineering Studio is missing from shared desktop/mobile navigation")

if 'href="./studio.css"' not in html or 'src="./studio.js"' not in html:
    raise SystemExit("Studio must use its relative local CSS and JavaScript assets")


consent_script = (ROOT.parent / "assets/js/site-consent.js").read_text(encoding="utf-8")
if "/assets/js/site-consent.js" not in parser.assets or "/assets/js/tier-analytics.js" not in parser.assets:
    raise SystemExit("Studio must load the shared consent manager and analytics tracker")
if "tiershift-analytics-consent" not in consent_script or "analytics_storage" not in consent_script:
    raise SystemExit("Shared consent manager must persist visitor choice and update GA4 consent")
if "send_page_view:false" not in html or "analytics_storage:'denied'" not in html:
    raise SystemExit("Studio must default GA4 analytics consent to denied and disable automatic page views")


# Architecture blueprint QA: every published reference design must be discoverable,
# carry SEO metadata, use the shared consent/navigation stack and link to Studio.
architecture_root = ROOT.parent / "architecture"
architecture_pages = [
    architecture_root / "index.html",
    architecture_root / "microsoft-fabric-medallion" / "index.html",
    architecture_root / "databricks-lakehouse" / "index.html",
    architecture_root / "enterprise-rag-ai-agent" / "index.html",
]
required_routes = [
    "/architecture/",
    "/architecture/microsoft-fabric-medallion/",
    "/architecture/databricks-lakehouse/",
    "/architecture/enterprise-rag-ai-agent/",
]
for page in architecture_pages:
    if not page.is_file():
        raise SystemExit(f"Missing architecture page: {page.relative_to(ROOT.parent)}")
    source = page.read_text(encoding="utf-8")
    parsed = PageParser()
    parsed.feed(source)
    if not re.search(r"<title>[^<]+</title>", source, re.I):
        raise SystemExit(f"Missing page title: {page}")
    if not re.search(r'<meta name="description" content="[^"]+"', source, re.I):
        raise SystemExit(f"Missing meta description: {page}")
    if not re.search(r'<link rel="canonical" href="https://thetiershift.com/architecture/', source, re.I):
        raise SystemExit(f"Missing canonical URL: {page}")
    for token in ("/assets/js/site-consent.js", "/assets/js/site-navigation.js", "/studio/"):
        if token not in source:
            raise SystemExit(f"Architecture page missing required integration {token}: {page}")
    if "application/ld+json" not in source:
        raise SystemExit(f"Missing structured data: {page}")
    if "ca-pub-2845295883834438" not in source:
        raise SystemExit(f"Missing configured AdSense publisher code: {page}")

if "/architecture/" not in nav:
    raise SystemExit("Architecture blueprint hub is missing from shared navigation")

sitemap_path = ROOT.parent / "sitemap.xml"
try:
    sitemap_root = ET.parse(sitemap_path).getroot()
except ET.ParseError as exc:
    raise SystemExit(f"Invalid sitemap XML: {exc}")
sitemap_urls = {node.text for node in sitemap_root.iter() if node.tag.endswith("loc")}
for route in required_routes:
    full_url = "https://thetiershift.com" + route
    if full_url not in sitemap_urls:
        raise SystemExit(f"Architecture route missing from sitemap: {full_url}")

print(f"Architecture QA passed: {len(architecture_pages)} pages, SEO metadata, structured data, shared consent/navigation, Studio CTAs and sitemap entries.")


# Project enquiry route QA: ensure the conversion path is discoverable and honest
contact_page = ROOT.parent / "contact" / "index.html"
if not contact_page.is_file():
    raise SystemExit("Missing project enquiry page")
contact_html = contact_page.read_text(encoding="utf-8")
for token in ('<title>Talk to TierShift', 'name="description"', 'id="projectBrief"', 'mailto:thetiershift@gmail.com', 'does not submit or store', '/assets/js/site-consent.js', '/assets/js/site-navigation.js'):
    if token not in contact_html:
        raise SystemExit(f"Project enquiry page missing required content: {token}")
if 'https://thetiershift.com/contact/' not in sitemap_urls:
    raise SystemExit("Project enquiry page missing from sitemap")
if 'href="/contact/"' not in nav:
    raise SystemExit("Shared navigation does not route to the project enquiry page")

print(f"Studio QA passed: {len(static_ids)} HTML ids, {len(catalog_ids)} components, {len(template_ids)} templates, {len(parser.assets)} local assets.")
