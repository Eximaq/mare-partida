"""Build only the public coming-soon site, independently of the game preview."""
import argparse
import hashlib
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Deliberate allowlist: no account code, gameplay, local data or review assets.
PUBLIC_FILES = (
    'index.html', 'portal.css', 'ocean-art.css',
    'assets/logo-kaizoku-idle.png', 'assets/ui/banner-compass.webp',
)


def build(output):
    source = ROOT / 'portal'
    if output == ROOT or output in ROOT.parents or output == source or output.is_relative_to(source):
        raise SystemExit('Output must be separate from the source tree.')
    allowed = {Path('portal') / name for name in PUBLIC_FILES}
    allowed.update(map(Path, ['index.html', '_redirects', '_headers']))
    if output.exists():
        for existing in output.rglob('*'):
            if existing.is_symlink() or (existing.is_file() and existing.relative_to(output) not in allowed):
                raise SystemExit('Output contains unexpected files; choose an empty directory.')
    output.mkdir(parents=True, exist_ok=True)
    portal = output / 'portal'
    for relative in PUBLIC_FILES:
        destination = portal / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / 'portal' / relative, destination)
    entry = portal / 'index.html'

    def version(match):
        source = portal / match[2]
        digest = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
        return f'{match[1]}{match[2]}?v={digest}{match[3]}'

    entry.write_text(re.sub(r'((?:src|href)=")([.]/[^"?]+)(")', version,
                            entry.read_text(encoding='utf-8')), encoding='utf-8')
    (output / 'index.html').write_text('''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=./portal/">
<link rel="canonical" href="https://kaizokuidle2d.com.br/portal/">
<title>Kaizoku Idle — Em breve</title></head>
<body><a href="./portal/">Visitar o portal de Kaizoku Idle</a></body></html>
''', encoding='utf-8')
    (output / '_redirects').write_text('/ /portal/ 302\n/index.html /portal/ 302\n', encoding='utf-8')
    (output / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Cache-Control: public, max-age=0, must-revalidate\n', encoding='utf-8')
    print(f'Portal: {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'dist-portal')
    build(parser.parse_args().output_dir.resolve())
