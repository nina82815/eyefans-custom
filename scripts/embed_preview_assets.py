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
models = []
for view in ("front", "side", "a45"):
    artwork = (root / f"{view}.svg").read_text()
    artwork = "\n".join(line.rstrip() for line in artwork.split("\n"))
    models.append(f'<template id="model-{view}">{artwork[artwork.index("<svg"):]}</template>')
paths = list((root / "assets/photos/right-a45/normalized/masks/standard").glob("*.png"))
paths.append(root / "assets/photos/right-a45/normalized/gray/sakura-pink.png")
photos = {p.relative_to(root).as_posix(): "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode() for p in paths}
inline = '\n'.join(models) + '\n<script type="application/json" id="inline-photo-assets">' + json.dumps(photos, separators=(',', ':')) + '</script>\n'
startup = '<script id="customizer-app" data-source="app.js?v=20261014-icons56">' + (root / "app.js").read_text() + '</script>\n'
source = source.replace('  <script src="preview-zoom.js?', inline + startup + '  <script src="preview-zoom.js?', 1)
page.write_text(source)
