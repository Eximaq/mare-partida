import json
from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[1]
out=root/'tools/rework-modular-outfits-hd'
x=json.loads((out/'index.json').read_text());rs=json.loads((p/'records.json').read_text());ids={r['id']for r in rs};x['records']=[r for r in x['records']if r['id']not in ids]+rs
(out/'index.json').write_text(json.dumps(x,separators=(',',':')))
m=json.loads((out/'archives/archive-index.json').read_text());f=json.loads((p/'archive-fragment.json').read_text());names={a['file']for a in f['archives']};m['archives']=[a for a in m['archives']if a['file']not in names]+f['archives']
# Do not overwrite shared source references already served by another archive.
for s,v in f['sources'].items():m['sources'].setdefault(s,v)
m['recordDependencies']=[d for d in m.get('recordDependencies',[])if d['id']not in ids]
for r in rs:
 deps=sorted({m['sources'][s]['archive']for s in r['sourceRefs']})
 m['recordDependencies'].append({'id':r['id'],'action':r['action'],'archives':deps,'coldBytes':sum(a['bytes']for a in m['archives']if a['file']in deps),'pngBytes':sum(m['sources'][s]['bytes']for s in r['sourceRefs'])})
(out/'archives/archive-index.json').write_text(json.dumps(m,separators=(',',':')))
print('Merged',len(rs))
