"""Keep full-size gameplay screenshots in individually downloadable artifacts."""
import json
import shutil
import sys
from pathlib import Path
source, target = map(Path, sys.argv[1:3])
limit = 350 * 1024 * 1024
part = size = 0
files = []
for path in sorted(source.glob('*.png')):
    n = path.stat().st_size
    if n > limit:
        raise ValueError(f'Single screenshot exceeds artifact limit: {path.name}')
    if size and size + n > limit:
        part += 1
        size = 0
    if part >= 16:
        raise ValueError('More than sixteen evidence parts required; expand workflow upload steps')
    dest = target / f'part{part}' / path.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path, dest)
    size += n
    files.append({'file': path.name, 'part': part, 'bytes': n})
source.mkdir(parents=True, exist_ok=True)
(source / 'artifact-parts.json').write_text(json.dumps({'originalPixelsUnchanged': True, 'files': files}, indent=2))
print(f'{len(files)} unchanged gameplay screenshots in {part + 1 if files else 0} parts')
