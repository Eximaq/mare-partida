"""Import prepared boss movement, basic attacks, special casts and separate VFX, losslessly."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
APPROVED='f2ed9c8d25fd5cd32831c8effe507ee18b72cfcd85a6dfea3fe3f573abca4b5e'
BOSSES={
 'hancock':('Boa Hancock',118,{'area':'south'}),
 'magellan':('Magellan',157,{'projectile':'east','area':'center'}),
 'ace':('Portgas D. Ace',114,{'projectile':'east','area':'center'}),
 'aokiji':('Aokiji',137,{'area':'center'}),
 'akainu':('Akainu',141,{'projectile':'down-right','area':'center'}),
}
CELL=256
ACTOR_ANCHOR=(128,213)
FX_ANCHOR=(128,128)
DIRECTIONS=('south','north','east','west')
ACTIONS=('idle','walk','attack','hurt','special')
sha=lambda data: hashlib.sha256(data).hexdigest()

def clip(blob,entry,name,anchor,*,actor):
    image=Image.open(io.BytesIO(blob))
    if image.mode!='RGBA' or image.size!=(CELL*4,CELL):
        raise ValueError(f'{entry}: expected a four-frame RGBA strip')
    frames=[image.crop((CELL*i,0,CELL*(i+1),CELL)) for i in range(4)]
    bounds=[im.getchannel('A').getbbox() for im in frames]
    if any(not b or min(b[0],b[1],CELL-b[2],CELL-b[3])<1 for b in bounds):
        raise ValueError(f'{entry}: blank or clipped frame: {bounds}')
    if len({im.tobytes() for im in frames})<3:
        raise ValueError(f'{entry}: fewer than three authored phases')
    if actor and name=='idle' and any(abs(b[3]-anchor[1])>2 for b in bounds):
        raise ValueError(f'{entry}: idle pivot drift: {bounds}')
    return frames,dict(size=CELL, frames=4, bounds=bounds, anchor=anchor, png_sha256=sha(blob))

def lookup(z,rel):
    names=set(z.namelist())
    candidates=[p for p in (rel,'frames/'+rel) if p in names]
    if len(candidates)!=1:
        raise ValueError(f'Missing or ambiguous path: {rel}')
    return z.read(candidates[0])

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('archive',type=Path)
    p.add_argument('--approved-south',type=Path,required=True)
    p.add_argument('--effects',type=Path,help='Separate archive with vfx/<slug> files (optional)')
    args=p.parse_args()
    archive_sha=sha(args.archive.read_bytes())
    effects_source=args.effects or args.archive
    effects_sha=sha(effects_source.read_bytes())
    if sha(args.approved_south.read_bytes())!=APPROVED:
        raise ValueError('Approved South archive hash differs')
    files,actors,effects={},{},{}
    with zipfile.ZipFile(args.archive) as z,zipfile.ZipFile(args.approved_south) as original,zipfile.ZipFile(effects_source) as vz:
        if any(bundle.testzip() is not None for bundle in (z,original,vz)):
            raise ValueError('Archive CRC mismatch')
        rows={e['id']:e for e in json.loads(original.read('manifest.json'))}
        for id,(name,height,kinds) in BOSSES.items():
            key=f'dungeon-{id}'
            clips={}
            for action in ACTIONS:
                clips[action]={}
                east=None
                for direction in DIRECTIONS:
                    rel=f'{id}/principal/{direction}/{action}.png'
                    blob=lookup(z,rel)
                    if direction=='south' and blob!=original.read(rel):
                        raise ValueError(f'{rel}: approved South was modified')
                    frames,attrs=clip(blob,rel,action,ACTOR_ANCHOR,actor=True)
                    if direction=='east':
                        east=frames
                    if direction=='west':
                        for src,dst in zip(east,frames):
                            mirror=Image.new('RGBA',(CELL,CELL))
                            mirror.paste(ImageOps.mirror(src),(1,0))
                            if mirror.tobytes()!=dst.tobytes():
                                raise ValueError(f'{rel}: west mirror deviates')
                    file=f'assets/sprites-combat-v2/{key}/{action}-{direction}.png'
                    files[file]=blob
                    fps={'idle':4,'walk':8,'attack':10,'hurt':22.22222222222222,'special':4}[action]
                    clips[action][direction]=dict(**attrs,image=file,fps=fps,loop=action in ('idle','walk'),
                       **({'impact_frame':2} if action in ('attack','special') else {}),
                       **({'frame_durations_ms':rows[id]['specialFrameDurationsMs']} if action=='special' else {}),
                       **({'mirrored_from':'east'} if direction=='west' else {}))
            actors[key]=dict(name=name,monster=True,dungeonBoss=True,worldHeight=height,legacyHeight=height,
               availability='unassigned',directionalHurt=True,source=args.archive.name,archive_sha256=archive_sha,clips=clips)
            effects[id]={}
            for kind,facing in kinds.items():
                rel=f'vfx/{id}/{kind}.png'
                blob=lookup(vz,rel)
                _,attrs=clip(blob,rel,kind,FX_ANCHOR,actor=False)
                file=f'assets/vfx/prepared-dungeon-bosses/{id}/{kind}.png'
                files[file]=blob
                effects[id][kind]=dict(**attrs,nativeFacing=facing, image=file,source=effects_source.name,archive_sha256=effects_sha)
    if len(files)!=108:
        raise ValueError('Expected 100 actor strips + eight effect strips')
    for file,blob in files.items():
        path=ROOT/file
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(blob)
    data=json.dumps(dict(actors=actors,effects=effects),ensure_ascii=False,separators=(',',':'))
    script="'use strict';\n// Generated by tools/import_prepared_dungeon_bosses.py from approved PNGs.\n"
    script+="((root)=>{\nconst data="+data+";\n"
    script+="const registry=root.MareSpriteCombatV2Data;\nfor(const [id,entry] of Object.entries(data.actors)){\n if(registry&&!Object.hasOwn(registry,id))registry[id]=entry;\n}\nroot.MarePreparedDungeonBossArtData=data;\nif(typeof module!=='undefined')module.exports=data;\n})(globalThis);\n"
    (ROOT/'prepared-dungeon-boss-art-data.js').write_text(script,encoding='utf-8')
    print('Imported 100 actor strips and eight independent visual effects; 25 approved South strips unchanged.')

if __name__=='__main__':
    main()
