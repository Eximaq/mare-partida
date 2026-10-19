"""Gera a pasta estática para hospedagem GitHub Pages, sem dados de desenvolvimento."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist'
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
web_files = ['index.html', 'styles.css', 'ui-nautical.css',
             'character-system.js', 'combat-animation.js', 'combat-assets.js',
             'faction-assets.js', 'faction-sprites.js', 'forge-system.js',
             'forge-ui.js', 'game.js', 'island-assets.js', 'island-world.js',
             'world-system.js']
for f in web_files:
    if not (ROOT / f).is_file():
        raise SystemExit(f'Arquivo necessário ausente: {f}')
    shutil.copy2(ROOT/f, OUT/f)
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
