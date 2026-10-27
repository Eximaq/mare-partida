"""Inspection-only assembly of existing PixelLab pixels; no paid calls or painting.

The masks select garment pixels per pose. They are not new garment artwork.
Every selected pixel is copied verbatim from its raw result. The source body,
original short hair, pivots, frame order and existing sword sockets are retained.
"""
from pathlib import Path
import hashlib
import json

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent.parent
RELEASE = PROJECT / 'pixellab-pip-generations/paper-doll-complete-20261026'
PILOT = PROJECT / 'pixellab-pip-generations/paper-doll-catalog-pilot-20261027'


def rgba(path):
    return Image.open(path).convert('RGBA')


def cell(sheet, index, size=64):
    x, y = index % 4 * size, index // 4 * size
    return sheet.crop((x, y, x + size, y + size))


def existing_frame(piece, action, index):
    clip = piece['animations'][action]
    row = clip['directions'].index('south')
    return rgba(RELEASE / clip['url']).crop((index * 84, row * 84, (index + 1) * 84, (row + 1) * 84))


def coalesce(*values):
    return next(v for v in values if v is not None)


def placement(piece, action, index, root, rig):
    clip = piece['animations'][action]
    direction = clip.get('directionOverrides', {}).get('south', {})
    pose = clip.get('poseOverrides', {}).get('south', [{}] * clip['frames'])[index]
    x = root['x'] + rig['pivotX'] - coalesce(clip.get('pivotX'), rig['pivotX']) + coalesce(pose.get('offsetX'), direction.get('offsetX'), clip.get('offsetX'), 0)
    y = root['y'] + rig['pivotY'] - coalesce(clip.get('pivotY'), rig['pivotY']) + coalesce(pose.get('offsetY'), direction.get('offsetY'), clip.get('offsetY'), 0)
    z = coalesce(pose.get('zIndex'), direction.get('zIndex'), clip.get('zIndex'), piece.get('zIndex'), 0)
    assert all(isinstance(v, int) for v in (x, y, z))
    return x, y, z


def skin(color):
    r, g, b, a = color
    return a > 0 and r >= 90 and g >= 55 and r - g >= 35 and g - b >= 15 and r < 1.95 * g


def garment_color(color):
    r, g, b, a = color
    return a > 0 and ((r > 2 * g and r > 1.6 * b and r > 40) or (r > 150 and g > 140 and b > 80 and r - g < 45))


def mask_for(raw, guide, base):
    guide_alpha = guide.getchannel('A')
    near = guide_alpha.filter(ImageFilter.MaxFilter(5))
    box = guide_alpha.getbbox()
    selected = Image.new('L', (64, 64))
    for y in range(64):
        for x in range(64):
            color = raw.getpixel((x, y))
            if not color[3] or not near.getpixel((x, y)):
                continue
            # Skin and shorts are not garment pixels. Keep the exposed neckline,
            # hands and original legs. The lower torso may contain a brass clasp.
            lower_clasp = box[3] - 3 <= y < box[3] and 28 <= x < 37
            blue = color[2] > color[0] and color[2] > color[1] + 8
            if blue or (skin(color) and not lower_clasp):
                continue
            if guide_alpha.getpixel((x, y)) or garment_color(color):
                selected.putpixel((x, y), 255)
    # A one-pixel generated outline may surround newly overhanging cloth.
    # Only use actual result pixels, adjacent to a selected garment pixel.
    edge = selected.filter(ImageFilter.MaxFilter(3))
    for y in range(64):
        for x in range(64):
            color = raw.getpixel((x, y))
            if color[3] and max(color[:3]) < 18 and edge.getpixel((x, y)) and near.getpixel((x, y)):
                selected.putpixel((x, y), 255)
    # Dilation is only a selection aid: it must not import generated facial
    # outlines, hands or shorts. Preserve exposed anatomy around each pose.
    top = base.getbbox()[1]
    center = (box[0] + box[2]) // 2
    for y in range(64):
        for x in range(64):
            exposed = base.getpixel((x, y))[3] and not guide_alpha.getpixel((x, y))
            protected = y < top + 10 or y >= box[3] or (y >= box[3] - 2 and not center - 5 <= x < center + 5)
            if exposed and protected:
                selected.putpixel((x, y), 0)
    return selected


