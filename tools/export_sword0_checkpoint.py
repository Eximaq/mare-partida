"""Materialize a verified, opt-in Sword 0 review bundle without duplicating source ZIPs."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

EXPECTED = "5454aa97b46f66909090225d0f023f327d48b42cc0846c31afbda5d3533da24e"

def sha(data):
    return hashlib.sha256(data).hexdigest()

def materialize(checkpoint, out):
    manifest = json.loads((checkpoint / 'manifest.json').read_text())
    spec = next(row for row in manifest['archives'] if row['file'] == 'espada-0-camadas.zip')
    chunks = []
    for row in spec['parts']:
        path = Path(row['file'])
        if path.name != row['file']:
            raise ValueError('Invalid checkpoint path')
        data = (checkpoint / path).read_bytes()
        if len(data) != row['bytes'] or sha(data) != row['sha256']:
            raise ValueError(f'Invalid checkpoint part: {path}')
        chunks.append(data)
    raw = b''.join(chunks)
    if sha(raw) != EXPECTED or len(raw) != spec['bytes']:
        raise ValueError('Invalid Sword 0 checkpoint digest')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        catalog = json.loads(archive.read('sword-catalog.json'))
        states = {}
        hashes = set()
        for record in catalog['records']:
            direction = record['direction']
            state = record.pop('weaponStates')
            if direction in states and state != states[direction]:
                raise ValueError(f'Inconsistent weapon states: {direction}')
            states[direction] = state
            for layer in record['layers']:
                hashes.update(layer.get('frames') or [layer['source']])
        if hashes != set(catalog['assetHashes']):
            raise ValueError('Catalog asset inventory mismatch')
        catalog['states'] = states
        assets = out / 'assets'
        assets.mkdir(parents=True, exist_ok=True)
        for identifier in sorted(hashes):
            if len(identifier) != 64 or any(c not in '0123456789abcdef' for c in identifier):
                raise ValueError('Invalid image identifier')
            data = archive.read(f'assets/{identifier}.png')
            if sha(data) != identifier or not data.startswith(b'\x89PNG\r\n\x1a\n'):
                raise ValueError(f'Invalid image: {identifier}')
            (assets / f'{identifier}.png').write_bytes(data)
        (out / 'sword-catalog.json').write_text(json.dumps(catalog, separators=(',', ':')) + '\n')
        return len(hashes), len(catalog['records'])

if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('checkpoint', type=Path)
    cli.add_argument('out', type=Path)
    args = cli.parse_args()
    print('Sword 0: %s PNGs, %s slot records' % materialize(args.checkpoint, args.out))
