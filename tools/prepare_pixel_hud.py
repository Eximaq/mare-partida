"""Crop native PixelLab UI artwork, without painting or resampling pixels.

Usage: python tools/prepare_pixel_hud.py
The exact requests are versioned beside the two source PNGs. WebP is lossless.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RUN = ROOT / 'pixellab-pip-generations/hud-native-pixel-20261029'
OUT = ROOT / 'assets/ui/nautical'
ATLAS = Image.open(RUN / 'atlas.png').convert('RGBA')
LIQUID = Image.open(RUN / 'liquid-materials.png').convert('RGBA')
assert ATLAS.size == (256, 256), ATLAS.size
assert LIQUID.size == (64, 40), LIQUID.size

# Inspected actual bounds of the generated atlas, rather than assumed cells.
# A crop can deliberately take a uniform center for an unobtrusive repeating fill.
CROPS = {
    'frames/window.webp': ('atlas', (132, 16, 240, 126)),
    'frames/compact.webp': ('atlas', (164, 193, 240, 217)),
    'frames/parchment.webp': ('atlas', (132, 16, 240, 126)),
    'panels/sea.webp': ('atlas', (150, 40, 166, 56)),
    'panels/navy.webp': ('atlas', (60, 199, 68, 207)),
    'panels/wood.webp': ('atlas', (84, 141, 100, 149)),
    'panels/parchment.webp': ('atlas', (28, 104, 44, 110)),
    'headers/rope.webp': ('atlas', (15, 133, 241, 157)),
    'buttons/normal.webp': ('atlas', (70, 165, 124, 186)),
    'buttons/hover.webp': ('atlas', (15, 165, 63, 186)),
    'buttons/pressed.webp': ('atlas', (194, 165, 241, 186)),
    'buttons/selected.webp': ('atlas', (132, 165, 188, 186)),
    'buttons/disabled.webp': ('atlas', (70, 165, 124, 186)),
    'buttons/focus.webp': ('atlas', (15, 165, 63, 186)),
    'slots/empty.webp': ('atlas', (132, 193, 156, 217)),
    'bars/track.webp': ('liquid', (0, 26, 64, 38)),
    'bars/health.webp': ('liquid', (0, 0, 64, 8)),
    'bars/energy.webp': ('liquid', (0, 8, 64, 16)),
    'bars/experience.webp': ('liquid', (0, 16, 64, 24)),
}


def prepare():
    files = []
    for name, (source, box) in CROPS.items():
        image = (ATLAS if source == 'atlas' else LIQUID).crop(box)
        destination = OUT / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, 'WEBP', lossless=True, exact=True)
        # Encoding must preserve every RGBA pixel, including native pixel edges.
        decoded = Image.open(destination).convert('RGBA')
        assert decoded.tobytes() == image.tobytes(), name
        files.append({'path': name, 'source': source, 'crop': box,
                      'size': image.size, 'bytes': destination.stat().st_size,
                      'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()})
    manifest = {
        'version': 3, 'style': 'native restrained nautical pixel art',
        'source_run': RUN.relative_to(ROOT).as_posix(),
        'ui_asset_id': '28483549-9dc2-429e-b08a-b60b989ca2a2',
        'liquid_drawing_id': '4b3266b1-b175-485b-8bfa-16b37416eea0',
        'generation_cost': 10,
        'workbench_pricing': 'PixelLab describes Workbench as free for subscribers; no per-call usage returned',
        'processing': 'Crop and lossless WebP encoding only; no resizing, recoloring or local painting',
        'files': files,
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'{len(files)} lossless native crops, {sum(f["bytes"] for f in files)} bytes')


if __name__ == '__main__':
    prepare()
