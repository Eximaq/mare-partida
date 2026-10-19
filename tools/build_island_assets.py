"""Build file://-compatible atlas lookups from unmodified PixelLab metadata."""
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
folder=(ROOT/sys.argv[1]).resolve()
base=folder.relative_to(ROOT).as_posix()+'/'
data={}
for name in ('ocean-sand','sand-grass'):
    meta=json.loads((folder/(name+'-metadata.json')).read_text(encoding='utf-8-sig'))
    tiles=[]
    for tile in meta['tileset_data']['tiles']:
        c=tile['corners']
        mask=sum(bit for corner,bit in [('NW',8),('NE',4),('SW',2),('SE',1)] if c[corner]=='upper')
        tiles.append({'mask':mask,**tile['bounding_box']})
    assert {tile['mask'] for tile in tiles}==set(range(16))
    data[name]={'url':base+name+'.png','tiles':tiles}
source='globalThis.MareIslandAssets='+json.dumps(data,separators=(',',':'))+';\n'
props_folder=(ROOT/sys.argv[2]).resolve() if len(sys.argv)>2 else folder
if (props_folder/'harbor-props.png').is_file():
    props_url=(props_folder/'harbor-props.png').relative_to(ROOT).as_posix()
    source+='globalThis.MareHarborArt='+json.dumps({'url':props_url})+';\n'
(ROOT/'island-assets.js').write_text(source,encoding='utf-8')
print('Atlas lookups rebuilt; source PNGs and metadata unchanged.')
