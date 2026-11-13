"""Import frozen garment-only PNG bytes onto the existing original male body."""
import json,zipfile,hashlib,base64,copy,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; OUT=Path(__file__).resolve().parent
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parents[1]/'male-torsos-frozen'
base=json.loads((ROOT/'tools/rework-base-hd/index.json').read_text())
bm=json.loads((ROOT/'tools/rework-base-hd/archives/archive-index.json').read_text())
print(bm.keys())
def bbytes(s):
 spec=bm['sources'][s]
 with zipfile.ZipFile(ROOT/'tools/rework-base-hd/archives'/spec['archive']) as z:return z.read(spec['path'])
records=[];assets={};evidence=[]
exclude=re.compile(r'^(torso$|headBase$|hair$|face$|armRight$|armLeft$|handRight$|handLeft$|lower-redrawn$|clothed018-|near-upper-arm$|near-forearm-hand$|equip-|pants133-|own-waist-|male-distal-|male-wrist-through-|male-hand-through-)')
for source in sorted(SOURCE.glob('*.zip')):
 with zipfile.ZipFile(source) as z:
  for name in z.namelist():
   match=re.match(r'torso_(\d+)_',name)
   if not match:continue
   item=int(match[1]); raw=z.read(name);j=json.loads(raw)
   for direction,d in j['pack']['directions'].items():
    b=next(r for r in base['records'] if r['body']=='male' and r['action']=='walk' and r['direction']==direction and r.get('hairStyle')=='original')
    bd=b['pack']['directions'][direction]
    assert bd['rest']==d['rest'],(item,direction,'rest')
    posesMatch=bd['poses']==d['poses']
    body=copy.deepcopy(bd['layers']); garment=[copy.deepcopy(l) for l in d['layers'] if not exclude.search(l['id'])]
    assert garment
    for l in body:
     l['id']='base:'+l['id']
     for s in [l.get('source')]+l.get('frames',[]):
      if s and s not in assets:assets[s]=bbytes(s)
    for l in garment:
     l['slot']='top' if l.get('depth',0)>=0 else 'underArms'
     for k in ['source','frames']:
      if k not in l:continue
      vals=l[k] if k=='frames' else [l[k]];refs=[]
      for s in vals:
       blob=base64.b64decode(j['images'][s].split(',',1)[1]);sha=hashlib.sha256(blob).hexdigest();assets[sha]=blob;refs.append(sha)
      l[k]=refs if k=='frames' else refs[0]
    p=copy.deepcopy(b['pack']);p['directions']={direction:copy.deepcopy(bd)}
    p['directions'][direction]['layers']=body+garment
    refs=sorted({s for l in body+garment for s in [l.get('source')]+l.get('frames',[]) if s})
    r=dict(id=f'male-torso{item}-{direction}-frozen-walk-native',body='male',direction=direction,action='walk',equipment={'torso':item},candidate=True,status='frozen-source-fit-candidate',sourceRefs=refs,pack=p,baseRecord=b['id'],sourcePackage=name,sourcePackSHA256=hashlib.sha256(raw).hexdigest(),sourceSelection=j.get('selection'),approvalPolicy='Preserved frozen selection; no new approval inferred',calibrationPending=True)
    if direction=='west':r['mirrorLayerIDs']=[l['id'] for l in body]
    if item==172 and direction in ['east','west']:r['refinementPending']='User-requested sleeve/glove edge refinement retained; integration is not approval.'
    records.append(r)
    idle=copy.deepcopy(r);idle.update(id=r['id'].replace('-walk-','-idle-'),action='idle')
    dd=idle['pack']['directions'][direction];dd['clip']={'frames':1,'fps':4,'loop':False};dd['poses']=dd['poses'][:1]
    for l in dd['layers']:
     if l.get('frames'):l['frames']=l['frames'][:1];l['source']=l['frames'][0]
    idle['sourceRefs']=sorted({s for l in dd['layers'] for s in [l.get('source')]+l.get('frames',[]) if s})
    records.append(idle)
    evidence.append({'item':item,'direction':direction,'base':b['id'],'exactRest':True,'posesIdentical':posesMatch,'garmentLayers':[l['id']for l in garment],'excludedSourceLayers':[l['id']for l in d['layers']if exclude.search(l['id'])]})
archive='male-frozen-torsos-garment-only-v1.zip';dest=ROOT/'tools/rework-modular-outfits-hd/archives'/archive
with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_STORED) as z:
 for sha,data in sorted(assets.items()):z.writestr(sha+'.png',data)
entry={'file':archive,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'pngCount':len(assets),'compression':'stored'}
(OUT/'records.json').write_text(json.dumps(records,separators=(',',':')))
(OUT/'archive-fragment.json').write_text(json.dumps({'archives':[entry],'sources':{s:{'archive':archive,'path':s+'.png','bytes':len(assets[s])}for s in assets}},separators=(',',':')))
(OUT/'proof.json').write_text(json.dumps({'records':len(records),'assets':len(assets),'evidence':evidence},indent=2))
print(len(records),len(assets),dest.stat().st_size)
