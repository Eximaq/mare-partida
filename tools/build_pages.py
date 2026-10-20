"""Gera a pasta estática para hospedagem GitHub Pages, sem dados de desenvolvimento."""
from pathlib import Path
import shutil
import hashlib
import re

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist'
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
web_files = ['index.html', 'styles.css', 'ui-nautical.css', 'audio-system.css',
             'character-system.js', 'akuma-system.js', 'combat-animation.js', 'combat-assets.js',
             'faction-assets.js', 'faction-sprites.js', 'forge-system.js',
             'forge-ui.js', 'game.js', 'audio-system.js', 'island-assets.js', 'island-world.js',
             'world-system.js', 'ember-world.js', 'ember-renderer.js', 'archipelago.js', 'prison-system.js', 'haki-system.js', 'haki-ui.js', 'haki-art.js', 'achievement-system.js', 'ultimate-system.js', 'talent-system.js', 'talent-combat.js', 'talent-ui.js', 'dev-tools.js']
for f in web_files:
    if not (ROOT / f).is_file():
        raise SystemExit(f'Arquivo necessário ausente: {f}')
    shutil.copy2(ROOT/f, OUT/f)
# A new HTML document must never combine this release with cached older scripts.
# Content hashes change only when the referenced public file changes; saves are untouched.
def version_asset(match):
    relative = match.group(2)
    source = OUT / relative
    if relative not in web_files or source.suffix not in ('.js', '.css'):
        return match.group(0)
    version = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    return f'{match.group(1)}{relative}?v={version}{match.group(3)}'

entry = OUT / 'index.html'
html = entry.read_text(encoding='utf-8')
html = re.sub(r'((?:src|href)=")([^"?]+)(")', version_asset, html)
entry.write_text(html, encoding='utf-8')
for folder in ['assets', 'icones_menu_pirata']:
    if not (ROOT/folder).is_dir():
        raise SystemExit(f'Pasta necessária ausente: {folder}')
    shutil.copytree(ROOT/folder, OUT/folder)
# Apenas artes dos atlas realmente referenciadas no runtime.
art_paths = [
    'pixellab-pip-generations/ilha-porto-20261018/port-buildings.png',
    'pixellab-pip-generations/ilha-porto-20261018/ocean-sand.png',
    'pixellab-pip-generations/ilha-porto-20261018/sand-grass.png',
    'pixellab-pip-generations/porto-compacto-20261018/harbor-props.png',
]
for relative in art_paths:
    source = ROOT/relative
    if not source.is_file():
        raise SystemExit(f'Arte referenciada ausente: {relative}')
    dest = OUT/relative
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
(OUT/'.nojekyll').touch()
print(f'Site criado em: {OUT} (GitHub Pages, somente arquivos públicos)')
