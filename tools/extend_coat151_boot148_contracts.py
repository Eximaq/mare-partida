"""Reuse existing native coat layers on the already verified pants133/boot148 body.
No pixel generation, scaling, unknown boot laterals, or artistic approval inference.
"""
import copy,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
p=root/'tools/rework-modular-outfits-hd/index.json'; index=json.loads(p.read_text())
records=[r for r in index['records'] if not r.get('isolatedCoat151Boot148')]; added=[]
for base in records:
 if base['body']!='male' or base['equipment']!={'pants':133,'boots':148} or base['action']=='attack-focus':continue
 donor=next(r for r in records if r.get('isolatedCoat151') and r['direction']==base['direction'] and r['action']==base['action'])
 original=next(r for r in records if r['equipment']=={'pants':133,'boots':9} and r['direction']==base['direction'] and r['action']==base['action'])
 direction=base['direction']; bd=base['pack']['directions'][direction]; od=original['pack']['directions'][direction]
 # Same underlying body poses and native canvas. Only boot-owned layers differ.
 for key in ['frame','pivot','density']:assert base['pack'][key]==original['pack'][key],key
 for key in ['rest','poses','clip']:assert bd[key]==od[key],key
 body=lambda d:[l for l in d['layers'] if not l['id'].startswith('boot')]
 assert body(bd)==body(od),'body changed, cannot reuse coat safely'
 count=len(od['layers']);coat=donor['pack']['directions'][direction]['layers'][count:]
 assert coat and all('coat151' in l['id'] for l in coat)
 r=copy.deepcopy(base);r['id']+='-coat151-native';r['equipment']['torso']=151;r['pack']['directions'][direction]['layers'].extend(copy.deepcopy(coat))
 r['sourceRefs']=sorted(set(base['sourceRefs']) | {s for l in coat for s in ([l['source']] if l.get('source') else [])+l.get('frames',[])})
 r['isolatedCoat151Boot148']={'base':base['id'],'coatDonor':donor['id'],'nativeBodyPoseEqual':True,'sourcePNGsUnchanged':True}
 r['candidate']=True;r['status']='native-isolated-coat151-boot148-candidate';added.append(r)
assert len(added)==6
index['records']=records+added;p.write_text(json.dumps(index,separators=(',',':'))+'\n')
print('Added',len(added),'native contracts, no image/archive changes')
