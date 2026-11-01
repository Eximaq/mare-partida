"""Import owner Rank S exports unchanged and precompute animation anchors once."""
import argparse,json,hashlib
from pathlib import Path
from collections import deque
from statistics import median
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCES={
 'yami':('Yami Yami no Mi',{'fruit.png':None,'skill-1.png':'Skill 1 Yami.png','skill-2.png':'Skill 2.png','skill-3.png':'Skill 3.png'},{'yamiAura':'Aura Yami','vortex':'Yami 1','blackHole':'Black Hole','liberation':'Porrada chao'}),
 'mera':('Mera Mera no Mi',{'fruit.png':'Mera Mera no Mi.png','skill-1.png':'Skill 1 Mera.png','skill-2.png':'Skill 2 Mera.png','skill-3.png':'Skill 3 Mera.png'},{'meraAura':'aura','fireFist':'your-sprite-take-4','fireRain':'chuva','pillar':'Espiral','burn':'your-sprite-take-6'})}
def anchor(im):
 # Largest enclosed transparent region is the center of the ring, not the
 # erroneous shared JSON anchor (40,72) used by several differently sized sheets.
 alpha=im.getchannel('A');w,h=im.size;seen=set();holes=[]
 for y in range(h):
  for x in range(w):
   if (x,y) in seen or alpha.getpixel((x,y))>16:continue
   q=deque([(x,y)]);seen.add((x,y));points=[];edge=False
   while q:
    a,b=q.popleft();points.append((a,b));edge=edge or a in (0,w-1) or b in (0,h-1)
    for c,d in [(a-1,b),(a+1,b),(a,b-1),(a,b+1)]:
     if 0<=c<w and 0<=d<h and (c,d) not in seen and alpha.getpixel((c,d))<=16:seen.add((c,d));q.append((c,d))
   if not edge and len(points)>16:holes.append(points)
 band=alpha.crop((0,int(h*.58),w,h));box=band.point(lambda a:255 if a>=64 else 0).getbbox() or (0,0,w,h);cx=(box[0]+box[2])/2
 candidates=[p for p in holes if len(p)>64 and (min(y for x,y in p)+max(y for x,y in p))/2>h*.45]
 cy=None
 if candidates:
  p=max(candidates,key=len);cy=(min(y for x,y in p)+max(y for x,y in p))/2
 return {'x':cx,'y':cy}
def main(source):
 effects={};origins=[]
 for family,(folder,icons,sheets) in SOURCES.items():
  directory=source/folder;out=ROOT/'assets/akuma'/family;out.mkdir(parents=True,exist_ok=True)
  icons=dict(icons)
  if icons['fruit.png'] is None:
   named=directory/'Yami Yami no Mi.png';icons['fruit.png']=named.name if named.exists() else next(f.name for f in directory.glob('Crie itens*.png'))
  files={**icons,**{name+ext:name+ext for name in sheets.values() for ext in ['.png','.json']}}
  for dest,original in files.items():
   raw=(directory/original).read_bytes();(out/dest).write_bytes(raw);origins.append({'file':(out/dest).relative_to(ROOT).as_posix(),'source':folder+'/'+original,'sha256':hashlib.sha256(raw).hexdigest()})
  for key,name in sheets.items():
   frames=json.loads((out/(name+'.json')).read_text(encoding='utf-8'))['frames'];image=Image.open(out/(name+'.png'));native=[]
   for f in frames:
    b=f['frame'];crop=image.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']));native.append({**b,'duration':f['duration'],'pivot':f.get('pivot'),'anchor':anchor(crop) if key in ('yamiAura','meraAura') else {'x':b['w']/2,'y':b['h']/2}})
   if key in ('yamiAura','meraAura'):
    values=[f['anchor']['y'] for f in native[:35] if f['anchor']['y'] is not None];reference=median(values) if values else native[0]['h']*.7
    for f in native:
     if f['anchor']['y'] is None or abs(f['anchor']['y']-reference)>3:f['anchor']['y']=reference
   effects[key]={'image':'assets/akuma/'+family+'/'+name+'.png','frames':native};image.close()
 rules=json.loads((ROOT/'assets/akuma/rank-s-rules.json').read_text(encoding='utf-8'))
 for k in rules:rules[k]['effectKeys']=[key for key in SOURCES[k][2]]
 (ROOT/'assets/akuma/rank-s-manifest.json').write_text(json.dumps({'origin':'Owner-supplied Rank S PNG/JSON; bytes unchanged','files':origins},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (ROOT/'rank-s-data.js').write_text("'use strict';\nglobalThis.MareRankSData="+json.dumps({'rules':rules,'effects':effects},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);main(p.parse_args().source)
