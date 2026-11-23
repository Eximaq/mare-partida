"""Register original pistol and staff garment plates in the lazy weapon archive."""
import hashlib
import io
import json
from pathlib import Path
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/native-hd/editable-male-equipment/sources/pistola114-masculino-camadas.zip'
OUT = ROOT / 'tools/rework-weapon-layers-hd/archives'
NAME = 'p114-original-wardrobe-four-directions.zip'
DIGEST = 'c8498e8e9f86687979029af9d29c715625be5de63b9db092e8796954249b18c9'
DIRECTIONS = {'south': 'Sul', 'north': 'Norte', 'east': 'Leste', 'west': 'Oeste'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def parts(direction, phase):
    if direction == 'south':
        return {
            ('pants', 21): ([], ['Calcas/pants21-layer.png']),
            ('pants', 22): ([], ['Calcas/pants22-layer.png']),
            ('boots', 9): (['Bota9/rear.png'], ['Bota9/front.png']),
            ('gloves', 25): ([], [f'Luva25/glove25-wrist-back-{phase}.png']),
        }
    if direction == 'north':
        return {
            ('pants', 21): ([], [f'Calca21/pants21-{phase}.png']),
            ('boots', 9): (['Bota9/boot-0.png', 'Bota9/boot-2.png'],
                           ['Bota9/boot-1.png', 'Bota9/boot-3.png']),
            ('gloves', 25): ([], [f'Luva25/glove-{phase}.png']),
        }
    # The west plates are already reflected in the signed source.
    return {
        ('pants', 21): ([], [f'Calca21/{direction}-pants21-{phase}.png']),
        ('boots', 9): ([f'Bota9/{direction}-boot-rear.png'], [f'Bota9/{direction}-boot-front.png']),
        ('gloves', 25): ([], [f'Luva25/{direction}-combined-{phase}.png']),
    }


def register_staves(index):
    name = 'signed-staff-wardrobe.zip'
    directory = SOURCE.parent
    raw = (directory / 'cetros-equipamentos-aprovados.zip').read_bytes()
    manifest = (directory / 'cetros-equipamentos-aprovados.json').read_bytes()
    if sha(raw) != 'a6a2392ac2b4601b9ded078e322c5201aacaa497ab7825b65f4357660cc46afb' or sha(manifest) != '9cf9a0ebb5f41e85ad2226e73d1dd77811d6dda2209839adb734e8ccd55c2cea':
        raise ValueError('Staff source or receiving registration changed')
    source = json.loads(manifest)
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        members = {p['path'] for r in source['routes'] for f in r['frames']
                   for slot in f['slots'].values() for p in slot['passes']}
        if members | {'manifest.json'} != set(archive.namelist()) or len(members) != source['archiveFiles']:
            raise ValueError('Unexpected staff archive member')
        if json.loads(archive.read('manifest.json')) != source:
            raise ValueError('Unexpected staff garment ownership')
        for member in sorted(members):
            data = archive.read(member)
            digest = sha(data)
            if member != digest + '.png' or struct.unpack('>IIBB', data[16:26]) != (640, 640, 8, 6):
                raise ValueError('Invalid staff plate ' + member)
            index['sources'].setdefault(digest, dict(archive=name, path=member, bytes=len(data)))
    (OUT / name).write_bytes(raw)
    index['archives'] = [a for a in index['archives'] if a['file'] != name]
    index['archives'].append(dict(file=name, bytes=len(raw), pngCount=len(members),
                                  compression='deflated', sha256=sha(raw)))
    index['staffWardrobe'] = source['routes']


def main():
    raw = SOURCE.read_bytes()
    if sha(raw) != DIGEST:
        raise ValueError('W114 editable source changed')
    index_path = OUT / 'archive-index.json'
    index = json.loads(index_path.read_bytes())
    index['archives'] = [a for a in index['archives'] if a['file'] != NAME]
    index['sources'] = {h: s for h, s in index['sources'].items() if s['archive'] != NAME}
    registered = {}
    additions = {}
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        clocks = json.loads(archive.read('relogio-e-registro.json'))
        for direction, folder in DIRECTIONS.items():
            clock = clocks[direction]
            if clock['pivot'] != [80, 128] or len(clock['source_sha256']) != 8:
                raise ValueError('Unexpected receiving registration')
            slots = {}
            for phase in range(8):
                for (slot, item), passes in parts(direction, phase).items():
                    track = {}
                    for side, members in zip(('rear', 'front'), passes):
                        hashes = []
                        for member in members:
                            data = archive.read(folder + '/' + member)
                            if data[:8] != bytes.fromhex('89504e470d0a1a0a') or struct.unpack('>IIBB', data[16:26]) != (640, 640, 8, 6):
                                raise ValueError('Unexpected RGBA attachment ' + member)
                            h = sha(data)
                            hashes.append(h)
                            if h not in index['sources']:
                                additions[h] = data
                        track[side] = hashes
                    slots.setdefault(slot, {}).setdefault(str(item), []).append(track)
            registered[direction] = dict(id=f'pistolas114-{direction}-native-original-source',
                                         poseSourceSHA256=clock['source_sha256'], timeline=clock['timeline'],
                                         fps=clock['fps'], slots=slots)
    with zipfile.ZipFile(OUT / NAME, 'w') as output:
        for h, data in sorted(additions.items()):
            member = zipfile.ZipInfo(h + '.png')
            member.create_system = 3
            member.external_attr = 0o100644 << 16
            output.writestr(member, data)
            index['sources'][h] = dict(archive=NAME, path=member.filename, bytes=len(data))
    asset = (OUT / NAME).read_bytes()
    index['archives'].append(dict(file=NAME, bytes=len(asset), pngCount=len(additions),
                                  compression='stored', sha256=sha(asset)))
    index['pistolWardrobe'] = dict(sourceSHA256=DIGEST, directions=registered)
    register_staves(index)
    index_path.write_bytes((json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n').encode())
    print(f'{len(registered)} directions, {len(additions)} additional item rasters')


if __name__ == '__main__':
    main()
