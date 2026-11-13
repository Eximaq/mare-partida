"""Candidate registrations; source PNGs unchanged. No new approval implied."""
exec(open(__file__.replace('attack.py','build.py')).read().split('records=[];assets={}')[0])
import math,ast
records=json.loads((OUT/'records.json').read_text());frag=json.loads((OUT/'archive-fragment.json').read_text());archive=frag['archives'][0]['file'];dest=ROOT/'tools/rework-modular-outfits-hd/archives'/archive
with zipfile.ZipFile(dest)as z:assets={n[:-4]:z.read(n)for n in z.namelist()}
module=ast.parse((ROOT/'tools/build_coat151_south_registration.py').read_text())
P=next(ast.literal_eval(n.value)for n in module.body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='P'for t in n.targets))
for item in sorted({r['equipment']['torso']for r in records}):
 for direction in ['south','north','east','west']:
  # West source art is EAST + explicit runtime reflection; no baked mirrored pixels.
  sd='east'if direction=='west'else direction
  walk=next(r for r in records if r['equipment']['torso']==item and r['direction']==sd and r['action']=='walk')
  wd=walk['pack']['directions'][sd]
  baseattack=next(r for r in base['records']if r['body']=='male'and r['direction']==direction and r['action']=='attack-unarmed'and r.get('hairStyle')=='original')
  r=copy.deepcopy(baseattack);r.update(id=f'male-torso{item}-{direction}-frozen-attack-native-candidate',equipment={'torso':item},candidate=True,status='source-garment-punch-registration-candidate',baseRecord=baseattack['id'],calibrationPending=True,sourceSelection=walk['sourceSelection'],approvalPolicy='New registration, not new art approval')
  r['registrationPolicy']='SOUTH annotated original male joints; other directions angle-only pose guide, native male body untouched. Garment rigid transforms at scale1.'
  d=r['pack']['directions'][direction];body=copy.deepcopy(d['layers'])
  for l in body:
   l['id']='base:'+l['id']
   for s in [l.get('source')]+l.get('frames',[]):
    if s and s not in assets:assets[s]=bbytes(s)
  garment=copy.deepcopy([l for l in wd['layers']if not l['id'].startswith('base:')])
  padrefs=set()
  for l in garment:
   s=l.get('frames',[l['source']])[0];l.pop('frames',None);l['source']=s;padrefs.add(s)
   binding=l['binding']
   if binding['kind']in ['rigid','bone']:
    binding['kind']='rigid'
    for k in ['a','b']:binding[k]='cloth:'+binding[k]
  clothRest={k:{'x':v['x']+16,'y':v['y']+16}for k,v in wd['rest'].items()}
  for k,v in clothRest.items():d['rest']['cloth:'+k]=v
  # Separate garment anchors never move any original body/head layers.
  for frame,pose in enumerate(d['poses']):
   guide=copy.deepcopy(clothRest)
   if direction=='south':
    for side,pts in zip(['RIGHT','LEFT'],P[frame]):
     for joint,pt in zip(['SHOULDER','ELBOW','ARM'],pts):guide[side+' '+joint]={'x':pt[0]/4,'y':pt[1]/4}
   else:
    fn='anchors.json'if sd=='east'else 'anchors-'+sd+'.json'
    anchors=json.loads((ROOT/'tools/female-outfit151-native'/fn).read_text())
    for side in ['RIGHT','LEFT']:
     g0=anchors[0].get(side.lower(),{});gf=anchors[frame].get(side.lower(),{})
     for start,end,ga,gb in [('SHOULDER','ELBOW','shoulder','elbow'),('ELBOW','ARM','elbow','wrist')]:
      if not all(k in q and q[k] for q in [g0,gf]for k in [ga,gb]):continue
      a,b=clothRest[side+' '+start],clothRest[side+' '+end];length=math.hypot(b['x']-a['x'],b['y']-a['y'])
      angle=math.atan2(b['y']-a['y'],b['x']-a['x'])+math.atan2(gf[gb][1]-gf[ga][1],gf[gb][0]-gf[ga][0])-math.atan2(g0[gb][1]-g0[ga][1],g0[gb][0]-g0[ga][0])
      startpt=guide[side+' '+start];guide[side+' '+end]={'x':startpt['x']+length*math.cos(angle),'y':startpt['y']+length*math.sin(angle)}
   for k,v in guide.items():pose['cloth:'+k]=v
  d['layers']=body+garment
  r['sourceRasterPadding']={s:{'sourceSize':512,'offset':64}for s in padrefs}
  if direction=='west':r['mirrorLayerIDs']=[l['id']for l in garment]
  if item==172 and direction in ['east','west']:r['refinementPending']='Sleeve/glove edge refinement still pending.'
  r['sourceRefs']=sorted({s for l in d['layers']for s in [l.get('source')]+l.get('frames',[])if s});records.append(r)
with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_STORED)as z:
 for sha,data in sorted(assets.items()):z.writestr(sha+'.png',data)
frag['archives'][0].update(sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),bytes=dest.stat().st_size,pngCount=len(assets))
frag['sources']={s:{'archive':archive,'path':s+'.png','bytes':len(v)}for s,v in assets.items()}
(OUT/'archive-fragment.json').write_text(json.dumps(frag,separators=(',',':')))
(OUT/'records.json').write_text(json.dumps(records,separators=(',',':')))
print(len(records),len(assets),dest.stat().st_size)
