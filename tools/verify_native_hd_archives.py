#!/usr/bin/env python3
"""Verify all deployed native PNG archives, not just currently visible frames."""
import hashlib
import json
from pathlib import Path
import zipfile
import struct
from materialize_native_indexes import materialize

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = ('rework-base-hd', 'rework-modular-outfits-hd', 'rework-weapon-layers-hd')
def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    materialize(ROOT)
    archives = sources = 0
    dimensions = {}
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
                assert data.startswith(b'\x89PNG\r\n\x1a\n') and data[12:16] == b'IHDR', (folder, sha, 'PNG')
                size = struct.unpack('>II', data[16:24])
                assert all(0 < value <= 8192 for value in size), (folder, sha, 'dimensions')
                dimensions[sha] = size
                sources += 1
            records = json.loads((path / 'index.json').read_text())['records']
            for record in records:
                for sha in record.get('sourceRefs', []):
                    assert sha in index['sources'], (folder, record['id'], sha, 'missing source')
        finally:
            for z in opened.values():
                z.close()
    heads = json.loads((ROOT / 'tools/rework-accessories/head-layer-index.json').read_text(encoding='utf-8'))
    head_refs = {sha for record in heads['records'] for sha in record.get('sourceRefs', [])}
    for sha in head_refs:
        data = (ROOT / 'tools/rework-accessories/assets' / (sha + '.png')).read_bytes()
        assert digest(data) == sha, (sha, 'head PNG sha256')
        assert data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR', (sha, 'head PNG')
        assert all(0 < value <= 8192 for value in struct.unpack('>II', data[16:24])), (sha, 'head dimensions')
    def verify_sizes(value):
        if isinstance(value, dict):
            sha = value.get('sha256')
            if sha in dimensions and isinstance(value.get('size'), list):
                assert tuple(value['size']) == dimensions[sha], (sha, 'declared dimensions')
            for child in value.values():
                verify_sizes(child)
        elif isinstance(value, list):
            for child in value:
                verify_sizes(child)
    verify_sizes(json.loads((ROOT / 'tools/rework-weapon-layers-hd/index.json').read_text(encoding='utf-8')))
    print(f'{len(head_refs)} head PNGs verified; native PNG dimensions and declared weapon sizes verified.')
    print(f'{archives} native archives and {sources} original PNG sources verified (size/SHA/CRC).')
if __name__ == '__main__':
    main()
