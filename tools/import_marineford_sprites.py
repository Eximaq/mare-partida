"""Validate and copy the 96 approved directional Marineford PNG strips without recompressing."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
FORMS=(
 ('squard','Squard','squard',192,166,116),
 ('onigumo','Onigumo','onigumo',192,166,134),
 ('jozu','Jozu','jozu',192,166,153),
 ('vista','Vista','vista',192,166,126),
 ('izo','Izo','izo',192,166,112),
 ('oars','Little Oars Jr.','little-oars-jr',256,220,218),
)
APPROVED_SOUTH_SHA256='c75a96d553a321c7ef8e070676d04141402e6b528b48d1a61c343e8120c1dcf6'
DIRECTIONS=('south','north','east','west')
ACTIONS=('idle','walk','attack','hurt')
sha256=lambda b:hashlib.sha256(b).hexdigest()

def parse_png(blob,k,cell):
    img=Image.open(io.BytesIO(blob))
    if img.mode!='RGBA' or img.size!=(4*cell,cell):
        raise ValueError(f'{k}: incorrect PNG mode or dimensions')
    frames=[img.crop((cell*i,0,cell*(i+1),cell)) for i in range(4)]
    bounds=[f.getchannel('A').getbbox() for f in frames]
    if any(b is None or not (0<b[0]<b[2]<cell and 0<b[1]<b[3]<cell) for b in bounds):
        raise ValueError(f'{k}: empty or clipped frames {bounds}')
    if len({f.tobytes() for f in frames})<3:
        raise ValueError(f'{k}: too few unique phases')
    return frames,bounds

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive',type=Path)
    parser.add_argument('--approved-south',type=Path,required=True)
    args=parser.parse_args()
    dig=sha256(args.archive.read_bytes())
    if sha256(args.approved_south.read_bytes())!=APPROVED_SOUTH_SHA256:
        raise ValueError('South source archive digest differs from approval')
    files,entries={},{}
    with zipfile.ZipFile(args.archive) as z, zipfile.ZipFile(args.approved_south) as approved:
        if z.testzip() is not None or approved.testzip() is not None:
            raise ValueError('Invalid archive CRC')
        names=set(z.namelist())
        for slug,name,key,cell,feet,height in FORMS:
            anchor=(cell//2,feet)
            clips={}
            for act in ACTIONS:
                clips[act]={}
                east=None
                for d in DIRECTIONS:
                    rel=f'{slug}/principal/{d}/{act}.png'
                    candidates=[p for p in (rel,'frames/'+rel) if p in names]
                    if len(candidates)!=1:
                        raise ValueError(f'Missing or ambiguous path {rel}')
                    blob=z.read(candidates[0])
                    if d=='south' and blob!=approved.read(rel):
                        raise ValueError(f'Approved south unexpectedly changed: {rel}')
                    f,b=parse_png(blob,rel,cell)
                    if act=='idle' and any(abs(bounds[3]-anchor[1])>2 for bounds in b):
                        raise ValueError(f'{rel}: feet drift away from the anchor')
                    if d=='east':
                        east=f
                    if d=='west':
                        for previous,actual in zip(east,f):
                            wanted=Image.new('RGBA',(cell,cell))
                            wanted.paste(ImageOps.mirror(previous),(1,0))
                            if wanted.tobytes()!=actual.tobytes():
                                raise ValueError(f'Incorrect west mirror {rel}')
                    asset=f'assets/sprites-combat-v2/{key}/{act}-{d}.png'
                    files[asset]=blob
                    clips[act][d]=dict(image=asset,size=cell,frames=4,anchor=anchor,bounds=b,png_sha256=sha256(blob),
                                      fps=dict(idle=4,walk=8,attack=10,hurt=22.22222222222222)[act],
                                      loop=act in ('idle','walk'),**({'impact_frame':2} if act=='attack' else {}),
                                      **({'mirrored_from':'east'} if d=='west' else {}))
            entries[key]=dict(name=name,source=args.archive.name,archive_sha256=dig,availability='unassigned',
                              worldHeight=height,legacyHeight=height,monster=True,directionalHurt=True,clips=clips)
    if len(files)!=96 or len(entries)!=6:
        raise ValueError('Unexpected count')
    for name,blob in files.items():
        p=ROOT/name
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_bytes(blob)
    src="'use strict';\n// Generated from the approved art by tools/import_marineford_sprites.py.\n"
    src+="((root)=>{\nconst entries="+json.dumps(entries,ensure_ascii=False,separators=(',',':'))+";\n"
    src+="const registry=root.MareSpriteCombatV2Data;\nfor(const [id,entry] of Object.entries(entries)){\n if(registry&&!Object.hasOwn(registry,id))registry[id]=entry;\n}\nroot.MareMarinefordSpriteData=entries;\nif(typeof module!=='undefined')module.exports=entries;\n})(globalThis);\n"
    (ROOT/'marineford-sprites.js').write_text(src,encoding='utf-8')
    print('Imported 96 directional strips; 24 approved South strips unchanged.')

if __name__=='__main__':
    main()
