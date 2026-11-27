"""Pack approved transparent VFX without resampling. Usage: python tools/pack-haki-rebrand.py ARMAMENT.zip V5.zip"""
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
import json, sys

out=Path('assets/haki/rebrand')
out.mkdir(parents=True,exist_ok=True)
sources=(ZipFile(sys.argv[1]),ZipFile(sys.argv[2]))
clips={}
groups={'armament':[('armament-'+d,d,72) for d in ('south','west','north')],
        'observation':[('focus-south','Observacao/foco-sul',15),('focus-west','Observacao/foco-oeste',15)]+[
         ('dodge-'+d+'-'+layer,'Observacao/esquiva-'+d+'/'+('fundo' if layer=='back' else 'frente'),21)
         for d in ('north','south','west') for layer in ('back','front') if (d,layer)!=('north','front')]}
for idx,(group,defs) in enumerate(groups.items()):
    packed=[]; cells=[]
    for name,src,count in defs:
        paths=sorted(x for x in sources[idx].namelist() if x.startswith(src+'/') and x.endswith('.png'))
        assert len(paths)==count,(src,len(paths))
        clips[name]=dict(group=group,frames=[])
        for p in paths:
            frame=Image.open(BytesIO(sources[idx].read(p))).convert('RGBA')
            assert frame.size==(960,840)
            b=frame.getchannel('A').getbbox()
            if not b: clips[name]['frames'].append(None);continue
            l,t,r,d=b
            target=[0,0,r-l,d-t,l-480,t-560]
            clips[name]['frames'].append(target)
            k=len(packed)
            packed.append(frame.crop(b));cells.append((target,k))
    width=2048; x=y=row=0
    for f,k in sorted(cells,key=lambda x:-x[0][3]):
        _,_,w,h,*_=f
        if x+w+2>width: x=0;y+=row;row=0
        f[0],f[1]=x+1,y+1; x+=w+2;row=max(row,h+2)
    atlas=Image.new('RGBA',(width,y+row))
    for f,k in cells:atlas.paste(packed[k],tuple(f[:2]))
    assert atlas.height<=4096,(group,atlas.size)
    atlas.save(out/(group+'.png'),optimize=True)
    print(group,atlas.size)
(out/'clips.json').write_text(json.dumps(clips,separators=(',',':'))+'\n')
