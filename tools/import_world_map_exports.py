"""Import PixelLab map composites, placed object masks and reconstructed walkable terrain."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image

MAPS = {
    'alubarna': ('Alubarna-export (1).zip', {2, 6, 10, 13}),
    'arlong': ('Arlong_Park-export.zip', {1, 3}),
    'baratie': ('Baratie-export.zip', {2}),
    'conchas': ('Cidade_das_Conchas-export.zip', {3}),
    'lobby': ('Lobby-export.zip', {1}),
    'loguetown': ('Loguetown-export.zip', {2}),
    'dawn': ('Mapa_-_Ilha_Dawn-export.zip', {1}),
    'syrup': ('Mapa_-_Vila_Syrup-export.zip', {2}),
    'marineford': ('Marineford-export.zip', {3}),
    'orange': ('Orange_Town-export.zip', {3}),
    'quest-dungeons': ('Quest_Dungeons-export (1).zip', {2, 4}),
}
TILE = 64
STEP = 16


def read_image(archive, name):
    return Image.open(io.BytesIO(archive.read(name))).convert('RGBA')


def terrain_templates(archive, metadata, blocked):
    base = {}
    templates = []
    for terrain in metadata['terrains']:
        terrain_id = terrain['id']
        name = f'terrain-tiles/terrain-{terrain_id}.png'
        if name in archive.namelist():
            pixels = np.asarray(read_image(archive, name))
            base[terrain_id] = pixels
            templates.append((pixels, [terrain_id]))
    for atlas in metadata['tilesets']:
        member = 'tilesets/' + atlas['filename']
        if member not in archive.namelist():
            print('  tileset image absent:', atlas['id'], flush=True)
            continue
        image = np.asarray(read_image(archive, member))
        ids = [atlas['lowerTerrainId'], atlas['upperTerrainId']]
        for y in range(0, image.shape[0], TILE):
            for x in range(0, image.shape[1], TILE):
                tile = image[y:y + TILE, x:x + TILE]
                if tile.shape[:2] == (TILE, TILE):
                    templates.append((tile, ids))
    found = {}
    for pixels, ids in templates:
        modes = [n in blocked for n in ids]
        cells = []
        for y in range(0, TILE, STEP):
            for x in range(0, TILE, STEP):
                patch = pixels[y:y + STEP, x:x + STEP]
                if len(set(modes)) == 1:
                    cells.append(not modes[0])
                    continue
                # Color statistics distinguish the two authored materials even on variants
                # of the same atlas. The composited image is used to match the atlas tile.
                colors = patch[..., :3].astype('float32').reshape(-1, 3)
                mean = colors.mean(axis=0)
                deviation = colors.std(axis=0)
                distance = []
                for n in ids:
                    ref = base[n][..., :3].astype('float32').reshape(-1, 3)
                    distance.append(np.linalg.norm(mean - ref.mean(axis=0)) +
                                    .35 * np.linalg.norm(deviation - ref.std(axis=0)))
                cells.append(not modes[int(np.argmin(distance))])
        found.setdefault(pixels.tobytes(), (pixels, np.reshape(cells, (4, 4))))
    return list(found.values())


def terrain_grid(image, templates, occupied):
    # PixelLab composites use dual-grid tiles aligned half a tile from the image origin.
    rgba = np.asarray(image)
    height, width = rgba.shape[:2]
    walkable = np.zeros((height // STEP, width // STEP), dtype=bool)
    colors = np.array([p[::4, ::4, :3] for p, _ in templates], dtype='int32')
    lookup = {p.tobytes(): cells for p, cells in templates}
    approx = 0
    for y in range(-32, height, TILE):
        for x in range(-32, width, TILE):
            y0, x0 = max(0, y), max(0, x)
            y1, x1 = min(y + TILE, height), min(x + TILE, width)
            patch = rgba[y0:y1, x0:x1]
            if not np.any(patch[..., 3]):
                continue
            cells = lookup.get(patch.tobytes()) if patch.shape[:2] == (TILE, TILE) else None
            if cells is None:
                visible = (patch[::4, ::4, 3] >= 240) & ~occupied[y0:y1:4, x0:x1:4]
                if not np.any(visible):
                    continue
                approx += 1
                sample = patch[::4, ::4, :3].astype('int32')[visible]
                yy, xx = (y0-y)//4, (x0-x)//4
                options = colors[:, yy:yy+visible.shape[0], xx:xx+visible.shape[1]]
                best = np.argmin(np.abs(options[:, visible] - sample).sum(axis=(1, 2)))
                cells = templates[best][1]
            for cy in range(y0, y1, STEP):
                for cx in range(x0, x1, STEP):
                    # Preserve uncovered gaps even on the edge of an atlas tile.
                    opaque = rgba[cy+2:cy+STEP-2, cx+2:cx+STEP-2, 3]
                    walkable[cy//STEP, cx//STEP] = (
                        cells[(cy-y)//STEP, (cx-x)//STEP] and np.count_nonzero(opaque > 200) >= opaque.size * .8
                    )
    return walkable


def import_map(archive_path, key, blocked, output):
    with zipfile.ZipFile(archive_path) as archive:
        metadata = json.loads(archive.read('map.json'))
        manifest = json.loads(archive.read('objects/manifest.json'))
        config = metadata['mapConfig']
        assert config['tileSize'] == TILE
        origin = [config['boundingBox'][f'min{axis}'] * TILE for axis in 'XY']
        original = archive.read('map-composite.png')
        image = read_image(archive, 'map-composite.png')
        width, height = image.size
        assert (width, height) == (config['dimensions']['pixelWidth'], config['dimensions']['pixelHeight'])
        target = output / key
        target.mkdir(parents=True, exist_ok=True)
        (target / 'map.png').write_bytes(original)
        masks = output.parent / 'map-depth' / 'objects'
        masks.mkdir(parents=True, exist_ok=True)
        covered = Image.new('L', image.size)
        props = []
        for obj in sorted(manifest['objects'], key=lambda p: p['layer']):
            if not obj['visible']:
                continue
            bounds, foot = obj['boundingBox'], obj['groundBounds']
            raw = archive.read('objects/' + obj['filename'])
            asset_id = 'export-' + hashlib.sha256(raw).hexdigest()[:24]
            mask_file = masks / (asset_id + '.png')
            if not mask_file.exists():
                mask_file.write_bytes(raw)
            x, y = round(bounds['x'] - origin[0]), round(bounds['y'] - origin[1])
            w, h = round(bounds['width']), round(bounds['height'])
            mask = read_image(archive, 'objects/' + obj['filename']).getchannel('A').resize((w,h), Image.Resampling.NEAREST)
            covered.paste(255, (x, y, x+w, y+h), mask.point(lambda a: 255 if a > 15 else 0))
            ground = dict(x=round(foot['x'] - origin[0], 2), y=round(foot['y'] - origin[1], 2),
                          w=foot['width'], h=foot['height'])
            prop = dict(id=obj['id'], assetId=asset_id, x=x, y=y, w=w, h=h,
                        base=round(ground['y'] + ground['h'], 2), ground=ground)
            # The exported box spans the open arch. Only the supports block passage.
            gate_width = {
                '24673972-57f6-4f9d-bf2f-6a890a42f822': (62, 60),
                'f58bc06c-e8ff-45c6-a522-0c0c22665d65': (42, 45),
                '14f3c2db-063a-422d-823d-d855badf151b': (53, 53),
                'd6e93f2b-bc03-4000-9bc4-a88b441a3796': (67, 68),
                '9dba0030-f541-4c9c-8eae-9feac7b70ad1': (67, 68),
            }.get(obj['id'])
            if gate_width and sum(gate_width) < ground['w']:
                left, right = gate_width
                prop['feet'] = [dict(ground, w=left),
                                dict(ground, x=ground['x'] + ground['w'] - right, w=right)]
            props.append(prop)
        for overlay in metadata['overlays']:
            archive.getinfo('overlays/' + overlay['filename'])
        walkable = terrain_grid(image, terrain_templates(archive, metadata, blocked), np.asarray(covered) != 0)
        rows = [''.join('g' if b else '.' for b in row) for row in walkable]
        alpha = np.asarray(image.getchannel('A'))
        visible = alpha.reshape(height//STEP, STEP, width//STEP, STEP).any(axis=(1, 3))
        coverage = [''.join('g' if b else '.' for b in row) for row in visible]
        (target / 'provenance.json').write_text(json.dumps(dict(
            file=archive_path.name, sourceId=metadata['mapId'], origin=origin, objects=len(props),
            archiveSha256=hashlib.sha256(archive_path.read_bytes()).hexdigest(),
            compositeSha256=hashlib.sha256(original).hexdigest(),
            overlays=len(metadata['overlays']), blockedTerrainIds=sorted(blocked),
        ), indent=2) + '\n', encoding='utf8')
        print(key, width, height, len(props), int(walkable.sum()), flush=True)
        return dict(width=width,height=height,origin=origin,props=props,rows=rows,coverage=coverage)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archives', type=Path)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    output = args.root / 'assets' / 'exported-maps'
    maps = {key: import_map(args.archives / archive, key, blocked, output)
            for key, (archive, blocked) in MAPS.items()}
    layout = json.loads(Path(__file__).with_name('world-map-export-layout.json').read_text(encoding='utf8'))
    for key, record in maps.items():
        record.update(layout[key])
    (args.root / 'world-map-exports-data.js').write_text(
        "'use strict';\n/* Generated by tools/import_world_map_exports.py and calibrated against game navigation. */\n"
        'globalThis.MareMapExportData=' + json.dumps(maps, separators=(',', ':')) + ';\n', encoding='utf8')


if __name__ == '__main__':
    main()
