#!/usr/bin/env python3
import hashlib, io, json
from pathlib import Path
from zipfile import ZipFile
D=Path(__file__).resolve().parent
def sha(data): return hashlib.sha256(data).hexdigest()
def read(name): return json.loads((D/name).read_bytes())
early=D/'sources/pilotos-iniciais'
m=json.loads((early/'MANIFEST.json').read_bytes())
blocks=[]
for p in m['parts']:
 b=(early/p['file']).read_bytes()
 assert sha(b)==p['sha256'] and len(b)==p['bytes'];blocks.append(b)
b=b''.join(blocks)
assert len(b)==m['bytes'] and sha(b)==m['sha256']
with ZipFile(io.BytesIO(b)) as z:
 assert z.testzip() is None
 u=json.loads(z.read('manifest.json'))
 assert not u['productionEnabled'] and u['uniqueBlobs']==227
 for rev in u['revisions']:
  for row in rev['files']: assert sha(z.read(row['path']))==row['sha256']
 with_equipment=read('sources/cetros-equipamentos-aprovados.json')
with ZipFile(D/'sources/cetros-equipamentos-aprovados.zip') as z:
 assert z.testzip() is None and json.loads(z.read('manifest.json'))==with_equipment
 assert [len(r['frames']) for r in with_equipment['routes']]==[8,9]
 assert not with_equipment['productionEnabled']
 files={v['path'] for row in with_equipment['routes'] for f in row['frames'] for s in f['slots'].values() for v in s['passes']}
 assert len(files)==17
 assert all(sha(z.read(x))+'.png'==x for x in files)
with ZipFile(D/'sources/cetros-pele-aprovada.zip') as z:
 assert z.testzip() is None and len(z.namelist())==76
 assert all(sha(z.read(n))+'.png'==n for n in z.namelist())
with ZipFile(D/'sources/pistola114-masculino-camadas.zip') as z:
 assert z.testzip() is None and sum(n.endswith('.png') for n in z.namelist())==68
 assert {k:len(v['source_sha256']) for k,v in json.loads(z.read('relogio-e-registro.json')).items() if 'source_sha256' in v}==dict(south=8,north=8,east=8,west=8)
h=read('restauracao-historica.json')
assert h['added']==len(h['newPaths'])==544 and len({p['path'] for p in h['newPaths']})==544
assert not any('female' in p['path'].lower() or 'feminino' in p['path'].lower() for p in h['newPaths'])
print('OK: 2 pilotos, 227 fontes únicas; 544 fontes Git históricas; 17 PNGs de equipamento, 76 máscaras e 68 camadas P114')
