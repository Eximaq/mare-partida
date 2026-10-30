"""Import the owner's complete Alubarna export; never modify source pixels."""
import hashlib,io,json,sys,zipfile,collections
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SPECS=[('alubarna-01','Alubarna 01',50,55,'puppu','Puppu',53,110),('alubarna-02','Alubarna 02',55,60,'valentine','Miss Valentine',58,135),('alubarna-03','Alubarna 03',60,65,'merry','Miss Merry Christmas',63,120),('alubarna-04','Alubarna 04',65,70,'doublefinger','Miss Double Finger',68,150),('alubarna-05','Alubarna 05',70,75,'mr1','Mr.1',75,170)]
def main():
 assert len(sys.argv)>1,'Usage: python tools/import_alubarna.py <Alubarna-export.zip>'
 archive=Path(sys.argv[1])
 out=ROOT/'assets/alubarna';out.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(archive) as z:
  meta=json.loads(z.read('map.json'));manifest=json.loads(z.read('objects/manifest.json'))
  config=meta['mapConfig'];w,h=config['dimensions']['pixelWidth'],config['dimensions']['pixelHeight'];tile=config['tileSize']
  assert (w,h,tile)==(6592,5248,64)
  native=z.read('map-composite.png');assert Image.open(io.BytesIO(native)).size==(w,h)
  (out/'map.png').write_bytes(native)
  rows=json.loads((out/'terrain.json').read_text())
  assert len(rows)==82 and all(len(r)==103 for r in rows)
  ox,oy=config['boundingBox']['minX']*tile,config['boundingBox']['minY']*tile
  props=[];masks={}
  for obj in manifest['objects']:
   if not obj.get('visible',True):continue
   raw=z.read('objects/'+obj['filename']);im=Image.open(io.BytesIO(raw)).convert('RGBA');digest=hashlib.sha256(raw).hexdigest()
   aid='alubarna-'+digest[:20];maskfile=ROOT/'assets/map-depth/objects'/(aid+'.png')
   if aid not in masks:maskfile.write_bytes(raw);masks[aid]=digest
   b,g=obj['boundingBox'],obj['groundBounds']
   props.append(dict(id=obj['id'],assetId=aid,x=b['x']-ox,y=b['y']-oy,w=b['width'],h=b['height'],base=g['y']+g['height']-oy,ground=dict(x=g['x']-ox,y=g['y']-oy,w=g['width'],h=g['height']),layer=obj['layer']))
  props.sort(key=lambda p:p['layer'])
  colliders=[]
  for p in props:
   g=p['ground']
   if g['w']<=0 or g['h']<=0:continue
   if p['id']=='db9f81ea-f93d-4265-8227-d1e0b87e7af8':
    # Native gate has two columns and an open arch. Preserve its visible passage.
    for suffix,x in [('left',g['x']),('right',g['x']+g['w']-50)]:
     colliders.append(dict(id=p['id']+'-'+suffix,x=x,y=g['y'],w=50,h=g['h'],isSolid=True,blocksMovement=True,blocksProjectiles=True))
   else:colliders.append(dict(id=p['id'],**g,isSolid=True,blocksMovement=True,blocksProjectiles=True))
  walk='wchougrm';walls='pany'
  for y,row in enumerate(rows):
   x=0
   while x<len(row):
    if row[x] in walk:x+=1;continue
    start=x;projectile=row[x] in walls
    while x<len(row) and row[x] not in walk and (row[x] in walls)==projectile:x+=1
    colliders.append(dict(id=f'terrain-{y}-{start}',x=start*64,y=y*64,w=(x-start)*64,h=64,isSolid=True,blocksMovement=True,blocksProjectiles=projectile))
  def terrain(x,y):
   return rows[int(y//64)][int(x//64)] if 0<=x<w and 0<=y<h else '.'
  def open_at(x,y):
   return all(terrain(x+dx,y+dy) in walk for dx,dy in [(0,0),(-16,-20),(16,-20),(-16,0),(16,0)]) and not any(x+16>p['x'] and x-16<p['x']+p['w'] and y>p['y'] and y-20<p['y']+p['h'] for p in colliders)
  points={(x,y) for y in range(16,h,32) for x in range(16,w,32) if open_at(x,y)}
  remaining=set(points);components=[]
  while remaining:
   seed=remaining.pop();component={seed};todo=collections.deque([seed])
   while todo:
    x,y=todo.popleft()
    for p in [(x+32,y),(x-32,y),(x,y+32),(x,y-32)]:
     if p in remaining:remaining.remove(p);component.add(p);todo.append(p)
   components.append(component)
  connected=max(components,key=len);road=[p for p in connected if terrain(*p)=='c'];assert len(road)>100
  x0,x1=min(x for x,y in road),max(x for x,y in road);y0,y1=min(y for x,y in road),max(y for x,y in road)
  nearest=lambda pts,x,y:min(pts,key=lambda p:((p[0]-x)**2+(p[1]-y)**2,p))
  spawn=nearest(road,(x0+x1)/2,y1+1000)
  targets=[('entrada','Avenida Sul',.4,.84),('mercado','Mercado de Alubarna',.2,.5),('praca','Praça Central',.5,.44),('bairro','Bairro das Torres',.73,.67),('palacio','Avenida do Palácio',.6,.1)]
  candidates=[p for p in road if (p[0]-spawn[0])**2+(p[1]-spawn[1])**2>350**2]
  districts=[]
  for key,name,nx,ny in targets:
   p=nearest(candidates,x0+(x1-x0)*nx,y0+(y1-y0)*ny);districts.append(dict(id=key,name=name,x=p[0],y=p[1]))
  slots=[];used=set()
  for d in districts:
   choices=[p for p in candidates if min(districts,key=lambda a:((a['x']-p[0])**2+(a['y']-p[1])**2,a['id']))['id']==d['id']]
   for dx in [-96,96]:
    p=nearest([p for p in choices if p not in used],d['x']+dx,d['y']+64);used.add(p);slots.append(dict(sector=d['id'],x=p[0],y=p[1]))
  specs=[dict(id=i,name=n,min=lo,max=hi,type=t,monster=mon,level=lv,worldHeight=size) for i,n,lo,hi,t,mon,lv,size in SPECS]
  data=dict(source=dict(mapId=meta['mapId'],name=meta['name'],origin=[ox,oy],archiveSha256=hashlib.sha256(archive.read_bytes()).hexdigest(),imageSha256=hashlib.sha256(native).hexdigest()),width=w,height=h,tile=64,rows=rows,props=props,colliders=colliders,spawn=dict(x=spawn[0],y=spawn[1]),districts=districts,slots=slots,specs=specs)
  (ROOT/'alubarna-map-data.js').write_text("'use strict';\n((r)=>{r.MareAlubarnaData="+json.dumps(data,ensure_ascii=False,separators=(',',':'))+";if(typeof module!=='undefined')module.exports=r.MareAlubarnaData;})(globalThis);\n",encoding='utf8')
  provenance=dict(source=data['source'],dimensions=[w,h],objectCount=len(props),uniqueMasks=len(masks),maskSha256=masks,walkableTerrain=list(walk),projectileWalls=list(walls),collisionSource='Native terrain grid and exported object groundBounds; feet 32x20',connectedGridPoints=len(connected),sharedImage=True)
  (out/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
  print('Imported native full map',w,h,'objects',len(props),'connected points',len(connected),'spawn',spawn,'districts',districts)
if __name__=='__main__':main()
