"""Export garment-only passes from the editable North rifle animation."""
from collections import defaultdict
import hashlib
import io
import json
import struct
import zipfile

ARCHIVE = 'fuzil113-ns.zip'
DIGEST = 'cdd9889e5d96f92f826536779298fa86b9af0e0b52f2af2af41ac382a0087377'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def materialize(checkpoint, bank, native):
    manifest = json.loads((checkpoint / 'manifest.json').read_bytes())
    spec = next(r for r in manifest['archives'] if r['file'] == ARCHIVE)
    raw = (checkpoint / ARCHIVE).read_bytes()
    if len(raw) != spec['bytes'] or digest(raw) != DIGEST or spec['sha256'] != DIGEST:
        raise ValueError('Invalid rifle source archive')
    prefix = 'fuzil113-ns/'
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        catalog = json.loads(archive.read(prefix + 'catalog.json'))
        donor = catalog['originals']['north']
        receiver = next(r for r in native if r['id'] == donor['sourceBaseId'])
        source = donor['pack']
        body = receiver['pack']['directions']['north']
        direction = source['directions']['north']
        if (catalog['schema'] != 'fuzil113-portable-ns-v1' or receiver['body'] != 'female'
                or any(source[k] != receiver['pack'][k] for k in ('frame', 'density', 'pivot'))
                or any(direction[k] != body[k] for k in ('poses', 'rest', 'clip'))
                or body['layers'] != direction['layers'][:len(body['layers'])]):
            raise ValueError('Rifle archive and receiving body differ')
        groups = defaultdict(list)
        for row in catalog['northVariants']:
            slot, item = row['slot'], row['item']
            # The editable loader keeps the two original boot panels for its default item.
            if slot == 'boots' and item == 148:
                continue
            depth, target = {'pants': (3.1, 'pants'), 'boots': (.5, 'body')}[slot]
            groups[slot, item].append(dict(id=f'rifle-{slot}-{item}', depth=depth, slot=target, frames=row['frames']))
        hands = defaultdict(dict)
        for row in catalog['northGloves']:
            side = row['side']
            if side not in ('left', 'right') or row['phase'] in hands[row['item'], side]:
                raise ValueError('Invalid rifle hand registration')
            hands[row['item'], side][row['phase']] = row['sha']
        for (item, side), frames in hands.items():
            groups['gloves', item].append(dict(id=f'rifle-glove-{item}-{side}', slot='foreground',
                                               depth=6.1, frames=[frames[i] for i in range(8)]))
        originals = direction['layers'][len(body['layers']):]
        for key, ids in {
            ('boots', 148): ['candidate-boot148-0', 'candidate-boot148-1'],
            ('gloves', 166): ['candidate-glove166-left', 'candidate-glove166-right'],
            ('torso', 151): ['coat151-whole-torso', 'coat151-whole-hem', 'coat151-whole-leftUpper', 'coat151-whole-rightUpper']
        }.items():
            for name in ids:
                layer = next(l for l in originals if l['id'] == name)
                if layer['binding'] != {'kind': 'fixed'}:
                    raise ValueError('Unexpected default rifle fit ' + name)
                groups[key].append({k: layer[k] for k in ('id', 'depth', 'slot', 'frames')})
        # In the editable source, default wrist plates precede cuff plates at the same depth.
        # Replacement gloves are appended after them by the original loader.
        source_order = {layer['id']: i for i, layer in enumerate(direction['layers'])}
        rows, assets = [], set()
        for (slot, item), layers in sorted(groups.items()):
            if slot == 'gloves' and len(layers) != 2:
                raise ValueError('Rifle glove requires both hands')
            for layer in layers:
                if len(layer['frames']) != 8:
                    raise ValueError('Invalid rifle phase count')
                for h in set(layer['frames']) - assets:
                    data = archive.read(prefix + 'assets/' + h + '.png')
                    if digest(data) != h or data[:8] != bytes.fromhex('89504e470d0a1a0a') or struct.unpack('>II', data[16:24]) != (640, 640):
                        raise ValueError('Invalid owned rifle raster ' + h)
                    (bank / (h + '.png')).write_bytes(data)
                    assets.add(h)
                layer.update(binding={'kind': 'fixed'}, source=layer['frames'][0],
                             sourceStackIndex=source_order.get(layer['id'], len(source_order)))
            rows.append(dict(action='attack-firearm', direction='north', slot=slot, item=item, layers=layers))
        if [sum(r['slot'] == slot for r in rows) for slot in ('pants', 'boots', 'gloves', 'torso')] != [10, 10, 10, 1]:
            raise ValueError('Incomplete North rifle wardrobe')
        return rows, dict(id=receiver['id'], digest=receiver['sourcePackSHA256']), assets
