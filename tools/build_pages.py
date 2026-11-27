"""Gera a pasta estática para hospedagem GitHub Pages, sem dados de desenvolvimento."""
from pathlib import Path
import shutil
import hashlib
import re
import json
import argparse
from build_portal import version_portal_assets
from player96_release import DATA as PLAYER96_DATA, MODULES as PLAYER96_MODULES, verify_release
from materialize_native_indexes import materialize

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--include-reviews", action="store_true", help="Also export isolated historical art workbenches")
parser.add_argument('--static-demo', action='store_true', help='Build the standalone demo without optional development APIs')
parser.add_argument('--renderer-fixture', action='store_true', help='Use a small install catalog for isolated renderer tests that intercept asset requests')
args = parser.parse_args()
if args.renderer_fixture and args.static_demo:
    parser.error('The public Pages demo requires the complete installation catalog.')
include_reviews = args.include_reviews
ROOT = Path(__file__).resolve().parent.parent
materialize(ROOT)
player96_release = verify_release()
OUT = ROOT / 'dist'
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
web_files = ['index.html', 'ui-preview.html', 'ui-art-direction.css', 'visual-completo.js', 'visual-completo-renderer.js', 'item-catalog.js', 'journal-feed.json', 'ui-tokens.css', 'ui-components.css', 'ui-finishing.css', 'nautical-windows.css', 'ui-nautical-assets.css', 'ui-hud.css', 'hud-zoom-expedition.css', 'ui-screens.css', 'ui-responsive.css', 'ui-system.js', 'operation-summary.js', 'acquisition-notices.js', 'game-tooltips.css', 'player-hub.css', 'creation-selection.css', 'creation-selection.js', 'gameplay-harmony.css', 'hud-nautical.css', 'captain-hd.css', 'hierarchy.css', 'styles.css', 'ui-nautical.css', 'audio-system.css', 'character-menu.css', 'modes-menu.css', 'inventory-compact.css', 'inventory-reference.css', 'forge-reference.css', 'character-status-nautical.css',
             'inventory-batch.js', 'attribute-rules.js', 'character-system.js', 'character-catalog.js', 'bounty-system.js', 'akuma-passives.js','rank-c-data.js','rank-c-system.js','rank-c-expansion-data.js','rank-c-expansion.js','rank-b-data.js','rank-b-system.js','hoya-data.js','hoya-system.js','jiki-data.js','jiki-system.js','ryu-data.js','ryu-system.js','combat-action-policy.js', 'akuma-system.js', 'neko-system.js', 'ushi-rules.js', 'ushi-art-data.js', 'ushi-system.js', 'doru-data.js', 'doru-system.js', 'wolf-data.js', 'wolf-system.js', 'supa-art.js', 'zoan-art.js', 'zoan-transition-data.js', 'zoan-transition.js', 'combat-animation.js', 'combat-registry.js', 'combat-assets.js', 'paper-doll.js', 'paper-doll-assets.js', 'paper-doll-review.js',
             'faction-assets.js', 'faction-sprites.js', 'forge-system.js',
             'forge-ui.js', 'game-tooltips.js', 'player-hub.js', 'hud-telemetry.js', 'notification-system.js', 'hierarchy-system.js', 'hierarchy-ui.js', 'combat-vfx-data.js', 'combat-vfx.js', 'class-weapon-vfx.js', 'item-art.js', 'contract-system.js', 'contracts-board.js', 'game.js', 'audio-system.js', 'island-assets.js', 'island-world.js', 'lobby-map-data.js', 'lobby-world.js', 'impel-down-world.js', 'alabasta-map-data.js', 'alabasta-world.js', 'alubarna-map-data.js', 'alubarna-world.js', 'skypiea-map-data.js', 'skypiea-world.js', 'ambient-weather.js',
              'dawn-map-data.js', 'dawn-world.js', 'dawn-renderer.js', 'rare-world.js', 'rare-renderer.js', 'new-islands-data.js', 'new-islands-objects.js', 'new-islands.js', 'monster-catalog.js', 'monster-game-catalog.js', 'new-islands-art.js', 'pixellab-world-maps-data.js', 'conchas-pixellab-data.js', 'conchas-structures.js', 'pixellab-world-maps.js', 'world-system.js', 'world-depth.js', 'orange-world.js', 'conchas-world.js', 'conchas-renderer.js', 'terrain-autotile.js', 'orange-terrain.js', 'orange-renderer.js', 'ember-world.js', 'ember-renderer.js', 'archipelago.js', 'prison-system.js', 'haki-progression.js', 'haki-mastery.css', 'haki-system.js', 'haki-ui.js', 'haki-art.js', 'achievement-system.js', 'achievement-ui.js', 'honors-hd.css', 'ultimate-system.js', 'talent-system.js', 'talent-combat.js', 'talent-ui.js', 'talents-hd.css', 'compendium-ui.js', 'compendium-hd.css', 'voyage-ui.js', 'voyage-hd.css', 'dev-tools.js', 'hunt-system.js', 'monster-behavior.js']
