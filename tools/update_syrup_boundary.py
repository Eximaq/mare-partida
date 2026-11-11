"""Update only Syrup from the owner's ZIP; preserve every authored prop and foot."""
import argparse, copy, json, re
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import import_world_map_exports as importer

ROOT = Path(__file__).resolve().parents[1]
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    data_path = ROOT / 'world-map-exports-data.js'
    text = data_path.read_text(encoding='utf8')
    start = text.index('"syrup":') + len('"syrup":')
    old, length = json.JSONDecoder().raw_decode(text[start:])
    # This export contains literal Unicode escapes in tileset filenames.
    original_templates = importer.terrain_templates
    def templates(archive, metadata, blocked):
        metadata = copy.deepcopy(metadata)
        for atlas in metadata['tilesets']:
            atlas['filename'] = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m[1],16)), atlas['filename'])
        return original_templates(archive, metadata, blocked)
    importer.terrain_templates = templates
    source = importer.import_map(args.archive, 'syrup', {2}, ROOT / 'assets/exported-maps')
    # Compare in editor coordinates; never infer, shrink or remove object collision.
    dx, dy = old['origin'][0]-source['origin'][0], old['origin'][1]-source['origin'][1]
    preserved = copy.deepcopy(old['props'])
    for p in preserved:
        p['x'] += dx; p['y'] += dy; p['base'] = round(p['base']+dy,2)
        p['ground']['x'] = round(p['ground']['x']+dx,2)
        p['ground']['y'] = round(p['ground']['y']+dy,2)
    assert source['props'] == preserved, 'ZIP changes object geometry: review before importing'
    boundary = json.loads((ROOT/'tools/syrup-boundary.json').read_text(encoding='utf8'))
    polygon = boundary['polygon']
    mask = Image.new('1',(source['width'],source['height']))
    ImageDraw.Draw(mask).polygon([tuple(p) for p in polygon],fill=1)
    inside = np.asarray(mask).reshape(source['height']//16,16,source['width']//16,16).all(axis=(1,3))
    source['rows'] = [''.join('g' if c=='g' and inside[y,x] else '.' for x,c in enumerate(row)) for y,row in enumerate(source['rows'])]
    layout_path = ROOT/'tools/world-map-export-layout.json'
    layout = json.loads(layout_path.read_text(encoding='utf8'))
    layout['syrup'] = boundary['layout']
    layout_path.write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    source.update(layout['syrup'])
    data_path.write_text(text[:start]+json.dumps(source,ensure_ascii=False,separators=(',',':'))+text[start+length:],encoding='utf8')
if __name__=='__main__':
    main()
