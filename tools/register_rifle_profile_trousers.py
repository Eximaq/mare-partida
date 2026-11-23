"""Register original profile trousers on the eight firearm recoil drawings."""
import io
import json
import sys
import zipfile
from pathlib import Path
from register_blade_trousers import generate, materialize as materialize_cloth

OUTPUT=Path(__file__).resolve().parent/'rework-combat-wardrobe/rifle-profile-trousers.zip'


def firearm_rig(weapons):
    """The item registration supplies physical anatomy and never filters neighboring clothes."""
    result={}
    for direction in ('east','west'):
        rx=next(r for r in weapons['records'] if r['item']==4 and r['body']=='male' and r['direction']==direction)
        if rx['fps']!=12 or rx['timeline']!=list(map(str,range(8))):raise ValueError('Wrong recoil clock')
        result[direction]=rx['basePack']['pack']
    return {'rifle':result}


def materialize(bank):
    return materialize_cloth(bank,OUTPUT)


if __name__=='__main__':
    data=generate(firearm_rig)
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUTPUT) as archive:
            prev=json.loads(archive.read('register.json'));cur=json.loads(data['register.json'])
            if prev['sources']!=cur['sources'] or prev['rigs']!=cur['rigs']:raise ValueError('Changed rifle trousers authority')
            for n,rows in cur['items']['rifle'].items():
                for a,b in zip(prev['items']['rifle'][n],rows,strict=True):
                    original=Image.open(io.BytesIO(archive.read(a['art']+'.png')))
                    new=Image.open(io.BytesIO(data[b['art']+'.png']))
                    if (a['x'],a['y'],original.size,original.tobytes())!=(b['x'],b['y'],new.size,new.tobytes()):
                        raise ValueError('Changed rifle waist registration')
    else:
        with zipfile.ZipFile(OUTPUT,'w') as z:
            for k,v in sorted(data.items()):z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
