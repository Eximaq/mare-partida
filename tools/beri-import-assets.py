"""One-shot binary import of approved Beri assets; removed before merge.
The two original WebP byte streams are packed into RGB pixels in a 200px PNG.
A native-size image URL avoids any resampling. SHA-256 is checked before writes.
No external image host is used by the shipped runtime.
"""
from pathlib import Path
from urllib.request import urlopen, Request
from io import BytesIO
from PIL import Image
import hashlib

url = 'https://media.canva.com/v2/image-resize/format:PNG/height:200/quality:100/uri:ifs%3A%2F%2FM%2F05ad9fb8-8fa2-4b89-9b85-3d090c860181/watermark:F/width:200?csig=AAAAAAAAAAAAAAAAAAAAAHEfc0-dqiCIGo_RMYitXXRRs8CoxBWovcvzZKDk_kbv&exp=1794034114&osig=AAAAAAAAAAAAAAAAAAAAALL1OwHpKrzVPolz9tMRYxiJuqM5hl6j6QA6GYs5VL97&signer=media-rpc&token=AAIAAU0AJDA1YWQ5ZmI4LThmYTItNGI4OS05Yjg1LTNkMDkwYzg2MDE4MQAAAAABobTEHdCelw6m2924ZH5Eq2EuDAO9g9OOUljgqZdp1OtnrWKfRw&x-canva-quality=thumbnail'
with urlopen(Request(url, headers={'User-Agent':'Kaizoku-asset-import/1.0'}), timeout=45) as response:
    image = Image.open(BytesIO(response.read())).convert('RGB')
assert image.size == (200,200), image.size
payload = image.tobytes()
assert hashlib.sha256(payload).hexdigest() == '61faf1d461f7fc9b097440e865c0302d54f883176e05a77a5595ff86aeee85db', 'Transfer PNG was resampled'
assets = [('sheet', 84018, 'c5807e67684e2242ae7fbcf973ac1b348f118808cc44755317b5b7d9fbda2ead', (1152,1152)), ('icon', 19200, 'f33bc990bdc5684f8712a7f08f303a89e1b97e20ddd0f24a04d71ca0f6440818', (96,96))]
offset = 0
for kind, size, expected, dimensions in assets:
    data = payload[offset:offset+size]
    offset += size
    digest = hashlib.sha256(data).hexdigest()
    assert digest == expected, ('Refusing modified asset', kind, digest)
    assert Image.open(BytesIO(data)).size == dimensions
    target = Path('assets/akuma') / ('beri-skill-'+kind+'-v2.webp')
    target.write_bytes(data)
    print('Verified approved asset:', target, len(data), digest, flush=True)