def main():
    order = json.loads((ROOT / 'input-order.json').read_text(encoding='utf-8'))
    pack = json.loads((RELEASE / 'player-pack.json').read_text(encoding='utf-8'))
    body = next(p for p in pack['pieces'] if p['id'] == 'complete-body')
    outfit = next(p for p in pack['pieces'] if p['id'] == 'complete-outfit')
    hair = next(p for p in pack['pieces'] if p['id'] == 'complete-hair')
    sword = next(p for p in pack['pieces'] if p['id'] == 'complete-sword')
    weapon = rgba(PILOT / 'coral-sabre-layer-candidate.png')
    guides = rgba(ROOT / 'existing-outfit-guides.png')
    masks = Image.new('L', (256, 192))
    layers = Image.new('RGBA', (256, 192))
    fitted = Image.new('RGBA', (256, 192))
    combined = Image.new('RGBA', (336, 252))
    records = []
    for global_index, entry in enumerate(order):
        action, index = entry['action'], entry['frameIndex']
        base = rgba(ROOT / entry['input_file'])
        assert existing_frame(body, action, index).crop((10, 13, 74, 77)).tobytes() == base.tobytes(), 'Source release changed; review geometry before assembling.'
        raw = rgba(ROOT / f'raw-{global_index:02}.png')
        assert base.size == raw.size == (64, 64)
        guide = cell(guides, global_index)
        mask = mask_for(raw, guide, base)
        layer = Image.new('RGBA', (64, 64))
        for y in range(64):
            for x in range(64):
                if mask.getpixel((x, y)):
                    layer.putpixel((x, y), raw.getpixel((x, y)))
        fit = base.copy()
        fit.alpha_composite(layer)
        for y in range(64):
            for x in range(64):
                if not mask.getpixel((x, y)):
                    assert fit.getpixel((x, y)) == base.getpixel((x, y))
                else:
                    assert layer.getpixel((x, y)) == raw.getpixel((x, y))
        rx, ry = global_index % 4 * 64, global_index // 4 * 64
        masks.paste(mask, (rx, ry))
        layers.paste(layer, (rx, ry))
        fitted.paste(fit, (rx, ry))
        offset = pack['rig']['animations'][action].get('rootOffsets', {}).get('south', [{'x': 0, 'y': 0}] * 4)[index]
        wclip = sword['animations'][action]
        source = wclip['sources']['south']
        socket = wclip['sockets']['south'][index]
        assert socket.get('quarterTurns', 0) == 0, 'Review changed attachment geometry before assembling.'
        avatar = Image.new('RGBA', (84, 84))
        padded_body, padded_outfit = Image.new('RGBA', (84, 84)), Image.new('RGBA', (84, 84))
        padded_body.paste(base, (10, 13))
        padded_outfit.paste(layer, (10, 13))
        layers_to_draw = []
        for piece, image in [(body, padded_body), (outfit, padded_outfit), (hair, existing_frame(hair, action, index))]:
            dx, dy, depth = placement(piece, action, index, offset, pack['rig'])
            layers_to_draw.append((depth, image, dx, dy))
        dx, dy, depth = placement(sword, action, index, offset, pack['rig'])
        layers_to_draw.append((depth, weapon, dx + socket['x'] - source['anchorX'], dy + socket['y'] - source['anchorY']))
        for _, image, dx, dy in sorted(layers_to_draw, key=lambda value: value[0]):
            avatar.alpha_composite(image, (dx, dy))
        combined.paste(avatar, (global_index % 4 * 84, global_index // 4 * 84))
        records.append({'action': action, 'frameIndex': index, 'raw': f'raw-{global_index:02}.png', 'atlasIndex': global_index, 'nativePivot': [32, 52], 'runtimePivot': [42, 65], 'rootOffset': offset, 'layerHash': hashlib.sha256(layer.tobytes()).hexdigest(), 'layerPixels': sum(v > 0 for v in mask.tobytes())})
    masks.convert('RGB').save(ROOT / 'extraction-masks.png')
    layers.save(ROOT / 'outfit-layers.png')
    fitted.save(ROOT / 'fitted-bodies.png')
    combined.save(ROOT / 'combined-frames.png')
    review = {'reviewOnly': True, 'approved': False, 'productionEnabled': False, 'direction': 'south', 'garment': 'deck-rust', 'artworkStatus': 'inspection-candidate', 'coverage': {'idle': 4, 'walk': 8}, 'sourceReleaseSHA256': hashlib.sha256((RELEASE / 'player-pack.json').read_bytes()).hexdigest(), 'reported_usage': {'generations': 10}, 'frames': records}
    (ROOT / 'review.json').write_text(json.dumps(review, indent=2), encoding='utf-8')
    print('Assembled twelve inspection poses; every layer pixel copied from its raw result and base preserved outside mask.')


if __name__ == '__main__':
    main()