web_files += ['party-ui.js','party.css','crew-flag.js','crew-ui.js','crew-ui.css','social-ui.js','social-ui.css','market-online-ui.js','market-online-ui.css','map-player-hud.js','hud-glass.css']
web_files += ['world-map-exports-data.js','loguetown-map-data.js','arlong-map-data.js','baratie-map-data.js','loguetown-world.js','arlong-world.js','baratie-world.js','world-map-exports.js','quest-dungeons-data.js','quest-dungeons-world.js','boss-dungeon-system.js','boss-dungeon-combat.js','dungeon-boss-art-data.js','boss-dungeon-ui.js','save-writer.js','boss-dungeons.css']
web_files += ['rank-a-data.js', 'rank-a-expansion.js', 'rank-a-system.js', 'character-appearance.js', 'character-studio.js', 'character-studio.css', 'headgear-visibility.js', 'player-rework-runtime.js', 'player-rework-hair-anatomy-hd.js', 'player-rework-skin-hd.js', 'player-rework-base-hd.js', 'player-rework-hd-assets.js', 'player-rework-weapon-native-hd.js', 'player-rework-female-equipment-hd.js', 'player-rework-eye-styles-hd.js', 'player-rework-female-named-hair-hd.js', 'player-rework-native-hd.js', 'player-rework-default-hd.js', 'player-rework-outfit-carry-overlay-hd.js', 'player-rework-outfit-overlay-hd.js', 'player-rework-weapon-carry-hd.js', 'player-rework-modular-outfits-hd.js', 'player-rework-head-family.js', 'native-head-compat.js', 'player-rework-original-hair-helmets-hd.js', 'player-rework-test.js', 'player-rework-zip.js', 'player-rework-weapons.js', 'player-rework-accessory-pilot.js', 'player-rework-accessory-test.js', 'paper-doll-96-lobby.js', 'paper-doll-look-data.js', 'paper-doll-look.js', 'paper-doll-coverage.js', 'paper-doll-look.css', 'sprite-combat-v2-data.js', 'sprite-combat-v2.js', 'cp9-monsters.js', 'cp9-sprites.js', 'ui-navigator.css', 'character-hud.js', 'rank-s-data.js', 'rank-s-system.js', 'rank-s-rework-data.js', 'rank-s-rework.js', 'paramecia-rework-data.js', 'paramecia-rework-manifest.js', 'jiki-assembly-art.js']
web_files += ['sword-compendium.js','sword-compendium-ui.js','sword-compendium-ui.css','daily-sword-arena-data.js','sword-event-art.js']
web_files += ['weekly-boss-ui.js','weekly-boss-ui.css','akainu-art-data.js','akainu-art.js']
web_files += ['thriller-monsters.js','thriller-sprites.js']
web_files += ['enies-lobby-map-data.js','enies-lobby-world.js','enies-dungeon-art.js']
web_files += ['late-archipelago-map-data.js','late-archipelago-world.js','sabaody-dungeon-art.js']
web_files += ['sabaody-monsters.js','sabaody-sprites.js','sabaody-rendering.js']
web_files += ['marineford-monsters.js','marineford-sprites.js']
web_files += ['prepared-dungeon-bosses.js','prepared-dungeon-boss-art-data.js','prepared-dungeon-boss-fx.js']
web_files += ['daily-sword-boss-art-data.js', 'daily-sword-boss-combat.js']
review_scripts = ('player-rework-test.js', 'player-rework-weapons.js')
if include_reviews:
    web_files += ['daily-sword-boss-preview.html', 'daily-sword-boss-preview.js',
                  'daily-sword-boss-preview.css', 'daily-sword-boss-specials.json']
else:
    web_files = [name for name in web_files if name not in review_scripts]
from export_sword0_checkpoint import materialize as materialize_sword_checkpoint
materialize_sword_checkpoint(ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18',
                             OUT/'tools/rework-sword0-checkpoint')
