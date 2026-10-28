"""Package explicit native references for the owner; never generates or uploads art."""
import argparse
import json
from pathlib import Path
import re
import zipfile
from PIL import Image


def create_archive(inputs, guide, archive):
    inputs, guide, archive = Path(inputs), Path(guide), Path(archive)
    if archive.exists():
        raise FileExistsError(archive)
    manifest = inputs / 'input-manifest.json'
    report = json.loads(manifest.read_text(encoding='utf-8'))
    frames = [frame['file'] for frame in report['frames']]
    if report.get('generationPerformed') is not False or report.get('inputCanvas') != [64, 64] or not frames or len(set(frames)) != len(frames):
        raise ValueError('Expected a native input manifest, not generated artwork')
    for name in frames:
        if not isinstance(name, str) or not re.fullmatch(r'[a-z0-9-]+\.png', name):
            raise ValueError('Unsafe input filename')
        with Image.open(inputs / name) as image:
            if image.format != 'PNG' or image.size != (64, 64) or image.mode != 'RGBA':
                raise ValueError('Expected native transparent 64x64 PNG inputs')
    lines = ['REFERENCIAS EXISTENTES. NENHUMA GERACAO PAGA.', 'Manter a ordem abaixo em cada lote.\n']
    for number, batch in enumerate(report['batches'], 1):
        if batch['direction'] not in ('south', 'north', 'west', 'east') or not 1 <= len(batch['frames']) <= 15 or any(name not in frames for name in batch['frames']):
            raise ValueError('Invalid reference batch')
        lines.append(f"Lote {number:02d} - {batch['direction']}")
        lines.extend(batch['frames'])
        lines.append('')
    instructions = guide.read_text(encoding='utf-8')
    archive.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED) as packed:
        packed.writestr('README.md', instructions)
        packed.writestr('LOTES.txt', '\n'.join(lines))
        packed.write(manifest, 'referencias/input-manifest.json')
        for name in frames:
            packed.write(inputs / name, 'referencias/' + name)
    return len(frames)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inputs', type=Path)
    parser.add_argument('guide', type=Path)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    count = create_archive(args.inputs, args.guide, args.archive)
    print(f'Packaged {count} existing reference frames. No generation, upload or account charge.')
