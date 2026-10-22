"""Gera a pasta estática para hospedagem GitHub Pages, sem dados de desenvolvimento."""
from pathlib import Path
import shutil
import hashlib
import re
import json

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist'
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
web_files = ['index.html', 'journal-feed.json', 'ui-tokens.css', 'ui-components.css', 'ui-hud.css', 'hud-zoom-expedition.css', 'ui-screens.css', 'ui-responsive.css', 'ui-system.js', 'game-tooltips.css', 'player-hub.css', 'hierarchy.css', 'styles.css', 'ui-nautical.css', 'audio-system.css', 'character-menu.css', 'modes-menu.css', 'inventory-compact.css',
             'character-system.js', 'akuma-system.js', 'zoan-art.js', 'combat-animation.js', 'combat-registry.js', 'combat-assets.js', 'paper-doll.js', 'paper-doll-assets.js',
             'faction-assets.js', 'faction-sprites.js', 'forge-system.js',
             'forge-ui.js', 'game-tooltips.js', 'player-hub.js', 'hud-telemetry.js', 'hierarchy-system.js', 'hierarchy-ui.js', 'game.js', 'audio-system.js', 'island-assets.js', 'island-world.js', 'lobby-map-data.js', 'lobby-world.js',
             'dawn-map-data.js', 'dawn-world.js', 'dawn-renderer.js', 'rare-world.js', 'rare-renderer.js', 'new-islands-data.js', 'new-islands-objects.js', 'new-islands.js', 'monster-catalog.js', 'new-islands-art.js', 'pixellab-world-maps-data.js', 'pixellab-world-maps.js', 'world-system.js', 'orange-world.js', 'conchas-world.js', 'conchas-renderer.js', 'terrain-autotile.js', 'orange-terrain.js', 'orange-renderer.js', 'ember-world.js', 'ember-renderer.js', 'archipelago.js', 'prison-system.js', 'haki-system.js', 'haki-ui.js', 'haki-art.js', 'achievement-system.js', 'ultimate-system.js', 'talent-system.js', 'talent-combat.js', 'talent-ui.js', 'dev-tools.js', 'hunt-system.js']
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
idle_relative = Path('pixellab-pip-generations/paper-doll-human-idle-south-20261021')
idle_files = ['preview.html', 'review-pack.json', 'manifest.json', 'human-idle-south.blueprint.json',
              'body-input-64.png', 'look-reference-64.png', 'review-sheet.png',
              'body-idle-preview.gif', 'outfit-idle-preview.gif', 'draft-idle-preview.gif']
idle_files += [f'{slot}-idle-draft.png' for slot in ['body', 'hair', 'outfit', 'weapon']]
idle_files += [f'{kind}-raw-{index:02}.png' for kind in ['body', 'outfit'] for index in range(5)]
idle_files += [f'draft-composite-{index:02}.png' for index in range(1, 5)]
for name in idle_files:
    source = ROOT/idle_relative/name
    if not source.is_file():
        raise SystemExit(f'Arquivo do piloto Idle ausente: {name}')
    destination = OUT/idle_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
shutil.copy2(ROOT/'docs/PAPER-DOLL-IDLE-SUL.md', OUT/'docs/PAPER-DOLL-IDLE-SUL.md')
sword_relative = Path('pixellab-pip-generations/paper-doll-sword-fit-20261021')
sword_files = ['preview.html', 'review.json', 'manifest.json', 'sword-fit.blueprint.json',
               'body-idle-south.png', 'weapon-idle-south.png', 'old-weapon-idle.png',
               'sword-fit-preview.gif', 'comparison-sheet.png']
sword_files += [f'{kind}-{index:02}.png' for kind in ['body-source', 'weapon-raw', 'composite'] for index in range(1, 5)]
for name in sword_files:
    source = ROOT/sword_relative/name
    if not source.is_file():
        raise SystemExit(f'Arquivo do encaixe de espada ausente: {name}')
    destination = OUT/sword_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
shutil.copy2(ROOT/'docs/PAPER-DOLL-ESPADA.md', OUT/'docs/PAPER-DOLL-ESPADA.md')
# Diagnostic atlas: explicit allowlist keeps generation inputs and local scripts private.
batch_relative = Path('pixellab-pip-generations/paper-doll-layer-batch-20261021')
batch_files = ['preview.html', 'review.json', 'manifest.json', 'layer-batch.blueprint.json',
               'body-idle-south.png', 'weapon-idle-south.png', 'previous-weapon-idle.png',
               'weapon-raw.png', 'weapon-audit.json', 'weapon-batch-review.gif', 'comparison-sheet.png']
