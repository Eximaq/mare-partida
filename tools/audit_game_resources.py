"""Inventory the complete published tree and verify resource integrity, resumably."""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
from posixpath import normpath, dirname, join
import subprocess
from zipfile import ZipFile
from xml.etree import ElementTree

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RASTERS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.ico', '.avif'}
DATA = {'.json', '.tmj', '.tsj'}
AUDIO = {'.ogg', '.wav', '.mp3', '.m4a', '.flac'}
FONTS = {'.woff', '.woff2', '.ttf', '.otf'}
REFERENCE = re.compile(r"(?<![A-Za-z0-9_/])(?:[.][.]?/)*(?:assets|tools|pixellab-pip-generations|portal)/[A-Za-z0-9_./-]+[.](?:png|jpg|jpeg|webp|svg|gif|json|js|css|ogg|mp3|wav|woff2?|zip)(?![A-Za-z0-9_.])", re.I)


def digest(data):
    return sha256(data).hexdigest()


def inspect(path, relative, consumers):
    data = path.read_bytes()
    suffix = path.suffix.lower()
    row = dict(path=relative, sha256=digest(data), bytes=len(data),
               consumers=consumers, consumer_test='NÃO TESTADO')
    if not consumers:
        row['reference_status'] = 'sem consumidor identificado por referência estática'
    row['integrity'] = 'PASSOU'
    try:
        if suffix in RASTERS:
            with Image.open(BytesIO(data)) as image:
                row.update(size=list(image.size), format=image.format,
                           alpha='A' in image.getbands() or 'transparency' in image.info,
                           frames=getattr(image, 'n_frames', 1))
                for frame in range(row['frames']):
                    image.seek(frame)
                    image.load()
        elif suffix in DATA:
            json.loads(data)
        elif suffix == '.svg':
            ElementTree.fromstring(data)
        elif suffix == '.zip':
            with ZipFile(BytesIO(data)) as archive:
                broken = archive.testzip()
                if broken:
                    raise ValueError('CRC: ' + broken)
        else:
            row['integrity'] = 'NÃO TESTADO'
            row['reason'] = 'Inventariado e hasheado. Consumidor/validador de formato necessário.'
    except (ValueError, OSError, SyntaxError, RuntimeError, UnicodeError) as error:
        row.update(integrity='FALHOU', reason=str(error))
    return row


def index_references(files):
    folded = defaultdict(list)
    for name in files:
        folded[name.casefold()].append(name)
    consumers = defaultdict(set)
    unresolved = set()
    for owner, path in files.items():
        if path.suffix.lower() not in {'.js', '.css', '.html', '.json', '.ts', '.tmj', '.tsj'}:
            continue
        for ref in set(REFERENCE.findall(path.read_text(encoding='utf-8-sig', errors='replace'))):
            rel = [normpath(join(dirname(owner), ref)), normpath(ref)]
            found = next((r for r in rel if r in files), None)
            if found:
                consumers[found].add(owner)
            else:
                same_case = next((r for r in rel if r.casefold() in folded), None)
                unresolved.add((owner, ref, 'capitalização' if same_case else 'não localizado estaticamente'))
    return consumers, sorted(unresolved), [v for v in folded.values() if len(v) > 1]


def inspect_archives(build, dest):
    for index in sorted(build.glob('tools/rework-*/archives/archive-index.json')):
        data = json.loads(index.read_bytes())
        if data.get('schema') != 'hd-source-archives-v1':
            continue
        by_archive = defaultdict(list)
        for sha, source in data['sources'].items():
            by_archive[source['archive']].append((sha, source))
        for spec in data['archives']:
            path = index.parent / spec['file']
            archive_path = path.relative_to(build).as_posix()
            try:
                raw = path.read_bytes()
                if len(raw) != spec['bytes'] or digest(raw) != spec['sha256']:
                    raise ValueError('Tamanho/hash do ZIP não confere')
                with ZipFile(BytesIO(raw)) as archive:
                    for sha, source in by_archive[spec['file']]:
                        row = dict(path=archive_path+'!'+source['path'], sha256=sha,
                                   consumers=[index.relative_to(build).as_posix()], consumer_test='NÃO TESTADO')
                        try:
                            png = archive.read(source['path'])
                            if len(png) != source['bytes'] or digest(png) != sha:
                                raise ValueError('Tamanho/hash do PNG não confere')
                            with Image.open(BytesIO(png)) as image:
                                image.load()
                                if image.format != 'PNG':
                                    raise ValueError('Fonte arquivada não é PNG')
                                row.update(integrity='PASSOU', size=list(image.size),
                                           alpha='A' in image.getbands() or 'transparency' in image.info)
                        except (KeyError, OSError, ValueError, RuntimeError) as error:
                            row.update(integrity='FALHOU', reason=str(error))
                        dest.write(json.dumps(row, ensure_ascii=False)+'\n')
            except (OSError, ValueError, RuntimeError) as error:
                for sha, source in by_archive[spec['file']]:
                    dest.write(json.dumps(dict(path=archive_path+'!'+source['path'], sha256=sha,
                                               integrity='FALHOU', reason=str(error), consumer_test='NÃO TESTADO'),
                                          ensure_ascii=False)+'\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build', type=Path, default=ROOT / 'dist')
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    build = args.build.resolve()
    if not (build/'index.html').is_file():
        parser.error('Build sem index.html')
    args.out.mkdir(parents=True, exist_ok=True)
    files = {p.relative_to(build).as_posix(): p for p in sorted(build.rglob('*')) if p.is_file()}
    consumers, unresolved, collisions = index_references(files)
    rows = args.out/'resources.jsonl'
    archives = args.out/'archived-sources.jsonl'
    with rows.open('w', encoding='utf-8') as dest, ThreadPoolExecutor(max_workers=4) as pool:
        def examine(name):
            return inspect(files[name], name, sorted(consumers[name]))
        for row in pool.map(examine, files):
            dest.write(json.dumps(row, ensure_ascii=False)+'\n')
    with archives.open('w', encoding='utf-8') as dest:
        inspect_archives(build, dest)
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode('utf-8').split('\0')
    tree = [name for name in tracked if Path(name).suffix.lower() in RASTERS|DATA|AUDIO|FONTS|{'.svg','.zip'}]
    (args.out/'repository-resources.json').write_text(json.dumps({
        'published': [name for name in tree if name in files],
        'outside_build': [name for name in tree if name not in files]}, ensure_ascii=False, indent=2), encoding='utf-8')
    summaries = {}
    for file in [rows, archives]:
        with file.open(encoding='utf-8') as source:
            summaries[file.stem] = Counter(json.loads(line)['integrity'] for line in source)
    summary = {'build_sha256': digest((build/'index.html').read_bytes()),
               'inventory_sha256': digest(rows.read_bytes()), 'counts': summaries,
               'case_collisions': collisions,
               'unresolved_static_references': len(unresolved)}
    (args.out/'references.json').write_text(json.dumps(unresolved, ensure_ascii=False, indent=2), encoding='utf-8')
    (args.out/'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == '__main__':
    main()
