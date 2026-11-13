#!/usr/bin/env python3
"""Package a test-only pants22 candidate; never writes the published indexes."""
import hashlib, json, pathlib, sys, zipfile
folder = pathlib.Path(sys.argv[1]).resolve()
records = json.loads((folder / 'records.json').read_text(encoding='utf-8'))
assert records and all(r.get('productionEnabled') is False for r in records)
refs = sorted({s for r in records for s in r['sourceRefs'] if (folder / 'assets' / (s + '.png')).is_file()})
output = folder / 'pants22-candidate.zip'
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_STORED) as archive:
    for sha in refs:
        data = (folder / 'assets' / (sha + '.png')).read_bytes()
        assert hashlib.sha256(data).hexdigest() == sha
        info = zipfile.ZipInfo(sha + '.png', date_time=(2026, 1, 1, 0, 0, 0))
        archive.writestr(info, data)
data = output.read_bytes()
manifest = {'archive': {'file': output.name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'pngCount': len(refs), 'compression': 'stored'}, 'sources': {s: {'archive': output.name, 'path': s + '.png', 'bytes': (folder / 'assets' / (s + '.png')).stat().st_size} for s in refs}}
(folder / 'archive.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(f'{len(records)} test-only records, {len(refs)} candidate rasters; no production registration')