batch_files += [f'{kind}-{index:02}.png' for kind in ['body-source', 'composite'] for index in range(1, 5)]
for name in batch_files:
    source = ROOT/batch_relative/name
    if not source.is_file():
        raise SystemExit(f'Arquivo do diagnóstico de camadas ausente: {name}')
    destination = OUT/batch_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
shutil.copy2(ROOT/'docs/PAPER-DOLL-LOTE-CAMADAS.md', OUT/'docs/PAPER-DOLL-LOTE-CAMADAS.md')
rigid_relative = Path('pixellab-pip-generations/paper-doll-rigid-weapon-20261021')
rigid_files = ['preview.html', 'review.json', 'manifest.json', 'rigid-weapon.png',
               'body-idle-south.png', 'previous-weapon-idle.png', 'comparison-sheet.png', 'rigid-weapon-review.gif']
rigid_files += [f'composite-{index:02}.png' for index in range(1, 5)]
for name in rigid_files:
    destination = OUT/rigid_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/rigid_relative/name, destination)
shutil.copy2(ROOT/'docs/PAPER-DOLL-ARMA-RIGIDA.md', OUT/'docs/PAPER-DOLL-ARMA-RIGIDA.md')
modular_relative = Path('pixellab-pip-generations/paper-doll-hair-outfit-20261021')
modular_files = ['preview.html', 'review-pack.json', 'manifest.json', 'hair-outfit.blueprint.json',
                 'body-idle-south.png', 'hair-idle-south.png', 'outfit-idle-south.png', 'rigid-weapon.png',
                 'hair-raw.png', 'outfit-raw.png', 'hair-audit.json', 'outfit-audit.json',
                 'comparison-sheet.png', 'human-idle-review.gif']
modular_files += [f'composite-{index:02}.png' for index in range(1,5)]
for name in modular_files:
    destination = OUT/modular_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/modular_relative/name, destination)
shutil.copy2(ROOT/'docs/PAPER-DOLL-CABELO-ROUPA.md', OUT/'docs/PAPER-DOLL-CABELO-ROUPA.md')
expansion_relative = Path('pixellab-pip-generations/paper-doll-expansion-20261021')
expansion_files = ['preview.html', 'preview.js', 'motion-review.js', 'studies.json', 'walk-free-eight.png', 'body-south-input.png', 'review-pack.json', 'manifest.json',
                   'expansion.blueprint.json', 'body-idle.png', 'hair-idle.png', 'outfit-idle.png',
                   'idle-four-directions.png', 'comparison-native.png', 'assembly-audit.json',
                   'walk-south-all-nine.png', 'walk-template-eight.png', 'walk-minimax-eight.png', 'attack-south-eight.png']
expansion_files += [f'weapon-{d}.png' for d in ['south', 'north', 'west', 'east']]
for name in expansion_files:
    destination = OUT/expansion_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/expansion_relative/name, destination)
expansion_entry = OUT/expansion_relative/'preview.html'
def version_expansion(match):
    source = (expansion_entry.parent/match.group(2)).resolve()
    if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
        return match.group(0)
    version = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    return f'{match.group(1)}{match.group(2)}?v={version}{match.group(3)}'
expansion_entry.write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_expansion,
                                  expansion_entry.read_text(encoding='utf-8')), encoding='utf-8')
shutil.copy2(ROOT/'docs/PAPER-DOLL-EXPANSAO.md', OUT/'docs/PAPER-DOLL-EXPANSAO.md')
walk_relative = Path('pixellab-pip-generations/paper-doll-walk-fit-20261021')
walk_files = ['preview.html', 'preview.js', 'review-pack.json', 'manifest.json',
              'walk-fit.blueprint.json', 'body-walk.png', 'hair-walk.png', 'outfit-walk.png',
              'body-idle.png', 'hair-idle.png', 'outfit-idle.png', 'rigid-weapon.png',
              'walk-south.png', 'comparison-native.png', 'assembly-audit.json']
walk_files += [f'weapon-{d}.png' for d in ['south', 'north', 'west', 'east']]
for name in walk_files:
    destination = OUT/walk_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/walk_relative/name, destination)
walk_entry = OUT/walk_relative/'preview.html'
def version_walk(match):
    source = (walk_entry.parent/match.group(2)).resolve()
    if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
        return match.group(0)
    version = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    return f'{match.group(1)}{match.group(2)}?v={version}{match.group(3)}'
walk_entry.write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_walk,
                            walk_entry.read_text(encoding='utf-8')), encoding='utf-8')
