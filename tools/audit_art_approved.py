import csv,gzip,hashlib,io,json,re,subprocess,sys,zipfile
from collections import Counter,defaultdict
from pathlib import Path,PurePosixPath
repo,art,out=Path(sys.argv[1]),sys.argv[2],Path(sys.argv[3])
def git(*args):return subprocess.check_output(['git','-C',str(repo),*args])
def sha(b):return hashlib.sha256(b).hexdigest()
tree=git('ls-tree','-rz',art,'art-approved','art-sources/user-adjustments').decode().split(chr(0))
blobs={}
for row in filter(None,tree):
 header,name=row.split(chr(9),1)
 blobs[name]=header.split()[2]
cat=subprocess.Popen(['git','-C',str(repo),'cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE)
def read_git(path):
 oid=blobs[path]
 cat.stdin.write((oid+'\n').encode());cat.stdin.flush()
 header=cat.stdout.readline().split()
 assert header[1]==b'blob',(path,header)
 size=int(header[2]); data=cat.stdout.read(size); assert cat.stdout.read(1)==b'\n'
 return data
def artifact(name):return json.loads(read_git('art-approved/'+name))
def local(name):
 f=repo/name
 return json.loads(f.read_bytes() if f.exists() else gzip.decompress(f.with_suffix(f.suffix+'.gz').read_bytes()))
root='tools/'
# An index reference or archived PNG does not prove which frame the map draws.
records={}
byhash=defaultdict(set); byarchive=defaultdict(set)
asset_hashes=set()
hash_re=re.compile(r'(?<![a-f0-9])[a-f0-9]{64}(?![a-f0-9])')
for family,filename in [('rework-base-hd','index.json'),('rework-modular-outfits-hd','index.json'),('rework-weapon-layers-hd','index.json'),('rework-accessories','head-layer-index.json'),('rework-weapon-layers-hd','carry-binding-plan.json'),('rework-weapons','catalog.json'),('rework-outfits','catalog.json')]:
 base=root+family+'/'
 idx=local(base+filename)
 rows=idx if isinstance(idx,list) else [*idx.get('records',[]),*idx.get('femaleRegistrations',[]),*idx.get('maleOriginalGear',[]),*idx.get('cycles',[]),*([idx['modularSwordSouth']] if idx.get('modularSwordSouth') else [])]
 for r in rows:
  if not isinstance(r,dict):continue
  identifier=r.get('id') or '/'.join(str(r.get(k,'')) for k in ('body','item','direction','style','targetWalkRecord','snapshot'))
  key=family+':'+identifier
  records[key]={k:r[k] for k in ('id','body','item','direction','action','equipment','style','hairStyle','status','approval','candidate','sourceArchiveSHA256','sourcePortableSHA256','sourcePackSHA256','archiveSha256') if k in r}
  for h in hash_re.findall(json.dumps(r,separators=(',',':'))):byhash[h].add(key)
  for k in ('sourceArchiveSHA256','sourcePortableSHA256','sourcePackSHA256'):
   if r.get(k):byarchive[r[k]].add(key)
 arch=repo/(base+'archives/archive-index.json')
 if arch.is_file():
  asset_hashes.update(json.loads(arch.read_bytes()).get('sources',{}))
asset_hashes.update(f.stem for f in (repo/'tools/rework-accessories/assets').glob('*.png') if hash_re.fullmatch(f.stem))
entries=artifact('CATALOG.json')['packages']
for f in sorted(blobs):
 if f.startswith('art-sources/user-adjustments/') and f.endswith('.zip'):
  entries.append({'path':f,'supplement':'user adjustment source'})
out.mkdir(parents=True,exist_ok=True)
audit=[]; used=set()
csvpath=out/'members.csv'
with csvpath.open('w',encoding='utf-8',newline='') as handle:
 writer=csv.writer(handle)
 writer.writerow(['package','member','type','sha256','runtime_asset','indexed_references','archive_references'])
 def match_row(path,member,kind,digest):
  hits=sorted(byhash.get(digest,()))
  writer.writerow([path,member,kind,digest,int(digest in asset_hashes),' | '.join(hits),' | '.join(sorted(byarchive.get(digest,())))])
  return hits
 for j,e in enumerate(entries):
  path=e['path']; full=path if path.startswith('art-sources/') else 'art-approved/'+path
  row={**e,'partsResolved':[],'errors':[]}
  try:
   storage=e.get('storage')
   if full in blobs: parts=[(full,None)]
   elif isinstance(storage,dict):
    manifest='art-approved/'+storage['manifest']
    base=PurePosixPath(manifest).parent
    parts=[(str(base/p['path']),p.get('sha256')) for p in json.loads(read_git(manifest))['parts']]
   else:
    base=PurePosixPath(full).parent
    parts=[(str(base/p),None) for p in e.get('parts',[])]
    if not parts:parts=[(p,None) for p in sorted(blobs) if p.startswith(full+'.part')]
   assert parts,'archive or manifest missing'
   buf=io.BytesIO()
   for name,expected in parts:
    data=read_git(name);used.add(name)
    digest=sha(data)
    if expected and digest!=expected:row['errors'].append('part SHA-256 mismatch: '+name)
    row['partsResolved'].append({'path':name,'sha256':digest,'bytes':len(data)})
    buf.write(data)
   digest=sha(buf.getbuffer());row['actualSHA256']=digest
   if e.get('sha256') and digest!=e['sha256']:row['errors'].append('archive SHA-256 mismatch')
   if e.get('bytes') and buf.tell()!=e['bytes']:row['errors'].append('archive size mismatch')
   row['archiveReferences']=sorted(byarchive.get(digest,()))
   sources=set(); counts=Counter(); details={}
   with zipfile.ZipFile(buf) as z:
    for member in z.infolist():
     if member.is_dir():continue
     with z.open(member) as source:
      h=hashlib.sha256()
      for chunk in iter(lambda:source.read(1024*1024),b''):h.update(chunk)
     mh=h.hexdigest(); suffix=PurePosixPath(member.filename).suffix.lower()
     if suffix=='.png':
      counts['png']+=1
      if mh in asset_hashes:counts['publishedIdentity']+=1
      hits=match_row(path,member.filename,'png',mh)
      if hits:counts['indexedIdentity']+=1;sources.update(hits)
     elif suffix=='.json':
      counts['json']+=1
      hits=match_row(path,member.filename,'json',mh)
      if hits:sources.update(hits)
      if PurePosixPath(member.filename).name.lower() in ['metadata.json','recipe.json']:
       try:
        meta=json.loads(z.read(member))
        if isinstance(meta,dict):details[member.filename]={k:meta[k] for k in ('item','items','weapon','newWeapon','direction','sex','body','outfit','outfits','action','fps','poses','clip','version','scope','approval','productionEnabled','candidateApproved') if k in meta}
       except (ValueError,UnicodeDecodeError):pass
     else:counts['other']+=1
   row.update(counts=dict(counts),matchingRecords=sorted(sources),metadata=details)
  except Exception as exc:row['errors'].append(str(exc))
  audit.append(row)
  if j%20==0:print(j+1,len(entries),path,flush=True)
 standalone=[]
 for f in sorted(blobs):
  if f not in used:
   digest=sha(read_git(f))
   hits=match_row(f,'',PurePosixPath(f).suffix[1:],digest)
   standalone.append({'path':f,'sha256':digest,'matchingRecords':hits,'runtimeAsset':digest in asset_hashes})
cat.stdin.close();cat.wait()
summary={'packages':len(audit),'errors':sum(bool(r['errors']) for r in audit),'indexedPackages':sum(bool(r.get('matchingRecords') or r.get('archiveReferences')) for r in audit),'publishedAssetPackages':sum(bool(r.get('counts',{}).get('publishedIdentity')) for r in audit),'png':sum(r.get('counts',{}).get('png',0) for r in audit),'pngIndexed':sum(r.get('counts',{}).get('indexedIdentity',0) for r in audit),'pngPublishedIdentity':sum(r.get('counts',{}).get('publishedIdentity',0) for r in audit),'standalone':len(standalone),'unlistedArchiveParts':[p for p in sorted(blobs) if re.search(r'\.zip$|\.part\d+$',p) and p not in used]}
(out/'catalog-audit.json').write_text(json.dumps({'artCommit':git('rev-parse',art).decode().strip(),'runtimeCommit':git('rev-parse','HEAD').decode().strip(),'summary':summary,'packages':audit,'standalone':standalone,'runtimeRecords':records},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary),flush=True)
