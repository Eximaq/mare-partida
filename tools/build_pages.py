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
web_files = ['index.html', 'journal-feed.json', 'ui-tokens.css', 'ui-components.css', 'ui-hud.css', 'hud-zoom-expedition.css', 'ui-screens.css', 'ui-responsive.css', 'ui-system.js', 'game-tooltips.css', 'player-hub.css', 'styles.css', 'ui-nautical.css', 'audio-system.css', 'character-menu.css', 'modes-menu.css', 'inventory-compact.css',
             'character-system.js', 'akuma-system.js', 'zoan-art.js', 'combat-animation.js', 'combat-registry.js', 'combat-assets.js', 'paper-doll.js', 'paper-doll-assets.js',
             'faction-assets.js', 'faction-sprites.js', 'forge-system.js',
             'forge-ui.js', 'game-tooltips.js', 'player-hub.js', 'hud-telemetry.js', 'game.js', 'audio-system.js', 'island-assets.js', 'island-world.js',
             'dawn-map-data.js', 'dawn-world.js', 'dawn-renderer.js', 'rare-world.js', 'rare-renderer.js', 'new-islands-data.js', 'new-islands-objects.js', 'new-islands.js', 'monster-catalog.js', 'new-islands-art.js', 'world-system.js', 'orange-world.js', 'conchas-world.js', 'conchas-renderer.js', 'terrain-autotile.js', 'orange-terrain.js', 'orange-renderer.js', 'ember-world.js', 'ember-renderer.js', 'archipelago.js', 'prison-system.js', 'haki-system.js', 'haki-ui.js', 'haki-art.js', 'achievement-system.js', 'ultimate-system.js', 'talent-system.js', 'talent-combat.js', 'talent-ui.js', 'dev-tools.js', 'hunt-system.js']
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
# The inspection workbench is static and deliberately contains no local Python tools.
inspector = OUT/'tools/paper-doll-inspector'
inspector.mkdir(parents=True, exist_ok=True)
for name in ['index.html', 'inspector.css', 'inspector.js']:
    shutil.copy2(ROOT/'tools/paper-doll-inspector'/name, inspector/name)
def version_inspector(match):
    source = (inspector/match.group(2)).resolve()
    if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
        return match.group(0)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    return f'{match.group(1)}{match.group(2)}?v={digest}{match.group(3)}'
inspector_html = (inspector/'index.html').read_text(encoding='utf-8')
(inspector/'index.html').write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_inspector, inspector_html), encoding='utf-8')
(OUT/'docs').mkdir(exist_ok=True)
shutil.copy2(ROOT/'docs/PAPER-DOLL.md', OUT/'docs/PAPER-DOLL.md')
# Explicit review-page allowlist; do not distribute the generation archive or Python tools.
pilot_relative = Path('pixellab-pip-generations/paper-doll-human-pilot-20261020')
pilot_files = ['preview.html', 'static-look.json', 'manifest.json', 'human-static-pilot.blueprint.json',
               'reference-south-idle-00.png', 'body-south-00.png', 'body-face-south-00.png',
               'body-face-fit-draft.png', 'combined-masked-inspection.png']
for piece in ['hair', 'outfit', 'sword']:
    pilot_files.extend([f'{piece}-composite-south-00.png', f'{piece}-masked-inspection-layer.png',
                        f'{piece}-mask-proposed.png'])
for name in pilot_files:
    source = ROOT/pilot_relative/name
    if not source.is_file():
        raise SystemExit(f'Arquivo da prévia Paper Doll ausente: {name}')
    destination = OUT/pilot_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
shutil.copy2(ROOT/'docs/PAPER-DOLL-PILOTO.md', OUT/'docs/PAPER-DOLL-PILOTO.md')
(OUT/'.nojekyll').touch()
print(f'Site criado em: {OUT} (GitHub Pages, somente arquivos públicos)')
