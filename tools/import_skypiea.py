"""Import existing owner exports, preserving pixels; no generation."""
import json,zipfile,io,re,hashlib,collections,sys
from pathlib import Path
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
def main():
 archive=Path(sys.argv[1]); z=zipfile.ZipFile(archive); meta=json.loads(z.read('map.json')); objects=json.loads(z.read('objects/manifest.json'))['objects'];cfg=meta['mapConfig'];tile=cfg['tileSize'];w=cfg['dimensions']['pixelWidth'];h=cfg['dimensions']['pixelHeight'];ox=cfg['boundingBox']['minX']*tile;oy=cfg['boundingBox']['minY']*tile
 cols=w//tile;lines=h//tile;terrain_source=Path(sys.argv[2]);rows=json.loads(terrain_source.read_text(encoding='utf8')) if terrain_source.suffix=='.json' else [m.group(1).lower() for l in terrain_source.read_text(encoding='utf8').splitlines() if (m:=re.match(r'^\s*-?\d+\s+([ESesCc.]{'+str(cols)+r'})$',l))];assert len(rows)==lines
 out=ROOT/'assets/skypiea';out.mkdir(exist_ok=True)
 original=Image.open(z.open('map-composite.png')).convert('RGBA'); (out/'map-original.png').write_bytes(z.read('map-composite.png'))
 # Explicit identities inspected from exported sprites; never classify white pixels.
 clouds={'7f45d7ca-fc6a-4671-adba-818f52f84e87','aa787ff4-a82c-4ea6-8075-60873cfc5c45','3c262ff3-5f0d-4bbe-b4a3-2d6e0e032d4c','2229d024-7ee5-4369-a5d4-540597f4f723','3a4af721-91bd-4dd9-ab73-db8b58d3d49e','0867f127-b508-4200-9809-da04a1f37497','cd546974-d157-4bca-98c8-01f82bd43873'}
 props=[];colliders=[];mask=Image.new('L',(w,h));unique={}
 for o in objects:
  if not o.get('visible',True):continue
  raw=z.read('objects/'+o['filename']);im=Image.open(io.BytesIO(raw)).convert('RGBA');digest=hashlib.sha256(raw).hexdigest();file='object-'+digest[:16]+'.png';(out/file).write_bytes(raw)
  b=o['boundingBox'];g=o['groundBounds'];x=b['x']-ox;y=b['y']-oy;key=o['metadata'].get('duplicatedFromObjectId',o['id']);cloud=key in clouds or o['id'] in clouds
  mask.paste(255,(int(x),int(y),int(x+b['width'])+1,int(y+b['height'])+1))
  p=dict(id=o['id'],url='assets/skypiea/'+file,x=x,y=y,w=b['width'],h=b['height'],base=g['y']+g['height']-oy,cloud=cloud,layer=o['layer']);props.append(p)
  if not cloud:colliders.append(dict(id=o['id'],x=g['x']-ox,y=g['y']-oy,w=g['width'],h=g['height'],isSolid=True,blocksMovement=True,blocksProjectiles=True))
 # Recover the flattened terrain by exact matching against exported native tiles,
 # excluding ALL object bounds, not by colour or guessed cloud pixels.
 tiles=[]
 for ts in meta['tilesets']:
  sheet=Image.open(z.open('tilesets/'+ts['filename'])).convert('RGBA');tiles += [sheet.crop((x*64,y*64,(x+1)*64,(y+1)*64)) for y in range(4) for x in range(4)]
 base={}
 for t in meta['terrains']:
  base[t['id']]=len(tiles);tiles.append(Image.open(z.open('terrain-tiles/terrain-'+str(t['id'])+'.png')).convert('RGBA'))
 tiles.append(Image.new('RGBA',(64,64)))
 a=np.array(original).astype('int16');covered=np.array(mask)>0;arr=np.array([np.array(t) for t in tiles]).astype('int16');ground=Image.new('RGBA',(w,h));bad=0;total=0;patterns=collections.defaultdict(collections.Counter)
 # Fill the export padding with its native sky tile; camera edges never expose black.
 for py in range(0,h,64):
  for px in range(0,w,64):ground.paste(tiles[base[1]],(px,py))
 for yy in range(h//64-1):
  for xx in range(w//64-1):
   x,y=xx*64+32,yy*64+32;visible=~covered[y:y+64,x:x+64];src=a[y:y+64,x:x+64];scores=np.abs(arr-src).sum(axis=3)
   if visible.any():idx=int(scores[:,visible].sum(axis=1).argmin());bad+=int((scores[idx][visible]>0).sum());total+=int(visible.sum())
   else:idx=base[3] if rows[yy][xx]=='c' and 3 in base else base[2] if rows[yy][xx]=='s' else base[1]
   pattern=(rows[yy][xx],rows[yy][xx+1],rows[yy+1][xx],rows[yy+1][xx+1])
   if visible.any():patterns[pattern][idx]+=int(visible.sum())
   ground.paste(tiles[idx],(x,y))
 assert bad==0, 'Native terrain reconstruction must match every uncovered pixel'
 # Resolve occluded/tied cells from native Wang identities rather than guessing
 # a sky tile when the decorative cloud hid every distinguishing terrain pixel.
 for yy in range(h//64-1):
  for xx in range(w//64-1):
   x,y=xx*64+32,yy*64+32;visible=~covered[y:y+64,x:x+64]
   if visible.all():continue
   pattern=(rows[yy][xx],rows[yy][xx+1],rows[yy+1][xx],rows[yy+1][xx+1])
   idx=patterns[pattern].most_common(1)[0][0]
   if not visible.any() or np.array_equal(arr[idx][visible],a[y:y+64,x:x+64][visible]):ground.paste(tiles[idx],(x,y))
 # Owner-requested repair: only gaps covered by decorative cloud objects or
 # enclosed gaps touching those objects; never fill the surrounding open sky.
 source_rows=rows[:];edited=[list(r) for r in rows];cloud_props=[p for p in props if p['cloud']]
 def under_cloud(x,y):
  return any(p['x']-16<=x*64+32<=p['x']+p['w']+16 and p['y']-16<=y*64+32<=p['y']+p['h']+16 for p in cloud_props)
 empty={(x,y) for y,r in enumerate(rows) for x,v in enumerate(r) if v not in 'sc'};patch=set()
 while empty:
  seed=empty.pop();part={seed};todo=[seed];edge=False
  while todo:
   x,y=todo.pop();edge |= x in (0,cols-1) or y in (0,lines-1)
   for pt in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
    if pt in empty:empty.remove(pt);part.add(pt);todo.append(pt)
  if not edge and any(under_cloud(x,y) for x,y in part):patch.update(part)
 for y,r in enumerate(rows):
  for x,v in enumerate(r):
   if v not in 'sc' and under_cloud(x,y) and any(0<=xx<cols and 0<=yy<lines and rows[yy][xx] in 'sc' for yy in range(y-2,y+3) for xx in range(x-2,x+3)):patch.add((x,y))
 for x,y in patch:edited[y][x]='s'
 rows=[''.join(r) for r in edited];repaired=[]
 for yy in range(h//64-1):
  for xx in range(w//64-1):
   corners=[(xx,yy),(xx+1,yy),(xx,yy+1),(xx+1,yy+1)]
   if not any(pt in patch for pt in corners):continue
   pattern=tuple(rows[y][x] for x,y in corners)
   assert pattern in patterns, ('Missing native transition',pattern)
   idx=patterns[pattern].most_common(1)[0][0]
   ground.paste(tiles[idx],(xx*64+32,yy*64+32));repaired.append([xx,yy])
 (out/'terrain-original.json').write_text(json.dumps(source_rows),encoding='utf8')
 # Empty export padding gets the existing sky, not a black void.
 background=Image.new('RGBA',(w,h))
 for py in range(0,h,64):
  for px in range(0,w,64):background.paste(tiles[base[1]],(px,py))
 background.alpha_composite(ground);ground=background
 ground.save(out/'ground.png')
 (out/'terrain.json').write_text(json.dumps(rows),encoding='utf8')
 def land(x,y):return 0<=x<w and 0<=y<h and rows[int(y//64)][int(x//64)] in 'sc'
 def opened(x,y):return all(land(x+dx,y+dy) for dx,dy in [(0,0),(-16,-20),(16,-20),(-16,0),(16,0)]) and not any(x+16>p['x'] and x-16<p['x']+p['w'] and y>p['y'] and y-20<p['y']+p['h'] for p in colliders)
 pts={(x,y) for y in range(16,h,32) for x in range(16,w,32) if opened(x,y)};components=[]
 while pts:
  seed=pts.pop();part={seed};todo=[seed]
  while todo:
   x,y=todo.pop()
   for p in [(x+32,y),(x-32,y),(x,y+32),(x,y-32)]:
    if p in pts:pts.remove(p);part.add(p);todo.append(p)
  components.append(part)
 connected=max(components,key=len);nearest=lambda x,y:min(connected,key=lambda p:(p[0]-x)**2+(p[1]-y)**2)
 spawn=nearest(w*.5,h*.72);districts=[dict(id='sky-'+str(i),name=n,x=(pt:=nearest(x,y))[0],y=pt[1]) for i,(n,x,y) in enumerate([('Jardins Celestes',w*.35,h*.42),('Ruínas dos Anjos',w*.55,h*.3),('Bosque das Nuvens',w*.65,h*.54)])]
 slots=[]
 for d in districts:
  for dx in [-80,80]:
   p=nearest(d['x']+dx,d['y']+64);slots.append(dict(id='skypiea-01-'+str(len(slots)),sector=d['id'],type='satori',x=p[0],y=p[1]))
 data=dict(width=w,height=h,tile=64,rows=rows,props=props,colliders=colliders,spawn=dict(x=spawn[0],y=spawn[1]),districts=districts,slots=slots)
 (ROOT/'skypiea-map-data.js').write_text("'use strict';\n((r)=>{r.MareSkypieaData="+json.dumps(data,separators=(',',':'))+";if(typeof module!=='undefined')module.exports=r.MareSkypieaData;})(globalThis);\n",encoding='utf8')
 receipt=dict(mapId=meta['mapId'],sourceName=meta['name'],archiveSha256=hashlib.sha256(archive.read_bytes()).hexdigest(),cloudIds=[p['id'] for p in props if p['cloud']],terrainUncoveredPixels=total,terrainMatchingPixels=total-bad,cloudCollision=False,newGenerations=0,upperTerrainFilledVertices=sorted([list(p) for p in patch]),repairedTiles=repaired)
 (out/'provenance.json').write_text(json.dumps(receipt,indent=2),encoding='utf8');print(receipt)
if __name__=='__main__':main()
