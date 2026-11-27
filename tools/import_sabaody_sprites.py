"""Validate and copy the 144 approved directional Sabaody PNG strips without recompressing."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
CELL=192
ANCHOR=(96,166)
FORMS=(
 ('kuma','principal','kuma','Bartholomew Kuma',158),
 ('kizaru','principal','kizaru','Kizaru',114),
 ('pacifista','principal','pacifista','Pacifista',151),
 ('urouge','principal','urouge','Urouge',125),
 ('urouge','alternativa','urouge-ampliado','Urouge ampliado',156),
 ('hawkins','principal','hawkins','Basil Hawkins',114),
 ('hawkins','alternativa','hawkins-palha','Basil Hawkins de palha',158),
 ('drake','principal','x-drake','X Drake',114),
 ('drake','alternativa','x-drake-zoan','X Drake Zoan',155)
)
DIRECTIONS=('south','north','east','west')
ACTIONS=('idle','walk','attack','hurt')
sha256=lambda b:hashlib.sha256(b).hexdigest()

def parse_png(blob,k):
    img=Image.open(io.BytesIO(blob))
    if img.mode!='RGBA' or img.size!=(4*CELL,CELL):
        raise ValueError(f'{k}: incorrect PNG mode or dimensions')
    frames=[img.crop((CELL*i,0,CELL*(i+1),CELL)) for i in range(4)]
    bounds=[f.getchannel('A').getbbox() for f in frames]
    if any(b is None or not (0<b[0]<b[2]<CELL and 0<b[1]<b[3]<CELL) for b in bounds):
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
    files,entries={},{}
    with zipfile.ZipFile(args.archive) as z, zipfile.ZipFile(args.approved_south) as approved:
        if z.testzip() is not None or approved.testzip() is not None:
            raise ValueError('Invalid archive CRC')
        names=set(z.namelist())
        for slug,form,key,name,height in FORMS:
            clips={}
            for act in ACTIONS:
                clips[act]={}
                east=None
                for d in DIRECTIONS:
                    rel=f'{slug}/{form}/{d}/{act}.png'
                    candidates=[p for p in (rel,'frames/'+rel) if p in names]
                    if len(candidates)!=1:
                        raise ValueError(f'Missing or ambiguous path {rel}')
                    blob=z.read(candidates[0])
                    if d=='south' and blob!=approved.read(rel):
                        raise ValueError(f'Approved south unexpectedly changed: {rel}')
                    f,b=parse_png(blob,rel)
                    if act=='idle' and any(abs(bounds[3]-ANCHOR[1])>2 for bounds in b):
                        raise ValueError(f'{rel}: feet drift away from the anchor')
                    if d=='east':
                        east=f
                    if d=='west':
                        for previous,actual in zip(east,f):
                            wanted=Image.new('RGBA',(CELL,CELL))
                            wanted.paste(ImageOps.mirror(previous),(1,0))
                            if wanted.tobytes()!=actual.tobytes():
                                raise ValueError(f'Incorrect west mirror {rel}')
                    asset=f'assets/sprites-combat-v2/{key}/{act}-{d}.png'
                    files[asset]=blob
                    clips[act][d]=dict(image=asset,size=CELL,frames=4,anchor=ANCHOR,bounds=b,png_sha256=sha256(blob),
                                      fps=dict(idle=4,walk=8,attack=10,hurt=22.22222222222222)[act],
                                      loop=act in ('idle','walk'),**({'impact_frame':2} if act=='attack' else {}),
                                      **({'mirrored_from':'east'} if d=='west' else {}))
            entries[key]=dict(name=name,source=args.archive.name,archive_sha256=dig,
                              worldHeight=height,legacyHeight=height,monster=True,directionalHurt=True,clips=clips)
    if len(files)!=144 or len(entries)!=9:
        raise ValueError('Unexpected count')
    for name,blob in files.items():
        p=ROOT/name
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_bytes(blob)
    src="'use strict';\n// Generated from the approved art by tools/import_sabaody_sprites.py.\n"
    src+="((root)=>{\nconst entries="+json.dumps(entries,ensure_ascii=False,separators=(',',':'))+";\n"
    src+="const registry=root.MareSpriteCombatV2Data;\nfor(const [id,entry] of Object.entries(entries)){\n if(registry&&!Object.hasOwn(registry,id))registry[id]=entry;\n}\nroot.MareSabaodySpriteData=entries;\nif(typeof module!=='undefined')module.exports=entries;\n})(globalThis);\n"
    (ROOT/'sabaody-sprites.js').write_text(src,encoding='utf-8')
    print('Imported 144 directional strips; 36 approved South strips unchanged.')

if __name__=='__main__':
    main()