shutil.copy2(ROOT/'docs/PAPER-DOLL-CAMINHADA.md', OUT/'docs/PAPER-DOLL-CAMINHADA.md')
north_relative = Path('pixellab-pip-generations/paper-doll-walk-north-20261021')
north_files = ['preview.html', 'preview.js', 'review-pack.json', 'manifest.json',
               'walk-north.blueprint.json', 'body-walk.png', 'hair-walk.png', 'outfit-walk.png',
               'body-idle.png', 'hair-idle.png', 'outfit-idle.png', 'rigid-weapon.png',
               'walk-north-body.png', 'walk-north-hair-draft.png', 'hair-north-draft.png', 'study-review.js', 'comparison-native.png', 'assembly-audit.json']
north_files += [f'weapon-{d}.png' for d in ['south', 'north', 'west', 'east']]
for name in north_files:
    destination = OUT/north_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/north_relative/name, destination)
north_entry = OUT/north_relative/'preview.html'
def version_north(match):
    source = (north_entry.parent/match.group(2)).resolve()
    if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
        return match.group(0)
    version = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    return f'{match.group(1)}{match.group(2)}?v={version}{match.group(3)}'
north_entry.write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_north,
                             north_entry.read_text(encoding='utf-8')), encoding='utf-8')
shutil.copy2(ROOT/'docs/PAPER-DOLL-CAMINHADA-NORTE.md', OUT/'docs/PAPER-DOLL-CAMINHADA-NORTE.md')
complete_relative = Path('pixellab-pip-generations/paper-doll-north-finish-20261021')
complete_files = ['preview.html', 'preview.js', 'review-pack.json', 'manifest.json',
                  'north-finish.blueprint.json', 'body-walk.png', 'hair-walk.png', 'outfit-walk.png',
                  'body-idle.png', 'hair-idle.png', 'outfit-idle.png', 'rigid-weapon.png',
                  'walk-north-sheet.png', 'walk-north.gif', 'assembly-audit.json']
complete_files += [f'weapon-{d}.png' for d in ['south', 'north', 'west', 'east']]
for name in complete_files:
    destination = OUT/complete_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/complete_relative/name, destination)
complete_entry = OUT/complete_relative/'preview.html'

def version_complete(match):
    source = (complete_entry.parent/match.group(2)).resolve()
    if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
        return match.group(0)
    version = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    return f'{match.group(1)}{match.group(2)}?v={version}{match.group(3)}'
complete_entry.write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_complete,
                                complete_entry.read_text(encoding='utf-8')), encoding='utf-8')
shutil.copy2(ROOT/'docs/PAPER-DOLL-NORTE-COMPLETO.md', OUT/'docs/PAPER-DOLL-NORTE-COMPLETO.md')
profiles_relative = Path('pixellab-pip-generations/paper-doll-walk-profiles-20261021')
profiles_files = ['preview.html', 'preview.js', 'review-pack.json', 'manifest.json',
                  'profiles.blueprint.json', 'body-walk.png', 'hair-walk.png', 'outfit-walk.png',
                  'body-idle.png', 'hair-idle.png', 'outfit-idle.png', 'rigid-weapon.png', 'assembly-audit.json']
profiles_files += [f'weapon-{d}.png' for d in ['south', 'north', 'west', 'east']]
profiles_files += [name for name in ['walk-west.gif', 'walk-east.gif', 'walk-views.gif',
                                    'walk-west-sheet.png', 'walk-east-sheet.png'] if (ROOT/profiles_relative/name).is_file()]
for name in profiles_files:
    destination = OUT/profiles_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/profiles_relative/name, destination)
profiles_entry = OUT/profiles_relative/'preview.html'

def version_profiles(match):
    source = (profiles_entry.parent/match.group(2)).resolve()
    if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
        return match.group(0)
    version = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    return f'{match.group(1)}{match.group(2)}?v={version}{match.group(3)}'
profiles_entry.write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_profiles,
                                profiles_entry.read_text(encoding='utf-8')), encoding='utf-8')
shutil.copy2(ROOT/'docs/PAPER-DOLL-CAMINHADAS-LATERAIS.md', OUT/'docs/PAPER-DOLL-CAMINHADAS-LATERAIS.md')
basic_relative = Path('pixellab-pip-generations/paper-doll-basic-sword-20261021')
basic_pack = json.loads((ROOT/basic_relative/'review-pack.json').read_text(encoding='utf-8'))
basic_files = {'preview.html', 'preview.js', 'review-pack.json', 'manifest.json',
               'basic-sword.blueprint.json', 'assembly-audit.json'}
for piece in basic_pack['pieces']:
    for clip in piece['animations'].values():
        basic_files.add(clip['url'])
        basic_files.update(source['url'] for source in clip.get('sources', {}).values())
