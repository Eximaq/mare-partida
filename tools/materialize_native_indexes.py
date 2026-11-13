#!/usr/bin/env python3
"""Restore complete native indexes from lossless, integrity-checked Git transport."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def _checked_path(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('Native index transport path escapes repository')
    return path

def _verify(data, size, digest, label):
    if len(data) != size or hashlib.sha256(data).hexdigest() != digest:
        raise ValueError('Native index integrity mismatch: ' + label)

def materialize(root=ROOT):
    root = Path(root)
    manifest = json.loads((root / 'tools/native-index-transport.json').read_text())
    if manifest.get('schema') != 'native-index-gzip-v1':
        raise ValueError('Invalid native index transport schema')
    for entry in manifest['indexes']:
        source = _checked_path(root, entry['source'])
        target = _checked_path(root, entry['target'])
        if target.exists():
            # Do not silently discard a developer's unpacked local edits.
            _verify(target.read_bytes(), entry['bytes'], entry['sha256'], str(target))
            continue
        packed = source.read_bytes()
        _verify(packed, entry['compressedBytes'], entry['compressedSha256'], str(source))
        data = gzip.decompress(packed)
        _verify(data, entry['bytes'], entry['sha256'], entry['target'])
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return len(manifest['indexes'])

if __name__ == '__main__':
    print(f'{materialize()} native index transport(s) verified/materialized losslessly.')
