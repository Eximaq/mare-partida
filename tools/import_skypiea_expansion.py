"""Recover the Sky Island ZIP's native terrain and authored props.

The map editor export omits its vertex grid. Recover it from the 4x4 Wang
atlases, matching the composited map outside authored object bounds. Each
unknown vertex remains non-walkable. No visual model is generated.
"""
import collections
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
# Exporter's standard tile order (NW, NE, SW, SE) confirmed against both atlas images.
# Index 0 has NW, NE and SE; index 8 has NW, SW and SE.
WANG = (11, 5, 2, 3, 6, 1, 0, 8, 13, 12, 4, 10, 15, 7, 9, 14)
GOLDEN_ARCH = 'd575994fe59a4ca2'
BOAT = 'b834edae9a8c7480'
BRIDGES = {'f24dee85feb98765': 'horizontal', 'c61a473ca380a266': 'vertical'}
DECOR = {BOAT, '3e895cbbe41b424a'}  # floating boat and low ornamental flowers

def run(archive):
    with zipfile.ZipFile(archive) as z:
        meta = json.loads(z.read('map.json'))
        cfg = meta['mapConfig']
        assert cfg['tileSize'] == 64
        w, h = (cfg['dimensions'][k] for k in ('pixelWidth','pixelHeight'))
        ox, oy = (cfg['boundingBox'][k]*64 for k in ('minX','minY'))
        nx, ny = w//64, h//64
        out = ROOT/'assets/skypiea/anjos'
        out.mkdir(parents=True, exist_ok=True)
        orig = Image.open(io.BytesIO(z.read('map-composite.png'))).convert('RGBA')
        assert orig.size == (w,h)
        source = np.array(orig)
        covered = np.zeros((h,w), dtype=bool)
        props, colliders, bridges = [], [], []
        for o in sorted(json.loads(z.read('objects/manifest.json'))['objects'],key=lambda v:v['layer']):
            if not o.get('visible',True): continue
            b, g = o['boundingBox'], o['groundBounds']
            x, y = b['x']-ox, b['y']-oy
            if b['width']<=0 or b['height']<=0: continue
            raw = z.read('objects/'+o['filename'])
            hex16 = hashlib.sha256(raw).hexdigest()[:16]
            file='object-'+hex16+'.png'
            (out/file).write_bytes(raw)
            if hex16 == GOLDEN_ARCH:
                # The exported bounding box spans the opening, but its transparent
                # canvas does not obscure the stone path underneath.
                alpha = Image.open(io.BytesIO(raw)).convert('RGBA').getchannel('A').filter(ImageFilter.MaxFilter(5))
                assert alpha.size == (b['width'], b['height']) and int(x)==x and int(y)==y
                sx,sy=int(x),int(y)
                covered[sy:sy+alpha.height,sx:sx+alpha.width] |= np.array(alpha)>0
            else:
                covered[max(0,int(y)):min(h,int(y+b['height'])+2),max(0,int(x)):min(w,int(x+b['width'])+2)]=True
            p=dict(id=o['id'],url='assets/skypiea/anjos/'+file,x=x,y=y,w=b['width'],h=b['height'],
                   base=g['y']+g['height']-oy,cloud=False,layer=o['layer'])
            props.append(p)
            if hex16 in BRIDGES:
                # The image includes rails and transparent padding; use the visible deck.
                im=Image.open(io.BytesIO(raw)).convert('RGBA')
                l,t,r,bt=im.getchannel('A').getbbox()
                lx,ty=x+l*b['width']/im.width,y+t*b['height']/im.height
                bw,bh=(r-l)*b['width']/im.width,(bt-t)*b['height']/im.height
                if BRIDGES[hex16]=='horizontal': ty+=bh*.16;bh*=.68
                else: lx+=bw*.21;bw*=.58
                bridges.append(dict(id=o['id'],x=lx,y=ty,w=bw,h=bh))
            elif hex16 == GOLDEN_ARCH:
                # Two visible feet only; no movement or projectile wall in the arch.
                for suffix,dx in [('left',0),('right',g['width']-51)]:
                    colliders.append(dict(id=o['id']+'-'+suffix,x=g['x']-ox+dx,y=g['y']-oy,w=51,h=g['height'],
                                          isSolid=True,blocksMovement=True,blocksProjectiles=True))
            elif hex16 not in DECOR and g['width']>0 and g['height']>0:
                colliders.append(dict(id=o['id'],x=g['x']-ox,y=g['y']-oy,w=g['width'],h=g['height'],
                                      isSolid=True,blocksMovement=True,blocksProjectiles=True))
        ims, patterns = [], []
        ground_names={1:'c',2:'s',3:'.'}
        for ts in meta['tilesets']:
            sheet=Image.open(io.BytesIO(z.read('tilesets/'+ts['filename']))).convert('RGBA')
            lo,hi=(ground_names[ts[k]] for k in ('lowerTerrainId','upperTerrainId'))
            for i, bits in enumerate(WANG):
                x,y=i%4*64,i//4*64
                ims.append(sheet.crop((x,y,x+64,y+64)))
                patterns.append(tuple(hi if bits&(1<<n) else lo for n in range(4)))
        for k in (1,2,3):
            ims.append(Image.open(io.BytesIO(z.read(f'terrain-tiles/terrain-{k}.png'))).convert('RGBA'))
            patterns.append((ground_names[k],)*4)
        ims.append(Image.new('RGBA',(64,64))); patterns.append(('.',)*4)
        atlas=np.array([np.array(im) for im in ims])
        fit={}
        votes=[[collections.Counter() for x in range(nx)] for y in range(ny)]
        matched=visible_count=0
        for yy in range(ny-1):
            for xx in range(nx-1):
                x,y=xx*64+32,yy*64+32
                ref=source[y:y+64,x:x+64]
                seen=~covered[y:y+64,x:x+64]
                if not seen.any(): continue
                # Resolve likely exact tiles on a regular sample, verify every uncovered pixel.
                sm=seen[::4,::4]
                if sm.any():
                    score=np.count_nonzero(np.any(atlas[:,::4,::4][:,sm]!=ref[::4,::4][sm],axis=2), axis=1)
                    possible=np.flatnonzero(score==score.min())
                else: possible=np.arange(len(atlas))
                count=np.count_nonzero(np.any(atlas[possible][:,seen]!=ref[seen],axis=2),axis=1)
                best=int(possible[count.argmin()])
                errors=int(count.min()); total=int(seen.sum())
                matched+=total-errors;visible_count+=total
                fit[xx,yy]=best
                tied=possible[count==errors]
                if errors>max(12,total*.04) or total<16: continue
                for j,(dx,dy) in enumerate(((0,0),(1,0),(0,1),(1,1))):
                    options={patterns[i][j] for i in tied}
                    if len(options)==1:votes[yy+dy][xx+dx][options.pop()]+=total
        rows=[''.join((c.most_common(1)[0][0] if c else '.') for c in row) for row in votes]
        # Fill the padding with the native sky tile. Use supported fitted tile
        # pixels where known; under fully-covered props use the inferred quad.
        sky=ims[-2]
        ground=Image.new('RGBA',(w,h))
        for y in range(0,h,64):
            for x in range(0,w,64): ground.paste(sky,(x,y))
        for yy in range(ny-1):
            for xx in range(nx-1):
                key=(xx,yy); idx=fit.get(key)
                if idx is None:
                    pat=(rows[yy][xx],rows[yy][xx+1],rows[yy+1][xx],rows[yy+1][xx+1])
                    idx=patterns.index(pat) if pat in patterns else (32 if '.' not in pat else len(atlas)-2)
                ground.alpha_composite(ims[idx],(xx*64+32,yy*64+32))
        assert matched/visible_count > .98, (matched,visible_count)
        # Save the terrain, not the flattened reference, so runtime props can
        # use their native layers and collision footprints without double paint.
        ground.save(out/'ground.webp',lossless=True,method=4)
        def openpx(x,y):
            if not 0<=x<w or not 0<=y<h:return False
            return rows[int(y//64)][int(x//64)] in 'sc' or any(p['x']<=x<=p['x']+p['w'] and p['y']<=y<=p['y']+p['h'] for p in bridges)
        def walk(x,y):
            return all(openpx(x+dx,y+dy) for dx,dy in [(0,0),(-16,-20),(16,-20),(-16,0),(16,0)]) and not any(
                x+16>p['x'] and x-16<p['x']+p['w'] and y>p['y'] and y-20<p['y']+p['h'] for p in colliders)
        # Align authored destinations with the actual 16 px navigation cell
        # centers. A walkable point on a cell boundary can be missed by A*.
        nav_cell=16
        todo={(x,y) for y in range(8,h,nav_cell) for x in range(8,w,nav_cell) if walk(x,y)}; parts=[]
        while todo:
            seed=todo.pop(); part={seed}; q=[seed]
            for x,y in q:
                for dx,dy in [(-nav_cell,0),(nav_cell,0),(0,-nav_cell),(0,nav_cell)]:
                    v=x+dx,y+dy
                    if v in todo and all(walk(x+dx*k/4,y+dy*k/4) for k in (1,2,3)):
                        todo.remove(v);part.add(v);q.append(v)
            parts.append(part)
        connected=max(parts,key=len)
        assert len(connected)>1000
        def nearest(x,y,skip=()):
            free=(p for p in connected if all((p[0]-q[0])**2+(p[1]-q[1])**2>96**2 for q in skip))
            a,b=min(free,key=lambda p:((p[0]-x)**2+(p[1]-y)**2,p[1],p[0]))
            return dict(x=a,y=b)
        basis=[
            (75,80,'satori','Satori',77,(1520,2600),[(2260,2570),(3600,2460),(4860,2450)]),
            (80,85,'shura','Shura',84,(2100,2930),[(2630,3080),(3870,3230),(5260,3230)]),
            (85,90,'gendatsu','Gendatsu',88,(5950,2880),[(5980,1960),(5130,1250),(4690,2250)]),
            (90,95,'ohm','Ohm',95,(2140,1460),[(2940,990),(3490,1520),(4270,1000)]),
        ]
        spec=[]
        names=['Jardins Celestes','Ruínas dos Anjos','Bosque das Nuvens']
        for n,(mn,mx,t,name,lv,start,spots) in enumerate(basis,1):
            mid=f'skypiea-{n:02}'
            spawn=nearest(*start);used=[(spawn['x'],spawn['y'])]
            districts,slots=[],[]
            for i,(sx,sy) in enumerate(spots):
                d=dict(id='sky-'+str(i),name=names[i],**nearest(sx,sy,used));districts.append(d)
                for dx in (-112,112):
                    loc=nearest(d['x']+dx,d['y']+32,used);used.append((loc['x'],loc['y']))
                    slots.append(dict(id=f'{mid}-{len(slots)}',sector=d['id'],type=t,**loc))
            spec.append(dict(id=mid,name='Ilha dos Anjos'+(f' {n}' if n>1 else ''),min=mn,max=mx,type=t,monster=name,
                             level=lv,spawn=spawn,districts=districts,slots=slots))
        data=dict(width=w,height=h,tile=64,groundUrl='assets/skypiea/anjos/ground.webp',
                  rows=rows,props=props,colliders=colliders,bridgeDecks=bridges,
                  spawn=spec[0]['spawn'],districts=spec[0]['districts'],slots=spec[0]['slots'],specs=spec)
        (ROOT/'skypiea-map-data.js').write_text("'use strict';\n((r)=>{r.MareSkypieaData="+json.dumps(data,separators=(',',':'))+
            ";if(typeof module!=='undefined')module.exports=r.MareSkypieaData;})(globalThis);\n",encoding='utf8')
        (out/'provenance.json').write_text(json.dumps(dict(sourceArchiveSha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
            mapId=meta['mapId'],width=w,height=h,objects=len(props),bridgeDecks=len(bridges),terrainMatchingPixels=matched,
            terrainUncoveredPixels=visible_count,connectedSampleCells=len(connected)),indent=2)+'\n')
        print((out/'provenance.json').read_text())

if __name__=='__main__': run(Path(sys.argv[1]))
