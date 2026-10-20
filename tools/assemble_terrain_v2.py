"""Package native Wang atlas regions. Palette/border repairs require explicit approval."""
import argparse,json,shutil
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'pixellab-pip-generations/orange-terrain-v2-20261020';DEST=ROOT/'assets/terrain/harbor-v2'
parser=argparse.ArgumentParser();parser.add_argument('--approved-harmonization',action='store_true');args=parser.parse_args();DEST.mkdir(parents=True,exist_ok=True)
pairs={'water-sand':('water','sand'),'sand-grass':('sand','grass'),'grass-stone':('grass','stone'),'dirt-grass':('dirt','grass'),'sand-dirt':('sand','dirt'),'sand-wood':('sand','wood')}
manifest={'status':'review' if args.approved_harmonization else 'draft-palette-review','world_tile_size':64,'chunk_size':512,'sets':{},'bases':{'water':{'set':'water-sand','mask':0},'sand':{'set':'water-sand','mask':15},'dirt':{'set':'sand-dirt','mask':15},'grass':{'set':'sand-grass','mask':15},'stone':{'set':'grass-stone','mask':15},'wood':{'set':'sand-wood','mask':15}},'variants':{}}
report={'harmonization_approved':args.approved_harmonization,'palettes':{},'variants':{}}
manifest['layout']={'workyards':[{'verge':{'x':6,'y':23,'w':5,'h':5},'sand':{'x':7,'y':24,'w':3,'h':3},'soil':{'x':8,'y':25,'w':1,'h':1}}],'soil':[{'x':8,'y':9,'w':2,'h':2}]}
for name,(lower,upper) in pairs.items():
    im=Image.open(RUN/(name+'.png')).convert('RGBA');assert im.size==(128,128)
    if args.approved_harmonization:
        # Two observed flat grass fills only. Do not infer terrain masks from color.
        change={(63,199,41,255):(74,169,59,255),(67,195,41,255):(74,169,59,255)}
        pixels=list(im.getdata());report['palettes'][name]={'replaced_pixels':sum(p in change for p in pixels)};im.putdata([change.get(p,p) for p in pixels])
    im.save(DEST/(name+'.png'))
    metadata=json.loads((RUN/(name+'-metadata.json')).read_text());tiles=[{'corners':t['corners'],'bounding_box':t['bounding_box']} for t in metadata['tileset_data']['tiles']]
    assert len(tiles)==16
    manifest['sets'][name]={'url':'assets/terrain/harbor-v2/'+name+'.png','lower':lower,'upper':upper,'tiles':tiles}
for material in ['grass','sand','stone']:
    original=Image.open(RUN/(material+'-reference.png')).convert('RGBA');edited=Image.open(RUN/(material+'-variation.png')).convert('RGBA');assert original.size==edited.size==(32,32)
    border=[(x,y) for y in range(32) for x in range(32) if min(x,y,31-x,31-y)<4]
    changed=sum(original.getpixel(p)!=edited.getpixel(p) for p in border)
    report['variants'][material]={'changed_border_pixels':changed,'accepted':False}
    if material=='stone':report['variants'][material]['reason']='Rejected: interior changes the connected paving joints rather than adding subtle wear.';continue
    if changed and not args.approved_harmonization:continue
    if args.approved_harmonization:
        for p in border:edited.putpixel(p,original.getpixel(p))
    assert all(edited.getpixel(p)==original.getpixel(p) for p in border)
    edited.save(DEST/(material+'-variation.png'));manifest['variants'][material]=['assets/terrain/harbor-v2/'+material+'-variation.png'];report['variants'][material]['accepted']=True
(DEST/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8');(RUN/'assembly-inspection.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
