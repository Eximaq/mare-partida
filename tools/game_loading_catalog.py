"""Index the public game payload and coalesce small objects for first installation."""
import hashlib
import json
from pathlib import Path

TYPES = {'.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
         '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif',
         '.json': 'application/json', '.zip': 'application/zip', '.js': 'text/javascript',
         '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
         '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf'}
# Only production roots emitted by build_pages, never editor trees from --include-reviews.
ROOTS = ('assets', 'icones_menu_pirata', 'tools/paper-doll-96-v3', 'tools/rework-accessories',
         'tools/rework-weapons', 'tools/rework-outfits', 'tools/rework-base-hd',
         'tools/rework-weapon-layers-hd', 'tools/rework-modular-outfits-hd',
         'tools/rework-female-north-rig', 'tools/rework-female-profile-rig',
         'tools/rework-female-dagger-p22', 'tools/rework-firearm113-coat', 'tools/rework-sword0-checkpoint')


def build_catalog(root, compatibility_files=None, extra_files=(), roots=ROOTS):
    units, files, batch = [], {}, bytearray()
    pack_dir = root / 'loading-packs'
    pack_dir.mkdir(exist_ok=True)
    budget = 36 * 1024 * 1024
    def flush():
        if batch:
            digest = hashlib.sha256(batch).hexdigest()
            target = pack_dir / (digest[:24] + '.bin')
            target.write_bytes(batch)
            units.append([target.relative_to(root).as_posix(), len(batch), digest])
            batch.clear()

    paths = sorted({f for prefix in roots for f in (root / prefix).rglob('*')
                    if f.is_file() and f.suffix.lower() in TYPES})
    paths.extend(root / path for path in extra_files)
    if roots == ROOTS and (root / 'journal-feed.json').exists():
        paths.append(root / 'journal-feed.json')
    # Spend the small-file budget on the smallest files first to avoid thousands
    # of HTTP requests without duplicating large archives in the Pages export.
    small = set()
    for f in sorted(paths, key=lambda item: (item.stat().st_size, item)):
        size = f.stat().st_size
        if size > 48 * 1024 or size > budget:
            break
        if size:
            small.add(f)
            budget -= size
    for f in paths:
        path = f.relative_to(root).as_posix()
        if compatibility_files is not None and path.startswith('tools/paper-doll-96-v3/'):
            if path.split('/', 2)[2] not in compatibility_files:
                continue
        data = f.read_bytes()
        size = len(data)
        mime = TYPES[f.suffix.lower()]
        if f in small:
            if len(batch) + size > 1024 * 1024:
                flush()
            files[path] = [len(units), len(batch), size, mime]
            batch.extend(data)
        else:
            # Direct files are appended after all packs to keep pending pack indices stable.
            files[path] = [None, 0, size, mime, hashlib.sha256(data).hexdigest()]
    flush()
    for path, entry in files.items():
        if entry[0] is None:
            entry[0] = len(units)
            units.append([path, entry[2], entry.pop()])
    return {'units': units, 'files': files}


def write_catalog(root, compatibility_files, extra_files, renderer_fixture=False):
    # Renderer suites intercept individual asset requests to exercise missing art and
    # fallback behavior. Run the same installer with a small, real fixture catalog.
    roots = ('assets/ui/loading',) if renderer_fixture else ROOTS
    manifest = build_catalog(root, compatibility_files, () if renderer_fixture else extra_files, roots)
    data = json.dumps(manifest, separators=(',', ':'), ensure_ascii=True).encode()
    filename = 'game-content-' + hashlib.sha256(data).hexdigest()[:24] + '.json'
    (root / filename).write_bytes(data)
    fixture_attribute = ' data-renderer-fixture' if renderer_fixture else ''
    for name in ['index.html', 'ui-preview.html']:
        html = root / name
        html.write_text(html.read_text(encoding='utf-8').replace(
            '<html ', f'<html{fixture_attribute} data-game-content="{filename}" ', 1), encoding='utf-8')