for direction in basic_pack['coverage']['attack-sword']:
    basic_files.update([f'attack-{direction}.gif', f'attack-{direction}-sheet.png'])
for name in basic_files:
    if not re.fullmatch(r'[a-z0-9.-]+\.(?:png|gif|html|js|json)', name):
        raise ValueError('Unsafe Paper Doll public path: '+str(name))
    destination = OUT/basic_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/basic_relative/name, destination)
basic_entry = OUT/basic_relative/'preview.html'

def version_basic(match):
    source = (basic_entry.parent/match.group(2)).resolve()
    if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
        return match.group(0)
    version = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    return f'{match.group(1)}{match.group(2)}?v={version}{match.group(3)}'
basic_entry.write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_basic,
                             basic_entry.read_text(encoding='utf-8')), encoding='utf-8')
shutil.copy2(ROOT/'docs/PAPER-DOLL-ATAQUE-BASICO.md', OUT/'docs/PAPER-DOLL-ATAQUE-BASICO.md')
for study, recipe in [('paper-doll-bento-motion-20261021', 'bento-motion.blueprint.json'),
                      ('paper-doll-bento-skeleton-20261021', 'bento-skeleton.blueprint.json')]:
    motion_relative = Path('pixellab-pip-generations')/study
    motion_files = ['preview.html', 'preview.js', 'review.json', 'comparison.json', 'manifest.json',
                    recipe, 'assembly-audit.json', 'reference-bento-attack.png',
                    'neutral-body-reference.png', 'candidate-south.gif', 'candidate-south-sheet.png']
    motion_files += [f'{prefix}-south-{i:02}.png' for prefix in ('bento', 'body') for i in range(8)]
    if 'skeleton' in study:
        motion_files += ['review-pack.json', 'modular-south.gif', 'visible-pieces-south-sheet.png', 'visible-pieces-audit.json']
        motion_files += [f'visible-{slot}-south.png' for slot in ['hair', 'outfit', 'pants', 'boots', 'weapon']]
    for name in motion_files:
        destination = OUT/motion_relative/name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT/motion_relative/name, destination)
    motion_entry = OUT/motion_relative/'preview.html'
    def version_motion(match):
        source = (motion_entry.parent/match.group(2)).resolve()
        if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
            return match.group(0)
        return f'{match.group(1)}{match.group(2)}?v={hashlib.sha256(source.read_bytes()).hexdigest()[:16]}{match.group(3)}'
    motion_entry.write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_motion,
                                 motion_entry.read_text(encoding='utf-8')), encoding='utf-8')
shutil.copy2(ROOT/'docs/PAPER-DOLL-MOVIMENTO-BENTO.md', OUT/'docs/PAPER-DOLL-MOVIMENTO-BENTO.md')
directional_relative = Path('pixellab-pip-generations/paper-doll-bento-directions-20261021')
directional_files = ['preview.html', 'preview.js', 'review-pack.json', 'manifest.json', 'reviews.json',
                     'assembly-audit.json', 'directions.blueprint.json', 'reference-bento-attack.png',
                     'modular-south.gif', 'modular-west.gif']
directional_files += [f'{slot}-attack.png' for slot in ['body', 'pants', 'boots', 'outfit', 'hair', 'weapon']]
directional_files += [f'body-candidate-{d}.png' for d in ['south', 'north', 'west', 'east']]
for d in ['north', 'west', 'east']:
    directional_files += [f'body-{d}.gif', f'{d}/request.json', f'{d}/controls.json', f'{d}/manifest.json', f'{d}/neutral-reference.png']
    directional_files += [f'{d}/{prefix}-{i:02}.png' for prefix in ['body', 'bento'] for i in range(8)]
for name in directional_files:
    destination = OUT/directional_relative/name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/directional_relative/name, destination)
directional_entry = OUT/directional_relative/'preview.html'
def version_directional(match):
    source = (directional_entry.parent/match.group(2)).resolve()
    if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
        return match.group(0)
    return f'{match.group(1)}{match.group(2)}?v={hashlib.sha256(source.read_bytes()).hexdigest()[:16]}{match.group(3)}'
directional_entry.write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_directional,
                                  directional_entry.read_text(encoding='utf-8')), encoding='utf-8')
shutil.copy2(ROOT/'docs/PAPER-DOLL-DIRECOES-BENTO.md', OUT/'docs/PAPER-DOLL-DIRECOES-BENTO.md')
(OUT/'.nojekyll').touch()
print(f'Site criado em: {OUT} (GitHub Pages, somente arquivos públicos)')