web_files.extend(['hd-position.js', 'hd-position-approved.json', 'bancada-hd.html', 'bancada-hd.js', 'bancada-hd.css', 'player-rework-sword0-checkpoint.js', 'game-loading.js', 'game-loading.css', 'game-content-worker.js'])
from export_firearm113_coat import materialize as materialize_firearm113_coat
materialize_firearm113_coat(
    ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18/fuzil113-ns.zip',
    ROOT/'tools/rework-firearm113-coat/masks',
    OUT/'tools/rework-firearm113-coat')

from export_combat_wardrobe import materialize as materialize_combat_wardrobe
materialize_combat_wardrobe(ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18',
                            OUT/'tools/rework-combat-wardrobe')
from export_female_dagger_wardrobe import materialize as materialize_dagger_wardrobe
materialize_dagger_wardrobe(ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18',
                            OUT/'tools/rework-female-dagger-wardrobe')

if not include_reviews:
    retired_scripts = {"paper-doll.js", "paper-doll-assets.js", "paper-doll-review.js", "paper-doll-look-data.js", "paper-doll-look.js", "paper-doll-coverage.js", "paper-doll-look.css"}
    web_files = [name for name in web_files if name not in retired_scripts]
for f in web_files:
    if not (ROOT / f).is_file():
        raise SystemExit(f'Arquivo necessário ausente: {f}')
    shutil.copy2(ROOT/f, OUT/f)
# Public portal uses the same cache protection as the dedicated Cloudflare build.
shutil.copytree(ROOT/'portal', OUT/'portal')
version_portal_assets(OUT/'portal')
# A new HTML document must never combine this release with cached older scripts.
# Content hashes change only when the referenced public file changes; saves are untouched.
asset_versions = {}

def version_asset(match):
    relative = match.group(2)
    source = OUT / relative
    if relative not in web_files or source.suffix not in ('.js', '.css'):
        return match.group(0)
    if relative not in asset_versions:
        digest = hashlib.sha256(source.read_bytes())
        if relative == 'sprite-combat-v2.js':
            digest.update((ROOT / 'sprite-combat-v2-data.js').read_bytes())
            digest.update((ROOT / 'dungeon-boss-art-data.js').read_bytes())
            for image in sorted((ROOT / 'assets/sprites-combat-v2').rglob('*.png')):
                digest.update(image.relative_to(ROOT).as_posix().encode() + b'\0' + image.read_bytes())
        asset_versions[relative] = digest.hexdigest()[:16]
    version = asset_versions[relative]
    return f'{match.group(1)}{relative}?v={version}{match.group(3)}'

for page in ['index.html', 'ui-preview.html', 'bancada-hd.html']:
    entry = OUT / page
    html = entry.read_text(encoding='utf-8')
    if not include_reviews:
        for name in review_scripts:
            html = html.replace(f'  <script defer src="{name}"></script>\n', '')
    if args.static_demo:
        html = html.replace('<html ', '<html data-runtime="static-demo" ', 1)
    html = re.sub(r'((?:src|href)=")([^"?]+)(")', version_asset, html)
    entry.write_text(html, encoding='utf-8')
for folder in ['assets', 'icones_menu_pirata']:
    if not (ROOT/folder).is_dir():
        raise SystemExit(f'Pasta necessária ausente: {folder}')
    # Original generation sheets are development inputs, never runtime crops.
    generation_inputs = {
        'assets/ui/contracts-hd/family-source.png', 'assets/ui/contracts-hd/pilot-source.png',
        'assets/ui/forge-hd/icons-source.png', 'assets/ui/inventory-final/controls-source.png',
        'assets/ui/inventory-final/icons-source.png', 'assets/ui/inventory-hd/controls-v2-source.png',
        'assets/ui/inventory-hd/frame-v2-source.png', 'assets/ui/inventory-hd/source-kit.png',
    }
    # These old faction sheets and empty paper-doll manifests have no game
    # consumers. Keep source/history, and export only for explicit reviews.
    retired_player_paths = {'assets/sprites', 'assets/paper-doll'}
    # The animated installation screen no longer requests these source illustrations.
    retired_loading_paths = {'assets/ui/loading-art'}
    # Cocox now draws from the directional V2 sheets. The import inputs remain in source.
    retired_monster_inputs = {f'assets/rare-animals/cocox/{pose}.png' for pose in ('idle', 'run', 'attack')}
    def ignore_generation_inputs(directory, names):
        excluded = generation_inputs | retired_player_paths | retired_loading_paths | retired_monster_inputs
        return [name for name in names if (Path(directory)/name).relative_to(ROOT).as_posix() in excluded]
    ignored = None if include_reviews or folder != 'assets' else ignore_generation_inputs
    shutil.copytree(ROOT/folder, OUT/folder, ignore=ignored)
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
# Current documentation is published even without the historical workbenches.
(OUT/"docs").mkdir(exist_ok=True)
# Historical workbenches stay available explicitly; current player assets follow below.
if include_reviews:
    from build_review_pages import copy_review_pages
    copy_review_pages(ROOT, OUT)

