"""Register the original South trouser plates on the eight-state focus gesture."""
import gzip
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'tools/rework-base-hd'
OUTFITS = ROOT / 'tools/rework-modular-outfits-hd'
OUTPUT = ROOT / 'tools/rework-combat-wardrobe/south-focus-trousers.json'


def index(bank):
    file = bank / 'index.json'
    return json.loads(file.read_bytes() if file.exists() else gzip.decompress(Path(str(file) + '.gz').read_bytes()))


def register():
    import numpy as np
    from PIL import Image, ImageDraw

    archives = {bank: json.loads((bank / 'archives/archive-index.json').read_bytes())['sources']
                for bank in (BASE, OUTFITS)}

    @lru_cache(maxsize=64)
    def pixels(bank, key):
        row = archives[bank][key]
        with zipfile.ZipFile(bank / 'archives' / row['archive']) as package:
            data = package.read(row['path'])
        if hashlib.sha256(data).hexdigest() != key:
            raise ValueError('Source mismatch ' + key)
        image = Image.open(io.BytesIO(data)).convert('RGBA')
        if image.size != (640, 640):
            raise ValueError('Expected a registered 640px plate')
        return np.asarray(image)

    def component(allowed, seed):
        plane = Image.fromarray(allowed.astype('uint8')).copy()
        if plane.getpixel(seed) != 1:
            raise ValueError('No owned pixel at contact ' + str(seed))
        ImageDraw.floodfill(plane, seed, 255)
        return np.asarray(plane) == 255

    def runs(mask):
        edges = np.flatnonzero(np.diff(np.r_[False, mask.ravel(), False])).reshape(-1, 2)
        return [[int(start), int(stop-start)] for start, stop in edges]

    bodies = {r['id']: r for r in index(BASE)['records']}
    archive = index(OUTFITS)
    outfits = {r['id']: r for r in archive['records']}
    focus = bodies['male-attack-focus-south-drawn8']
    source = archive['malePunchOwnPantsCardinal']['cardinals']['south']
    punch = bodies[source['baseId']]
    anchor = outfits['male-pants133-attack-focus-south-drawn8-candidate']['overlayContract']
    if focus['sourcePackSHA256'] != anchor['baseSourcePackSHA256'] or punch['sourcePackSHA256'] != source['baseSHA']:
        raise ValueError('The original South rigs have changed')
    d = focus['pack']['directions']['south']
    lower = punch['pack']['directions']['south']
    body, stock = d['layers'][:2]
    if (body['id'], stock['id'], d['clip']['frames'], d['clip']['fps']) != ('skin-arms-phase','shorts-phase',8,12):
        raise ValueError('Incompatible focus layers or clock')
    if body['frames'] != anchor['bodyFrames'] or anchor['physicalTranslation'] != [64,64]:
        raise ValueError('Original focus garment registration mismatch')
    joints = [j for j in d['rest'] if j == 'HIP' or j.endswith((' HIP',' KNEE',' LEG'))]
    if len(joints) != 7 or not all(a[j] == b[j] for a,b in zip([d['rest'], *d['poses']], [lower['rest'], *lower['poses']]) for j in joints):
        raise ValueError('Focus and punch use different lower-body anchors')
    plates = {k: dict(sha=v, source=punch['id']+'/pants'+k, replace=True) for k,v in source['items'].items()}
    for item, name in [(21,'male-pants21-attack-unarmed-south'),(22,'male-pants22-attack-unarmed-south'),
                       (133,'male-pants133-attack-focus-south-drawn8-candidate')]:
        donor = outfits[name]
        direction = donor['pack']['directions']['south']
        layers = [l for l in direction['layers'] if l['id'].startswith('pants'+str(item)+'-')]
        if len(layers)!=1 or layers[0]['slot']!='pants' or donor['equipment']!={'pants':item} or layers[0]['binding']!={'kind':'fixed'}:
            raise ValueError('Unowned garment ' + name)
        layer = layers[0]
        plates[str(item)] = dict(sha=layer.get('frames',[layer.get('source')])[0],source=name+'/'+layer['id'],replace=False)
    if len({p['sha'] for p in plates.values()})!=10 or plates['133']['sha']!=anchor['paddedSourceSHA256']:
        raise ValueError('Expected ten distinct original plates')
    fabrics = {item:pixels(OUTFITS,p['sha'])[:,:,3] for item,p in plates.items()}
    y,x = np.indices((640,640))
    extent = np.logical_or.reduce([alpha>0 for alpha in fabrics.values()])
    if np.any(extent & ((y<314)|(y>=510)|(x<230)|(x>=415))):
        raise ValueError('An owned fabric plate extends beyond the registered waist/legs')
    # Physical x of the inside edge of the near fingertips. The hand crosses
    # the abdomen in states 1 and 6. The other rows use the separated silhouette.
    contact = {1:[350,350,348,348,348,348,348,348,348,348,348],
               6:[333,331,330,329,329,328,329,329,329,328,328]}
    phases=[]
    for f,(body_id,stock_id) in enumerate(zip(body['frames'],stock['frames'])):
        skin = pixels(BASE,body_id)[:,:,3]
        indigo = pixels(BASE,stock_id)[:,:,3]
        shorts = component(indigo>0,(320,354))
        if not 5500<int(shorts.sum())<6800 or np.any(shorts & (skin>0)):
            raise ValueError('Stock cut would clear other anatomy')
        for item, p in plates.items():
            if p['replace'] and np.any(shorts & (fabrics[item]==0)):
                raise ValueError('A replacement would leave holes in the hips')
        area = (skin>0)&(y>=314)&(y<381)
        hand = component(area & (x<282),(256,339))
        if f in (0,1,6,7):
            rim = np.full(640, 360 if f in (0,7) else 348 if f==1 else 327)
            if f in contact: rim[314:325] = contact[f]
            seed={0:(381,340),1:(366,330),6:(350,335),7:(381,340)}[f]
            hand |= component(area & (x>=rim[:,None]),seed)
        owned=hand & extent
        if np.any(skin[owned]!=255) or np.any(owned & shorts) or owned.sum()<20:
            raise ValueError('The foreground hand must be independently opaque')
        phases.append(dict(body=body_id,stock=stock_id,cut=runs(shorts),hands=runs(owned)))
    return dict(receiver=focus['id'],sha=focus['sourcePackSHA256'],items=plates,phases=phases)


if __name__=='__main__':
    result=json.dumps(register(),separators=(',',':'))+'\n'
    if '--verify' in sys.argv:
        if OUTPUT.read_text(encoding='utf8')!=result:
            raise ValueError('Published waist registration differs')
    else:
        OUTPUT.write_text(result,encoding='utf8')
