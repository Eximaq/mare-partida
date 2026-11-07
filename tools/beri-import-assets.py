"""One-shot import of the owner's approved Beri preview assets; removed before merge."""
from pathlib import Path
from urllib.request import urlopen, Request
from io import BytesIO
from PIL import Image
import hashlib

sources = {
    'sheet': ('https://media.canva.com/v2/image-resize/format:PNG/height:1152/quality:100/uri:ifs%3A%2F%2FM%2Ffe13473c-8080-4f5b-beda-e2b3a2410f6f/watermark:F/width:1152?csig=AAAAAAAAAAAAAAAAAAAAAOhhkIC3ZGdSHlrLEUQMazqQmVb24Y1eeaX1PS4tVwTi&exp=1794034301&osig=AAAAAAAAAAAAAAAAAAAAACcJb7gVsla05b5XN87_w-TpdbH_GPsMMn8R-f72kd7j&signer=media-rpc&token=AAIAAU0AJGZlMTM0NzNjLTgwODAtNGY1Yi1iZWRhLWUyYjNhMjQxMGY2ZgAAAAABobTG-EgKr5xDbcZCKis52cNlt8-gVC3BQr1ZmsSTWwI16DPGjg&x-canva-quality=thumbnail', (1152,1152), '7d0e11e2b12fb9e05cd7210943512779b0cbf68e5cda6e6caef74419bb3b33b2'),
    'icon': ('https://media.canva.com/v2/image-resize/format:PNG/height:96/quality:100/uri:ifs%3A%2F%2FM%2Ff2b4e3f2-7757-44cc-93cb-daa1bddb21e6/watermark:F/width:96?csig=AAAAAAAAAAAAAAAAAAAAAGV_kMV2Ew73OfMtZ7nXIWpBr0KfGdje2wt-9WfZuckZ&exp=1794035295&osig=AAAAAAAAAAAAAAAAAAAAAMD65DIHfSHs2zE0jl7tLQy0CqBPnepOJrnQzsmTjswt&signer=media-rpc&token=AAIAAU0AJGYyYjRlM2YyLTc3NTctNDRjYy05M2NiLWRhYTFiZGRiMjFlNgAAAAABobTWIxhxghqINsAdmclvDQJqqqv6a_1pKW80-dG6nrhB4V35Dg&x-canva-quality=thumbnail', (96,96), '7120717f3e05fce4861d8840a83a77063a64dba1b59820f68cfe5b20ca3a7ae0')
}
for kind, (url, size, expected) in sources.items():
    with urlopen(Request(url, headers={'User-Agent':'Kaizoku-asset-import/1.0'}), timeout=45) as response:
        image = Image.open(BytesIO(response.read())).convert('RGBA')
    assert image.size == size, (kind, image.size)
    digest = hashlib.sha256(image.tobytes()).hexdigest()
    print(kind, image.size, 'RGBA SHA-256:', digest, flush=True)
    assert digest == expected, 'Refusing to publish changed preview pixels: '+kind
    target = Path('assets/akuma') / ('beri-skill-'+kind+'-v2.webp')
    image.save(target, lossless=True, quality=100, method=6, exact=True)
    assert Image.open(target).convert('RGBA').tobytes() == image.tobytes()
    print('Verified lossless import:', target, target.stat().st_size, flush=True)
