"""Regenerate inline preview assets after editing SVGs or startup photos."""
from pathlib import Path
import base64
import json
import re

root = Path(__file__).resolve().parents[1]
page = root / "index.html"
source = page.read_text()
source = re.sub(r'\n<template id="model-(front|side|a45)">.*?</template>', "", source, flags=re.S)
source = re.sub(r'\n<script type="application/json" id="inline-photo-assets">.*?</script>', "", source, flags=re.S)
source = re.sub(r'\n<script id="customizer-app"[^>]*>.*?</script>', "", source, flags=re.S)
source = re.sub(r'  <script src="app.js[^"]*" defer></script>\n?', "", source)
source = re.sub(r'\n<script id="print-detail-app">.*?</script>', "", source, flags=re.S)
for name, tag in [("styles.css", "style"), ("preview-zoom.css", "style"), ("mobile-studio.css", "style"),
                  ("preview-zoom.js", "script"), ("mobile-studio.js", "script")]:
    identifier = "inline-" + name.replace(".", "-")
    replacement = f'<link rel="stylesheet" href="{name}">' if tag == "style" else f'<script src="{name}?v=startup" defer></script>'
    source = re.sub(r'<'+tag+r' id="'+identifier+r'">.*?</'+tag+r'>', lambda _: replacement, source, flags=re.S)
source = source.replace('  <script src="mobile-studio.js?', '<script id="print-detail-app">' + (root / "print-detail.js").read_text() + '</script>\n  <script src="mobile-studio.js?', 1)
models = []
for view in ("front", "side", "a45"):
    artwork = (root / f"{view}.svg").read_text()
    artwork = "\n".join(line.rstrip() for line in artwork.split("\n"))
    models.append(f'<template id="model-{view}">{artwork[artwork.index("<svg"):]}</template>')
# Generated lossless WebP previews retain all 56 IDs and avoid individual requests.
photos = json.loads((root / "assets/startup-previews.json").read_text())
inline = '\n'.join(models) + '\n<script type="application/json" id="inline-photo-assets">' + json.dumps(photos, separators=(',', ':')) + '</script>\n'
startup = '<script id="customizer-app" data-source="app.js?v=20261014-icons56">' + (root / "app.js").read_text() + '</script>\n'
source = source.replace('  <script src="preview-zoom.js?', inline + startup + '  <script src="preview-zoom.js?', 1)
for name, tag in [("styles.css", "style"), ("preview-zoom.css", "style"), ("mobile-studio.css", "style"),
                  ("preview-zoom.js", "script"), ("mobile-studio.js", "script")]:
    identifier = "inline-" + name.replace(".", "-")
    content = (root / name).read_text()
    if name == "styles.css":
        faces, rules = content.split(":root", 1)
        for font in ["BaksoSapi.otf", "Purple-Smile.otf"]:
            uri = "data:font/otf;base64," + base64.b64encode((root / "assets/fonts" / font).read_bytes()).decode()
            faces = faces.replace("assets/fonts/" + font, uri)
        for family in ["eYeFans GenSen Rounded", "eYeFans Tsuhsian", "eYeFans JinXuan Latte"]:
            rules = rules.replace('"'+family+'"', '"'+family+' UI"')
        content = faces + (root / "assets/ui-fonts.css").read_text() + "\n:root" + rules

    if tag == "style":
        pattern = r'<link rel="stylesheet" href="' + re.escape(name) + r'[^"]*">'
    else:
        pattern = r'<script src="' + re.escape(name) + r'[^"]*" defer></script>'
    source = re.sub(pattern, lambda _: f'<{tag} id="{identifier}">{content}</{tag}>', source)
source = re.sub(r'圖案顯示版本 20261014-png1(?:-fast1)*', '圖案顯示版本 20261014-png1-fast1', source)
page.write_text(source)