# Approved 96px design, isolated modular-motion review. No raw generation data.
shutil.copy2(ROOT/'docs/PAPER-DOLL-96-PERSONALIZACAO.md', OUT/'docs/PAPER-DOLL-96-PERSONALIZACAO.md')
shutil.copy2(ROOT/'docs/PAPER-DOLL-96-FIT-CONTRACT.md', OUT/'docs/PAPER-DOLL-96-FIT-CONTRACT.md')
review96 = Path('tools/paper-doll-96-v3')
review96_pack = json.loads((ROOT/review96/'manifest.json').read_text(encoding='utf-8'))
assert review96_pack['productionEnabled'] is False
review96_files = {'index.html', 'preview.css', 'preview.js', 'headgear-editor.js', 'rig.js', 'layers.js', 'motion.js', 'surface.js', 'torso.js', 'fit-template.json', 'appearance.js', 'wardrobe.js', 'appearance-catalog.json', 'appearance-rig.json', 'manifest.json', 'gallery-items.json', 'weapons.js', 'weapons.json', 'player-pack.json'}
appearance96_pack = json.loads((ROOT/review96/'appearance-catalog.json').read_text(encoding='utf-8'))
assert appearance96_pack['productionEnabled'] is False
for animations in appearance96_pack.get('nativeOwnership', {}).get('atlases', {}).values():
    review96_files.update(atlas['file'] for atlas in animations.values())
fit96_template = json.loads((ROOT/review96/'fit-template.json').read_text(encoding='utf-8'))
review96_files.update(fit96_template['references'].values())
for style in appearance96_pack['styles']:
    for directions in style['layers'].values():
        review96_files.update(directions.values())
    for animations in style.get('animations', {}).values():
        review96_files.update(atlas['file'] for atlas in animations.values())
    for directions in style.get('parts', {}).values():
        for parts in directions.values():
            review96_files.update(parts.values())
for collection in ['originalFaces', 'originalHairs', 'originalHeads', 'originalHands']:
    for directions in appearance96_pack.get(collection, {}).values():
        review96_files.update(directions.values())
weapon96_pack = json.loads((ROOT/review96/'weapons.json').read_text(encoding='utf-8'))
assert weapon96_pack['reviewOnly'] is True
review96_files.update(item['source'] for item in weapon96_pack['items'])
review96_files.update(view['source'] for item in weapon96_pack['items'] for view in item.get('views', {}).values())
review96_files.update(item['armour']['source'] for item in weapon96_pack['items'] if item.get('armour'))
for body in review96_pack['bodies'].values():
    review96_files.update(body['references'].values())
    for layers in body.get('layers', {}).values():
        review96_files.update(layers.values())
    for directions in body.get('clips', {}).values():
        for clip in directions.values():
            assert clip.get('modular') is True
            review96_files.update(clip['layers'].values())
# Publish the verified, actively referenced compatibility set at the path
# the game requests. The editor/workbench is not part of the default site.
for name in sorted({'player-pack.json', *PLAYER96_DATA, *PLAYER96_MODULES, *player96_release['resources']}):
    target = OUT/review96/name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/review96/name, target)

if include_reviews:
    for name in sorted(review96_files):
        if name not in {'index.html', 'preview.css', 'preview.js', 'headgear-editor.js', 'rig.js', 'layers.js', 'motion.js', 'surface.js', 'torso.js', 'fit-template.json', 'appearance.js', 'wardrobe.js', 'appearance-catalog.json', 'appearance-rig.json', 'manifest.json', 'gallery-items.json', 'weapons.js', 'weapons.json', 'player-pack.json'}:
            if not re.fullmatch(r'assets/[a-z0-9-]+\.png', name):
                raise ValueError('Unsafe 96px review asset')
        target = OUT/review96/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT/review96/name, target)
    def version_review96(match):
        source = (OUT/review96/match.group(2)).resolve()
        if not source.is_relative_to(OUT.resolve()) or source.suffix not in ('.js', '.css') or not source.is_file():
            return match.group(0)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
        return f'{match.group(1)}{match.group(2)}?v={digest}{match.group(3)}'
    review96_html = OUT/review96/'index.html'
    review96_html.write_text(re.sub(r'((?:src|href)=")([^"?]+)(")', version_review96,
                                       review96_html.read_text(encoding='utf-8')), encoding='utf-8')
