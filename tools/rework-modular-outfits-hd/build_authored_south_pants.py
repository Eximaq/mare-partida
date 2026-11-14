"""Replay original SOUTH source members; does not modify any runtime/index."""
from pathlib import Path
import zipfile,json,hashlib
import argparse
p=argparse.ArgumentParser();p.add_argument('--source-root',type=Path,required=True);p.add_argument('--materials-zip',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);args=p.parse_args();R=args.source_root;O=args.output_dir;O.mkdir(parents=True,exist_ok=True);A=O/'inputs';A.mkdir(exist_ok=True)
def put(b):
 h=hashlib.sha256(b).hexdigest();(A/(h+'.png')).write_bytes(b);return h
z=zipfile.ZipFile(args.materials_zip);d=json.loads(z.read('current/south/pack.json'))['directions']['south'];ticks=[0,5,10,15,18,20,25,30,35,38];layers=[]
for l in d['layers']:
 if l['id']=='visible-clothed-composite' or l['id'].startswith('pants154'):continue
 slot='coat'if l['id'].startswith('coat151')or l['id']=='visible-original-hands'else'boots'if l['id'].startswith('boot155')else'gloves'
 layers.append({'id':l['id'],'slot':slot,'depth':l['depth'],'frames':[put(z.read('current/south/'+(l.get('frames',[l['source']]*40)[t])))for t in ticks]})
items={}
for id in [175,133,161,21]:
 if id in [175,133]:
  zz=zipfile.ZipFile(R/'matrix-next-sn-inventory'/f'Calca{id}_SN_{"Material_"if id==175 else"Ciclo_"}Fontes_r4.zip');read=zz.read;prefix='sn-rework/r4-material/'if id==175 else'r4-material/'
 else:
  q=R/'matrix-sn-replay-final'/str(id);read=lambda n:(q/n).read_bytes();prefix='r4-panel-refinement/'if id==161 else'r13-inner-continuity/'
 frames=[]
 for k in range(10):
  cloth=prefix+(f'cloth/south-{k}.png'if id==175 else f'cloth-south-{k}.png');owner=prefix+(f'owners/south-{k}.png'if id==175 else f'owner-south-{k}.png')
  try:o=put(read(owner))
  except(KeyError,FileNotFoundError):o=None
  frames.append({'cloth':put(read(cloth)),'owner':o})
 items[str(id)]=frames
contacts=json.loads((R/'matrix-personalization-anatomy/probe/contacts.json').read_bytes());contacts=[x for x in contacts if x['direction']=='south']
for c in contacts:c['mask']=put((R/'matrix-personalization-anatomy/probe'/(c['maskSHA256']+'.png')).read_bytes())
(O/'inputs.json').write_text(json.dumps({'layers':layers,'items':items,'contacts':contacts,'phaseMap':[0,1,2,3,3,4,5,6,7,7]}))
expected=json.loads((Path(__file__).parent/'south-pants/approved-inputs.json').read_bytes());actual=json.loads((O/'inputs.json').read_bytes());assert actual==expected,'Original source descriptor mismatch'
with zipfile.ZipFile(O/'all-authored-south-inputs.zip','w') as output:
 for source in sorted(A.glob('*.png')):
  info=zipfile.ZipInfo(source.name,(2020,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;output.writestr(info,source.read_bytes())
print('Verified authentic layers only; no pixel changes; full original input archive',hashlib.sha256((O/'all-authored-south-inputs.zip').read_bytes()).hexdigest())
