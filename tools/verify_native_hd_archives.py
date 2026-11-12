#!/usr/bin/env python3
"""Verify all deployed native PNG archives, not just currently visible frames."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = ('rework-base-hd', 'rework-modular-outfits-hd', 'rework-weapon-layers-hd')
def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    archives = sources = 0
    for folder in FOLDERS:
        path = ROOT / 'tools' / folder
        index = json.loads((path / 'archives/archive-index.json').read_text())
        opened = {}
        try:
            for spec in index['archives']:
                data = (path / 'archives' / spec['file']).read_bytes()
                assert len(data) == spec['bytes'], (folder, spec['file'], 'size')
                assert digest(data) == spec['sha256'], (folder, spec['file'], 'sha256')
                z = zipfile.ZipFile(path / 'archives' / spec['file'])
                assert z.testzip() is None, (folder, spec['file'], 'CRC')
                opened[spec['file']] = z
                archives += 1
            for sha, entry in index['sources'].items():
                data = opened[entry['archive']].read(entry['path'])
                assert entry['path'] == sha + '.png', (folder, sha, 'path')
                assert len(data) == entry['bytes'], (folder, sha, 'size')
                assert digest(data) == sha, (folder, sha, 'PNG sha256')
                assert data.startswith(b'\x89PNG\r\n\x1a\n'), (folder, sha, 'PNG')
                sources += 1
            records = json.loads((path / 'index.json').read_text())['records']
            for record in records:
                for sha in record.get('sourceRefs', []):
                    assert sha in index['sources'], (folder, record['id'], sha, 'missing source')
        finally:
            for z in opened.values():
                z.close()
    print(f'{archives} native archives and {sources} original PNG sources verified (size/SHA/CRC).')
if __name__ == '__main__':
    main()
