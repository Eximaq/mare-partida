"""Index the public game payload and coalesce small objects for first installation."""
from collections import Counter, defaultdict
import hashlib
import json
import struct
import zipfile
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


HD_ROOTS = {'tools/rework-base-hd', 'tools/rework-weapon-layers-hd', 'tools/rework-modular-outfits-hd'}


def hd_patches(root, units):
    """Ship only missing bytes when another installed archive contains identical ZIP payloads."""
    sources = defaultdict(list)
    blocks = {}
    for index, (path, _, _) in enumerate(units):
        if not path.endswith('.zip') or '/'.join(path.split('/')[:2]) not in HD_ROOTS:
            continue
        entries = blocks[index] = []
        with (root / path).open('rb') as stream, zipfile.ZipFile(stream) as archive:
            for info in sorted(archive.infolist(), key=lambda entry: entry.header_offset):
                if info.compress_size < 1024:
                    continue
                stream.seek(info.header_offset + 26)
                name, extra = struct.unpack('<HH', stream.read(4))
                offset = info.header_offset + 30 + name + extra
                stream.seek(offset)
                key = hashlib.sha256(stream.read(info.compress_size)).digest()
                entries.append((offset, info.compress_size, key))
                sources[key].append((index, offset))

    # Keep original ZIP URLs for direct consumers. Limit additional Pages storage,
    # spending it on archives with the largest proportion of reusable bytes first.
    budget = 5 * 1024 * 1024
    patches, pinned = {}, set()
    def reuse_ratio(index):
        return sum(size for _, size, key in blocks[index] if len(sources[key]) > 1) / units[index][1]

    digest_counts = Counter(unit[2] for unit in units)
    for index in sorted(blocks, key=reuse_ratio, reverse=True):
        path, size, digest = units[index]
        if index in pinned or digest_counts[digest] > 1:
            continue
        spans = []
        for offset, count, key in blocks[index]:
            choices = [(i, start) for i, start in sources[key]
                       if (i == index and start < offset) or (i != index and units[i][2] not in patches
                                                              and units[i][2] != digest)]
            if choices:
                provider, start = min(choices, key=lambda ref: (ref[0] != index, ref[0] not in pinned, ref))
                spans.append([offset, provider, start, count])
        saved = sum(span[3] for span in spans)
        if saved < 64 * 1024 or size - saved > budget:
            continue
        data = (root / path).read_bytes()
        literal = bytearray()
        cursor = 0
        for offset, provider, _, count in spans:
            literal.extend(data[cursor:offset])
            cursor = offset + count
            if provider != index:
                pinned.add(provider)
        literal.extend(data[cursor:])
        patch = 'loading-packs/' + hashlib.sha256(literal).hexdigest()[:24] + '.delta'
        (root / patch).write_bytes(literal)
        patches[digest] = [patch, len(literal), spans]
        budget -= len(literal)
    return patches


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
    return {'units': units, 'files': files, 'patches': hd_patches(root, units)}


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
