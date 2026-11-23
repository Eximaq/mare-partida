"""Recover the original shorts component beneath the twelve-state South punch."""
import json
import hashlib
import io
import sys
import zipfile
from functools import lru_cache

from export_staff_coats import BANK, weapons
from register_south_focus_trousers import ROOT, BASE, index

OUTPUT = ROOT/'tools/rework-combat-wardrobe/south-punch-waist.json'

def generate():
    import numpy as np
    from PIL import Image, ImageDraw
    records = {bank:json.loads((bank/'archives/archive-index.json').read_bytes())['sources'] for bank in (BASE,BANK)}
    @lru_cache(maxsize=20)
    def read(bank,key):
        ref = records[bank][key]
        with zipfile.ZipFile(bank/'archives'/ref['archive']) as archive:
            data = archive.read(ref['path'])
        if hashlib.sha256(data).hexdigest()!=key:
            raise ValueError('Changed original layer '+key)
        image = Image.open(io.BytesIO(data)).convert('RGBA')
        if image.size!=(640,640):
            raise ValueError('Unexpected size for a waist layer')
        return np.array(image)

    rig = next(r for r in index(BASE)['records'] if r['id']=='male-attack-unarmed-south-drawn8')
    direction = rig['pack']['directions']['south']
    if rig['pack']['density']!=4 or rig['pack']['pivot']!={'x':80,'y':128} or len(direction['poses'])!=8:
        raise ValueError('Incompatible original body')
    layers = {l['id']:l for l in direction['layers']}
    shorts = layers['shorts-phase']
    skin = layers['skin-arms-phase']
    receiver = next(r for r in weapons()['orderedAttackProfiles'] if r['id']=='authored-ordered-14-south')
    if len(receiver['states'])!=12:
        raise ValueError('Changed native punch')
    states = [s['layers'][0]['sha256'] for s in receiver['states']]
    frames = []
    for phase,(s,a) in enumerate(zip(shorts['frames'],skin['frames'],strict=True)):
        plate,body = read(BASE,s),read(BASE,a)
        original = read(BANK,states[phase if phase<7 else 11])
        mask = Image.fromarray((plate[:,:,3]>0).astype('uint8')).copy()
        if mask.getpixel((320,354))!=1:raise ValueError('Waist seam missing')
        ImageDraw.floodfill(mask,(320,354),255)
        owned = np.asarray(mask)==255
        if (not 6000<int(owned.sum())<7000 or np.any(owned & (body[:,:,3]>0)) or
                not np.array_equal(original[owned],plate[owned])):
            raise ValueError('Shorts ownership failed in phase '+str(phase))
        spans = np.flatnonzero(np.diff(np.r_[False,owned.ravel(),False])).reshape(-1,2)
        frames.append({'source':s,'cut':[[int(start),int(end-start)] for start,end in spans]})
    return dict(rig=rig['sourcePackSHA256'],body=states,frames=frames)

if __name__=='__main__':
    encoded=json.dumps(generate(),separators=(',',':'))+'\n'
    if '--verify' in sys.argv:
        if OUTPUT.read_text(encoding='utf8')!=encoded:raise ValueError('Changed stock waist')
    else:
        OUTPUT.write_text(encoded,encoding='utf8')
