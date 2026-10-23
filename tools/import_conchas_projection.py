"""Assemble native view_map exports without resizing, repainting or reordering pixels."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

def assemble(folder):
    result = Image.new('RGBA', (4480, 3456))
    chunks = []
    for row in range(4):
        for col in range(5):
            x, y = -22 + col * 16, -18 + row * 16
            width, height = min(16, 70 - col * 16), min(16, 54 - row * 16)
            path = folder / f'{x}_{y}.png'
            with Image.open(path) as image:
                if image.size != (width * 64, height * 64):
                    raise ValueError(f'{path}: unexpected dimensions {image.size}')
                result.paste(image.convert('RGBA'), (col * 1024, row * 1024))
            chunks.append({'cell': [x, y], 'cells': [width, height], 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    destination = ROOT / 'assets/world-maps/conchas/projection.png'
    manifest_path = destination.with_name('projection.json')
    palette = json.loads(manifest_path.read_text(encoding='utf-8'))['terrainPalette']
    result.save(destination, optimize=True)
    manifest = {'mapId': 'a12956e6-c961-499a-8242-ca264fcfc39a', 'source': 'PixelLab view_map native exports', 'size': [4480, 3456], 'cellSize': 64, 'objects': 105, 'layers': 'PixelLab projection, baked without reordering', 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'chunks': chunks}
    terrain = set(palette)
    r,g,b,a = result.getpixel((0,0))
    terrain.add(r*65536+g*256+b)  # Empty space outside the painted island is not scenery.
    mask = Image.new('L', result.size)
    mask.putdata([0 if r*65536+g*256+b in terrain else 255 for r,g,b,a in result.get_flattened_data()])
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    foreground = result.copy()
    foreground.putalpha(mask)
    foreground_bounds = foreground.getbbox()
    if not foreground_bounds:
        raise ValueError('Source projection has no foreground')
    foreground_path = destination.with_name('foreground.png')
    foreground.save(foreground_path, optimize=True)
    manifest['terrainPalette'] = palette
    manifest['foregroundSha256'] = hashlib.sha256(foreground_path.read_bytes()).hexdigest()
    manifest['foregroundBounds'] = list(foreground_bounds)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'Imported {len(chunks)} native chunks: {result.size}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('folder', type=Path)
    assemble(parser.parse_args().folder)
