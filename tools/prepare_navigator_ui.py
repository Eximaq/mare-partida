"""Native crops for the navigator prototype. No local painting or resampling."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RUN = ROOT / 'pixellab-pip-generations/hud-navigator-20261029'
OUT = ROOT / 'assets/ui/navigator'


def main():
    source = Image.open(RUN / 'atlas.png').convert('RGBA')
    assert source.size == (256, 256)
    # Bounds measured from the actual result. The malformed lower buttons/slot
    # are deliberately not used. A sound nameplate supplies the shared control.
    crops = {
        'window.webp': (4, 4, 129, 137),
        'panel.webp': (136, 120, 253, 193),
        'control.webp': (136, 84, 253, 113),
        'portrait.webp': (163, 8, 228, 73),
        'paper.webp': (184, 201, 252, 249),
        'ink.webp': (32, 36, 48, 52),
        'slate.webp': (168, 145, 184, 161),
        'paper-fill.webp': (200, 220, 216, 236),
        'rule.webp': (38, 5, 54, 6),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    files = []
    for name, box in crops.items():
        im = source.crop(box)
        if name == 'portrait.webp':
            # Remove only the connected uniform inner ink area. The generated
            # bronze ring remains byte-for-byte; this is an alpha mask, not paint.
            target = im.getpixel((32, 32))
            pending = [(32, 32)]
            seen = set()
            while pending:
                x, y = pending.pop()
                if (x, y) in seen or not (0 <= x < im.width and 0 <= y < im.height):
                    continue
                seen.add((x, y))
                if im.getpixel((x, y)) != target:
                    continue
                im.putpixel((x, y), (*target[:3], 0))
                pending.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
        dest = OUT / name
        im.save(dest, 'WEBP', lossless=True, exact=True)
        assert Image.open(dest).convert('RGBA').tobytes() == im.tobytes(), name
        files.append({'file': name, 'source': 'atlas.png', 'crop': box,
                      'size': im.size, 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
    emblem = Image.open(RUN / 'emblem.png').convert('RGBA')
    assert emblem.size == (28, 28)
    emblem.save(OUT / 'emblem.webp', 'WEBP', lossless=True, exact=True)
    assert Image.open(OUT / 'emblem.webp').convert('RGBA').tobytes() == emblem.tobytes()
    files.append({'file': 'emblem.webp', 'source': 'emblem.png', 'size': emblem.size})
    liquid = Image.open(RUN / 'liquid.png').convert('RGBA')
    assert liquid.size == (64, 12)
    for n, y in [('health', 0), ('energy', 4), ('gold', 8)]:
        im = liquid.crop((0, y, 64, y + 4))
        dest = OUT / f'{n}.webp'
        im.save(dest, 'WEBP', lossless=True, exact=True)
        assert Image.open(dest).convert('RGBA').tobytes() == im.tobytes()
        files.append({'file': dest.name, 'source': 'liquid.png', 'crop': (0, y, 64, y + 4), 'size': im.size})
    icons = Image.open(RUN / 'profile-icons.png').convert('RGBA')
    assert icons.size == (24, 12)
    for name, x in [('heart-icon', 0), ('energy-icon', 12)]:
        im = icons.crop((x, 0, x + 12, 12))
        dest = OUT / f'{name}.webp'
        im.save(dest, 'WEBP', lossless=True, exact=True)
        assert Image.open(dest).convert('RGBA').tobytes() == im.tobytes()
        files.append({'file': dest.name, 'source': 'profile-icons.png', 'crop': (x, 0, x + 12, 12), 'size': im.size})
    for entry in files:
        destination = OUT / entry['file']
        entry['bytes'] = destination.stat().st_size
        entry['sha256'] = hashlib.sha256(destination.read_bytes()).hexdigest()
    (OUT / 'manifest.json').write_text(json.dumps({
        'status': 'prototype-awaiting-owner-visual-review',
        'source_run': RUN.relative_to(ROOT).as_posix(),
        'reference_images': [], 'processing': 'Native crops, portrait inner alpha mask, lossless encoding; no painting or resampling',
        'fonts': {'family': 'Alegreya Sans', 'weights': [400, 500, 700], 'license': 'fonts/OFL.txt', 'source': 'https://fonts.google.com/specimen/Alegreya+Sans'},
        'files': files,
    }, indent=2) + '\n', encoding='utf-8')
    print(f'{len(files)} native assets prepared')


if __name__ == '__main__':
    main()