shutil.copy2(ROOT/'docs/PAPER-DOLL-96-V3.md', OUT/'docs/PAPER-DOLL-96-V3.md')

shutil.copy2(ROOT/'docs/PAPER-DOLL-96-LOBBY.md', OUT/'docs/PAPER-DOLL-96-LOBBY.md')

shutil.copy2(ROOT/'docs/PAPER-DOLL-96-ARMAS.md', OUT/'docs/PAPER-DOLL-96-ARMAS.md')

shutil.copy2(ROOT/'docs/PAPER-DOLL-96-ARMAS-DEMAIS-CLASSES.md', OUT/'docs/PAPER-DOLL-96-ARMAS-DEMAIS-CLASSES.md')

shutil.copy2(ROOT/'docs/CAPACETES-E-VISIBILIDADE.md', OUT/'docs/CAPACETES-E-VISIBILIDADE.md')

(OUT/".nojekyll").touch()

if include_reviews:
    # Explicit query-only pilot: copy only exact approved composites, not editor/source layers.
    pilot = Path('tools/rework10917/assets')
    manifest = json.loads((ROOT/pilot/'manifest.json').read_text())
    for name in ['manifest.json'] + [f['approved'] for item in manifest['items'].values() for f in item['frames']]:
        if name != 'manifest.json' and not re.fullmatch(r'(109|17)/[0-7]-final\.png', name):
            raise ValueError('Unsafe pilot asset')
        target = OUT/pilot/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT/pilot/name, target)

    donor = Path('tools/rework-donor-f6-north')
    for name in ['manifest.json'] + [f'frames/{i:02}.png' for i in range(12)]:
        target = OUT/donor/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT/donor/name, target)

# Exact idle accessory snapshots are available only through the explicit test query.
accessories = Path('tools/rework-accessories')
accessory_manifest = json.loads((ROOT/accessories/'manifest.json').read_text())
accessory_files = ['manifest.json', 'vendor.js', 'head-layer-index.json', 'female-original-face-ownership.json']
accessory_files += [p['name']+'/catalog.json' for p in accessory_manifest['packages']]
accessory_files += [str(p.relative_to(ROOT/accessories)) for p in sorted((ROOT/accessories/'assets').glob('*.png'))]
for name in accessory_files:
    target = OUT/accessories/name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT/accessories/name, target)

print(f"Site criado em: {OUT} (jogo atual; bancadas históricas: {include_reviews})")

# The live female renderer fetches these corrections by hash. The archive
# catalogs and their sources are used only by the isolated reworkTest views.
cycle_paths = ['tools/rework-weapons', 'tools/rework-outfits'] if include_reviews else [
    'tools/rework-weapons/grip-corrections',
]
for folder in cycle_paths:
    shutil.copytree(ROOT/folder, OUT/folder, dirs_exist_ok=True)

# Native-density source modules: deploy original PNG bytes, never review-only workspaces.
for folder in ['tools/rework-base-hd','tools/rework-weapon-layers-hd','tools/rework-modular-outfits-hd','tools/rework-female-north-rig','tools/rework-female-profile-rig','tools/rework-female-dagger-p22']:
    source=ROOT/folder
    if source.is_dir():
        for p in source.rglob('*'):
            if p.is_file() and p.suffix in ['.json','.png','.zip'] and not (folder in ['tools/rework-base-hd','tools/rework-modular-outfits-hd','tools/rework-weapon-layers-hd'] and 'assets' in p.relative_to(source).parts):
                target=OUT/folder/p.relative_to(source)
                target.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(p,target)

# The content index is derived from the finished runtime export, after generated art exists.
from game_loading_catalog import write_catalog
logo = OUT / 'assets/ui/loading/kaizoku-idle.webp'
logo.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(ROOT / 'apps/account-client/art/kaizoku-idle.webp', logo)
for name in ['index.html', 'ui-preview.html']:
    entry = OUT / name
    entry.write_text(entry.read_text(encoding='utf-8').replace('apps/account-client/art/kaizoku-idle.webp', 'assets/ui/loading/kaizoku-idle.webp'), encoding='utf-8')
write_catalog(OUT, {'player-pack.json', *PLAYER96_DATA, *PLAYER96_MODULES, *player96_release['resources']}, art_paths, args.renderer_fixture)
