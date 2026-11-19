#!/usr/bin/env python3
"""Restore approved ZIPs byte-for-byte and verify SHA-256. No third-party dependencies."""
import argparse,hashlib,json,pathlib,zipfile
p=argparse.ArgumentParser();p.add_argument('--output',default='restored');p.add_argument('--verify-only',action='store_true');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parent
manifest=json.loads((root/'MANIFEST.json').read_text())
out=pathlib.Path(a.output)
for pkg in manifest['packages']:
    data=bytearray()
    for part in pkg['parts']:
        b=(root/pkg['key']/part['path']).read_bytes()
        assert len(b)==part['bytes'] and hashlib.sha256(b).hexdigest()==part['sha256'],part['path']
        data.extend(b)
    assert len(data)==pkg['bytes'] and hashlib.sha256(data).hexdigest()==pkg['sha256'],pkg['key']
    if not a.verify_only:
        target=out/pkg['key']/pkg['filename'];target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(data)
        with zipfile.ZipFile(target) as z: assert z.testzip() is None,pkg['key']
    print('OK',pkg['key'],pkg['sha256'])
print('Verified',len(manifest['packages']),'approved packages')
