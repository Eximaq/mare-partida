"""Authored wrist ownership and receiving poses of the North focus rig."""
import hashlib
import io
import json
import zipfile
from functools import lru_cache

from export_staff_coats import BANK, weapons

OPEN_HAND={0:'8a04e32cc28b9a80ea73b47268bf6c9acd8d48d3d82659d869bbc3c9bb50674d',
           7:'a862cc9edc9b9dba03580edf28d115ab06863cbb7b3b4523ef6eb5af07d772eb'}
GRIP='152e48d2429016680d1fcff03fa5e64cfddda3ff69bdccc2e3fd2ddb85f5f085'


def native_alphas():
    import numpy as np
    from PIL import Image
    native=json.loads((BANK/'archives/archive-index.json').read_bytes())['sources']

    @lru_cache(maxsize=60)
    def alpha(key):
        info=native[key]
        with zipfile.ZipFile(BANK/'archives'/info['archive']) as z: data=z.read(info['path'])
        if hashlib.sha256(data).hexdigest()!=key: raise ValueError('Changed native hand')
        im=Image.open(io.BytesIO(data)).convert('RGBA')
        if im.size!=(640,640): raise ValueError('Wrong native hand size')
        return np.asarray(im)[:,:,3]

    return alpha


def hand_contacts():
    import numpy as np
    from PIL import Image
    index=weapons()
    master=next(r for r in index['records'] if r['id']=='orb17-north-native-layers')
    staff=next(r for r in index['records'] if r['id']=='relicary121-north-original-base17-native-item-candidate')
    if master['basePack']!=staff['basePack']: raise ValueError('Different focus body')
    rig=master['basePack']['pack']['directions']['north']
    layers={l['id']:l for l in rig['layers']}
    if any(layers[k]['binding']!={'kind':'fixed'} for k in ('forearm-hand-near','forearm-hand-far','upper-arm-far')):
        raise ValueError('Unexpected moving raster origin')
    alpha=native_alphas()
    def point(p,key): return np.array([p[key]['x'],p[key]['y']])*4
    y,x=np.indices((640,640))
    pins=[];cases={}
    for f,pose in enumerate(rig['poses']):
        refs={k:layers[k]['frames'][f] for k in ('forearm-hand-far','upper-arm-far','forearm-hand-near')}
        at=staff['states'][f]['attachment']
        if at['matrix'][:4]!=[1,0,0,1] or at['depth']!=3: raise ValueError('Unknown staff contact')
        pins.append(dict(refs,open=OPEN_HAND.get(f),gripMatrix=at['matrix']))
        for side,joint in (('near','RIGHT'),('far','LEFT')):
            wrist=point(pose,joint+' ARM')
            axis=point(pose,joint+' HAND CENTER')-wrist
            fore=alpha(refs['forearm-hand-'+side])
            free=(x-wrist[0])*axis[0]+(y-wrist[1])*axis[1]>=-2*np.linalg.norm(axis)
            hands={'hand':np.where(free,fore,0)}
            if side=='far' and f in (2,6):
                # In the authored flex the fingers are on the upper-arm raster.
                # The elbow shares that raster and stays on the body.
                wrist=np.array([381,286]);axis=np.array([-3,-17])
                seam=np.interp(y,[263,268,273,277,282,288,291],[376,373,371,372,376,378,381])
                fingers=(x>=seam)&(x<397)&(y>=263)&(y<=290)
                hands={'hand':np.where(fingers,fore,0),'behind':np.where(fingers,alpha(refs['upper-arm-far']),0)}
                if not 50<np.count_nonzero(hands['behind'])<600: raise ValueError('Missing fingers in the upper arm')
            cases[side,f,'normal']=(axis,hands)
            if side=='near': continue
            if f in OPEN_HAND:
                # The open palm carries the editorial blue/gold orb rim. Its
                # upper edge is protected; cloth only follows the supporting hand.
                wrist0=np.array([379,342]);axis0=np.array([31,5])
                hand=(x-wrist0[0])*31+(y-wrist0[1])*5>=-2*np.linalg.norm(axis0)
                border=np.interp(x,[380,383,386,389,392,395,398,400,402,405,408,411,414,417],
                                   [332,335,338,340,341,343,346,347,346,343,342,339,337,336])
                hand&=~((x>=381)&(x<=416)&(y<border))
                cases[side,f,'open']=(axis0,{'hand':np.where(hand,alpha(OPEN_HAND[f]),0)})
            # The staff's palm is a native plate beneath the original forearm.
            dx,dy=(int(np.floor(n+.5)) for n in at['matrix'][4:])
            hand_grip=np.roll(alpha(GRIP),(dy,dx),axis=(0,1))
            if np.count_nonzero(hand_grip)!=310: raise ValueError('Unexpected supporting grip')
            cases[side,f,'staff']=(axis,dict(hands,grip=hand_grip))
    return rig,pins,cases
