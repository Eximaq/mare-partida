"""Extract the inspected ImageGen atlas; never draws or synthesizes UI artwork.
Usage: python tools/prepare_nautical_assets.py path/to/generated-atlas.png
"""
from pathlib import Path
import json, sys, hashlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/ui/nautical'
# Measured cell boundaries on the accepted 1254x1254 output (not assumed grid).
XS = [0, 314, 628, 941, 1254]
YS = [0, 314, 607, 892, 1254]
CELLS = [
    ('frames/window', 0, 0), ('frames/compact', 1, 0),
    ('frames/parchment', 2, 0), ('panels/wood', 3, 0),
    ('buttons/normal', 0, 1), ('buttons/hover', 1, 1),
    ('buttons/pressed', 2, 1), ('buttons/selected', 3, 1),
    ('buttons/disabled', 0, 2), ('buttons/focus', 1, 2),
    ('slots/empty', 2, 2), ('headers/rope', 3, 2),
    ('bars/track', 0, 3), ('bars/health', 1, 3),
    ('bars/energy', 2, 3), ('bars/experience', 3, 3),
]

def main(source):
    atlas = Image.open(source).convert('RGB')
    if atlas.size != (1254, 1254):
        raise SystemExit('Expected inspected 1254x1254 atlas; measure new output before extraction.')
    assets = []
    for name, col, row in CELLS:
        box = (XS[col]+5, YS[row]+5, XS[col+1]-5, YS[row+1]-5)
        tile = atlas.crop(box)
        # Explicit crops preserve all ornaments; no presentation labels exist.
        tile = tile.resize((256, 256), Image.Resampling.LANCZOS)
        dest = OUT / (name+'.webp')
        dest.parent.mkdir(parents=True, exist_ok=True)
        tile.save(dest, 'WEBP', quality=88, method=6)
        assets.append({'file':name+'.webp', 'width':256, 'height':256,
                       'crop':list(box), 'bytes':dest.stat().st_size})
        if name in ('frames/window', 'frames/compact', 'frames/parchment'):
            texture = tile.crop((56,56,200,200))
            texture_name = {'frames/window':'sea','frames/compact':'navy','frames/parchment':'parchment'}[name]
            dest = OUT / 'panels' / (texture_name+'.webp')
            dest.parent.mkdir(parents=True, exist_ok=True)
            texture.save(dest,'WEBP',quality=88,method=6)
            assets.append({'file':'panels/'+texture_name+'.webp','width':144,'height':144,'bytes':dest.stat().st_size})
    manifest = {'version':2, 'source':'Original ImageGen raster atlas; user references used only as art direction, not copied into distribution.',
                'sourceSHA256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),
                'method':'One built-in ImageGen call; measured extraction and WebP encoding with Pillow. No PixelLab calls.',
                'textBakedIn':False, 'frameSlice':44, 'assets':assets,
                'preserved':['assets/ui/inventory-slots/*.png','icones_menu_pirata/png/48/*.png','assets/ui/talents/*','assets/haki/*']}
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{len(assets)} assets, {sum(x["bytes"] for x in assets)} bytes')

if __name__ == '__main__':
    main(sys.argv[1])
