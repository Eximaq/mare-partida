"""Package returned frames without changing pixels, order, or timing.

Input echo stays separate; the approved clip uses eight generated frames.
This script never submits a paid request.
"""
from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parent

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('job')
    parser.add_argument('name')
    args = parser.parse_args()
    if not all(c.isalnum() or c == '-' for c in args.name):
        parser.error('name must contain letters, digits or hyphens')
    folder = ROOT / (args.name + '-raw')
    folder.mkdir(exist_ok=True)
    frames, audit = [], []
    for index in range(9):
        path = folder / f'{index:02}.png'
        if not path.exists():
            urlretrieve(f'https://api.pixellab.ai/mcp/images/{args.job}/download?index={index}', path)
        with Image.open(path) as source:
            frame = source.convert('RGBA')
        if frame.size != (64, 64):
            raise ValueError(f'{path.name}: expected native 64x64, got {frame.size}')
        audit.append({'index': index, 'role': 'reference' if index == 0 else 'generated',
                      'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                      'bounds': frame.getbbox()})
        if index:
            frames.append(frame)
    sheet = Image.new('RGBA', (512, 64))
    for index, frame in enumerate(frames):
        sheet.paste(frame, (index * 64, 0))
    sheet.save(ROOT / (args.name + '-sheet.png'))
    sheet.resize((1536, 192), Image.Resampling.NEAREST).save(ROOT / (args.name + '-inspection.png'))
    # GIF is inspection only; PNG files are authoritative transparent pixels.
    frames[0].save(ROOT / (args.name + '-preview.gif'), save_all=True,
                   append_images=frames[1:], duration=125, loop=0, disposal=2)
    (ROOT / (args.name + '-audit.json')).write_text(json.dumps({
        'job_id': args.job, 'native_size': [64, 64], 'generated_frames': 8,
        'frame_order_preserved': True, 'artwork_approved': False, 'frames': audit
    }, indent=2) + '\n', encoding='utf-8')
    print(f'{args.name}: 9 originals preserved, 8 generated frames assembled; visual review required')

if __name__ == '__main__':
    main()
