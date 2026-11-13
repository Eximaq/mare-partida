import json,zipfile,hashlib,base64,copy,re,io,sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent;SOURCE=Path(sys.argv[1])
bases=json.loads((ROOT/'tools/rework-base-hd/index.json').read_text())['records'];bm=json.loads((ROOT/'tools/rework-base-hd/archives/archive-index.json').read_text())
assets={};records=[];proof=[]
def addbase(s):
 if s not in assets:
  v=bm['sources'][s]
  with zipfile.ZipFile(ROOT/'tools/rework-base-hd/archives'/v['archive'])as z:assets[s]=z.read(v['path'])
def layerrefs(l):return [s for s in [l.get('source')]+l.get('frames',[])if s]
def refs(r):return sorted({s for l in r['pack']['directions'][r['direction']]['layers']for s in layerrefs(l)})
for archive in sorted(SOURCE.glob('*.zip')):
 with zipfile.ZipFile(archive)as z:
  for name in z.namelist():
   mat=re.match(r'(female-walk-torso-(?:south|north)|female-profile-manual-current)_(\d+)_',name)
   if not mat:continue
   item=int(mat[2]);raw=z.read(name);j=json.loads(raw)
   if re.search(r'rejected|withdrawn|reprovad|retirad',j.get('selection',{}).get('status',''),re.I):continue
   for direction,sd in j['pack']['directions'].items():
    garment=copy.deepcopy([l for l in sd['layers']if l['id']not in ['visible-clothed-composite','visible-original-hands','native-visible-near-arm-manual']])
    for l in garment:
     l['slot']='top'if l.get('depth',0)>=0 else'underArms'
     for k in ['source','frames']:
      if k not in l:continue
      vals=l[k]if k=='frames'else[l[k]];ss=[]
      for s in vals:
       b=base64.b64decode(j['images'][s].split(',',1)[1]);h=hashlib.sha256(b).hexdigest();assets[h]=b;ss.append(h)
      l[k]=ss if k=='frames'else ss[0]
    b=next(r for r in bases if r['body']=='female'and r['direction']==direction and r['action']=='walk'and r.get('hairStyle')=='original')
    bd=b['pack']['directions'][direction];p=copy.deepcopy(b['pack']);d=p['directions'][direction]
    frames=sd['clip']['frames'];ticks=[min(bd['clip']['frames']-1,i*bd['clip']['frames']//frames)for i in range(frames)]
    d['clip']=copy.deepcopy(sd['clip']);d['poses']=[copy.deepcopy(bd['poses'][i])for i in ticks]
    for l in d['layers']:
     l['id']='base:'+l['id']
     if l.get('frames'):l['frames']=[l['frames'][i]for i in ticks]
     for s in layerrefs(l):addbase(s)
    d['layers']+=copy.deepcopy(garment)
    r=dict(id=f'female-torso{item}-{direction}-frozen-walk-native',body='female',direction=direction,action='walk',equipment={'torso':item},pack=p,candidate=True,status='frozen-torso-source-registration-candidate',baseRecord=b['id'],sourcePackage=name,sourcePackSHA256=hashlib.sha256(raw).hexdigest(),sourceSelection=j.get('selection'),calibrationPending=True,approvalPolicy='Frozen candidate evidence retained, no new approval',registrationPolicy='Own garment40ticks; original female body8frames at matching1second clock; no foreign equipped composite')
    r['sourceRefs']=refs(r);records.append(r)
    idle=copy.deepcopy(r);idle.update(id=r['id'].replace('-walk-','-idle-'),action='idle')
    idd=idle['pack']['directions'][direction];idd['clip']={'frames':1,'fps':4,'loop':False};idd['poses']=idd['poses'][:1]
    for l in idd['layers']:
     if l.get('frames'):l['frames']=l['frames'][:1];l['source']=l['frames'][0]
    idle['sourceRefs']=refs(idle);records.append(idle)
    attack=next(r for r in bases if r['body']=='female'and r['direction']==direction and r['action']=='attack-unarmed'and r.get('hairStyle')=='original')
    a=copy.deepcopy(r);a.update(id=r['id'].replace('-walk-','-attack-'),action='attack-unarmed',pack=copy.deepcopy(attack['pack']),baseRecord=attack['id'],registrationPolicy='Original female attack8frames plus own garment parts, rigid scale1; new calibration candidate, not approval.')
    ad=a['pack']['directions'][direction]
    for l in ad['layers']:
     l['id']='base:'+l['id']
     for s in layerrefs(l):addbase(s)
    layers=copy.deepcopy(garment);pad={}
    fn='anchors.json'if direction=='east'else 'anchors-'+direction+'.json'
    joints=json.loads((ROOT/'tools/female-outfit151-native'/fn).read_text())
    for n,l in enumerate(layers):
     src=l.get('frames',[l['source']])[0];l.pop('frames',None);l['source']=src;pad[src]={'sourceSize':512,'offset':64}
     # Only isolated sleeves/cuff pieces follow arm trajectories. The identity
     # comes from semantic garment layer IDs, never pixel-colour classification.
     sleeve=bool(re.search(r'Upper|Lower|derived-sleeve|cuff',l['id']))
     if sleeve:
      im=Image.open(io.BytesIO(assets[src])).convert('RGBA');alpha=im.getchannel('A');bbox=alpha.getbbox()
      if bbox:
       x0,y0,x1,y1=bbox
       points=[(x,y)for y in range(y0,y1)for x in range(x0,x1)if alpha.getpixel((x,y))>0]
       top=[p for p in points if p[1]<y0+max(2,(y1-y0)//8)];bottom=[p for p in points if p[1]>=y1-max(2,(y1-y0)//8)]
       mean=lambda ps:[sum(p[k]for p in ps)/len(ps)+64 for k in [0,1]]
       A,B=mean(top),mean(bottom);side=min(['left','right'],key=lambda s:abs(joints[0][s].get('shoulder',joints[0][s].get('wrist',[320]))[0]-A[0]))
       lower=bool(re.search(r'Lower|cuff',l['id']));k1,k2=('elbow','wrist')if lower else('shoulder','elbow')
       if all(q.get(side,{}).get(k1)and q.get(side,{}).get(k2)for q in joints):
        ka,kb=f'cloth{n}A',f'cloth{n}B';ad['rest'][ka]={'x':A[0]/4,'y':A[1]/4};ad['rest'][kb]={'x':B[0]/4,'y':B[1]/4};l['binding']={'kind':'rigid','a':ka,'b':kb}
        for i,pose in enumerate(ad['poses']):
         for k,g in [(ka,k1),(kb,k2)]:pt=joints[i][side][g];pose[k]={'x':pt[0]/4,'y':pt[1]/4}
    ad['layers']+=layers;a['sourceRasterPadding']=pad;a['sourceRefs']=refs(a);records.append(a)
    proof.append({'item':item,'direction':direction,'source':name,'excluded':['visible-clothed-composite','visible-original-hands','native-visible-near-arm-manual'],'bodyWalk':b['id'],'bodyAttack':attack['id']})
archive='female-frozen-torsos-garment-only-v1.zip';dest=ROOT/'tools/rework-modular-outfits-hd/archives'/archive
with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_STORED)as z:
 for s,b in sorted(assets.items()):z.writestr(s+'.png',b)
frag={'archives':[{'file':archive,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'pngCount':len(assets),'compression':'stored'}],'sources':{s:{'archive':archive,'path':s+'.png','bytes':len(b)}for s,b in assets.items()}}
(OUT/'records.json').write_text(json.dumps(records,separators=(',',':')));(OUT/'archive-fragment.json').write_text(json.dumps(frag,separators=(',',':')));(OUT/'proof.json').write_text(json.dumps(proof,indent=2));print(len(records),len(assets),dest.stat().st_size)
