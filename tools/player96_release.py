"""Pin the existing current player resources; no image modification or generation."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'tools/paper-doll-96-v3'
DATA = ['manifest.json', 'appearance-catalog.json', 'appearance-rig.json', 'weapons.json']
MODULES = [n + '.js' for n in ['rig', 'layers', 'motion', 'surface', 'torso', 'appearance', 'weapons', 'wardrobe']]
ROOT_MODULES = ['character-appearance.js', 'headgear-visibility.js', 'paper-doll-96-lobby.js']


def references(value):
    if isinstance(value, dict):
        return set().union(*(references(v) for v in value.values())) if value else set()
    if isinstance(value, list):
        return set().union(*(references(v) for v in value)) if value else set()
    return {value} if isinstance(value, str) and re.fullmatch(r'assets/[a-z0-9-]+\.png', value) else set()


def fingerprint_content(name, raw):
    # Git may checkout text as CRLF on Windows; image bytes must remain exact.
    return raw.replace(b'\r\n', b'\n') if name.endswith(('.js', '.json')) else raw


def expected_release():
    release = json.loads((BASE / 'player-pack.json').read_text(encoding='utf-8'))
    if release.get('id') != 'native-player96-v1' or release.get('productionEnabled') is not True:
        raise ValueError('Owner-approved native release is required')
    paths = set()
    for name in DATA:
        paths.update(references(json.loads((BASE / name).read_text(encoding='utf-8'))))
    resources = {}
    sources = {name: BASE / name for name in DATA + MODULES}
    sources.update({'root/' + name: ROOT / name for name in ROOT_MODULES})
    for name in sorted(paths):
        file = BASE / name
        raw = file.read_bytes()
        if raw[:8] != b'\x89PNG\r\n\x1a\n' or raw[12:16] != b'IHDR':
            raise ValueError('Invalid PNG: ' + name)
        size = list(struct.unpack('>II', raw[16:24]))
        if any(v <= 0 or v > 8192 for v in size):
            raise ValueError('Invalid native dimensions: ' + name)
        resources[name] = size
        sources[name] = file
    digest = hashlib.sha256()
    for name, file in sorted(sources.items()):
        digest.update(name.encode() + b'\0' + fingerprint_content(name, file.read_bytes()) + b'\0')
    release.pop('fallbackQuery', None)
    release.update(renderer='native96', assetRevision='native96-' + digest.hexdigest()[:16], resources=resources)
    return release


def verify_release():
    actual = json.loads((BASE / 'player-pack.json').read_text(encoding='utf-8'))
    if actual != expected_release():
        raise ValueError('Current player release is stale. Run python tools/player96_release.py --write')
    return actual


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.write:
        result = expected_release()
        (BASE / 'player-pack.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    else:
        result = verify_release()
    print(result['assetRevision'], len(result['resources']), 'native resources')
