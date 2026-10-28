"""Prepare native animation inputs; performs no remote calls or generation."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from PIL import Image


def prepare(manifest_path, output_dir):
    manifest_path, output_dir = Path(manifest_path), Path(output_dir)
    if output_dir.exists():
        raise FileExistsError(output_dir)
    data = json.loads(manifest_path.read_text(encoding='utf-8'))
    rig = data['rig']
    if (rig['frameWidth'], rig['frameHeight']) != (84, 84):
        raise ValueError('Expected the reviewed 84x84 rig')
    body = next(p for p in data['pieces'] if p['slot'] == 'body')
    crop = (10, 13, 74, 77)
    frames, prepared, hashes = [], [], {}
    # Validate all inputs before writing anything; never clip visible anatomy.
    for action, clip in body['animations'].items():
        name = clip['url']
        if not re.fullmatch(r'[a-z0-9-]+\.png', name) or not re.fullmatch(r'[a-z0-9-]+', action):
            raise ValueError('Unsafe source path or animation ID')
        path = manifest_path.parent / name
        hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        with Image.open(path) as source:
            sheet = source.convert('RGBA')
        if sheet.size != (84 * clip['frames'], 84 * len(clip['directions'])):
            raise ValueError('Invalid body sheet dimensions')
        for row, direction in enumerate(clip['directions']):
            if direction not in ('south', 'north', 'west', 'east'):
                raise ValueError('Invalid direction')
            for index in range(clip['frames']):
                frame = sheet.crop((index * 84, row * 84, index * 84 + 84, row * 84 + 84))
                bounds = frame.getbbox()
                if not bounds or bounds[0] < crop[0] or bounds[1] < crop[1] or bounds[2] > crop[2] or bounds[3] > crop[3]:
                    raise ValueError(f'Visible pixels outside crop: {action}/{direction}/{index}')
                filename = f'body-{action}-{direction}-{index:02d}.png'
                frames.append({'file': filename, 'animationId': action, 'direction': direction, 'frameIndex': index})
                prepared.append((filename, frame.crop(crop)))
    batches = []
    for direction in ('south', 'north', 'west', 'east'):
        ordered = [f['file'] for f in frames if f['direction'] == direction]
        batches.extend({'direction': direction, 'frames': ordered[i:i + 15]} for i in range(0, len(ordered), 15))
    report = {'version': 1, 'generationPerformed': False, 'sourceHashes': hashes,
              'sourceCanvas': [84, 84], 'inputCanvas': [64, 64], 'crop': list(crop),
              'pivot': {'x': rig['pivotX'] - crop[0], 'y': rig['pivotY'] - crop[1]},
              'restorePadding': {'left': 10, 'top': 13, 'right': 10, 'bottom': 7},
              'frames': frames, 'batches': batches}
    output_dir.mkdir(parents=True, exist_ok=False)
    for name, image in prepared:
        image.save(output_dir / name)
    (output_dir / 'input-manifest.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path, help='New output folder; existing folders are never overwritten')
    args = parser.parse_args()
    report = prepare(args.manifest, args.output)
    print(f"Prepared {len(report['frames'])} native frames, {len(report['batches'])} batches. No generation or remote call.")
