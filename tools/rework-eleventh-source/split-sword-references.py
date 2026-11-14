"""Lossless test-only partition; original per-member PNG bytes are never rewritten."""
import argparse, pathlib, json, zipfile, hashlib
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--proof',required=True);p.add_argument('--output',required=True);a=p.parse_args();src=pathlib.Path(a.input);out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True);H=lambda b:hashlib.sha256(b).hexdigest();raw=src.read_bytes();original='6988664c0e0d0f7c2fe35731aecdef4e701a21b97feae2917c9686a4f7588944';assert H(raw)==original
proof=json.loads(pathlib.Path(a.proof).read_text());proof=proof.get('swordCoats',proof);z=zipfile.ZipFile(src);originalNames=sorted(z.namelist());assert len(originalNames)==len(set(originalNames))==128
m={'schema':'lossless-eleventh-reference-partition-v1','originalSHA256':original,'originalBytes':len(raw),'originalMembers':originalNames,'archives':[]};seen=set()
for item in [1,68]:
 names=sorted({s['approvedReferenceSHA256']+'.png' for r in proof['profiles'] if r['item']==item for states in r['coats'].values() for s in states});assert len(names)==64 and not seen.intersection(names);seen.update(names);name=f'eleventh-sword{item}-coats-references.zip'
 with zipfile.ZipFile(out/name,'w')as dest:
  for n in names:
   b=z.read(n);assert H(b)==n[:-4];i=zipfile.ZipInfo(n,(2020,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;dest.writestr(i,b)
 m['archives'].append({'item':item,'file':name,'sha256':H((out/name).read_bytes()),'bytes':(out/name).stat().st_size,'members':names})
assert sorted(seen)==originalNames
(out/'eleventh-reference-transport.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(m['archives'],indent=2))
