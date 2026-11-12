"""Index original approved clothing compositions. Never infer missing raster/timing."""
import argparse,hashlib,json,math,pathlib,re,struct,zipfile
DIRECTIONS=('south','north','east','west')
def sha(b): return hashlib.sha256(b).hexdigest()
def direction(path):return next((d for d in DIRECTIONS if re.search(r'(^|[/_-])'+d+r'([/_-]|$)',path)),None)
def timing(meta,n):
 ds=meta.get('durationsMs')
 if ds and len(ds)==n:
  tick=math.gcd(*ds);return [i for i,d in enumerate(ds) for _ in range(d//tick)],1000/tick,'authored'
 fps=meta.get('fps',meta.get('clip',{}).get('fps'))
 if fps:return list(range(n)),fps,'authored'
 return list(range(n)),2 if n>1 else 1,'review-states' if n>1 else 'static'
def build(source):
 cycles=[];pending=[]
 for p in sorted((source/'art-approved/clothing').rglob('*.zip')):
  raw=p.read_bytes(); z=zipfile.ZipFile(p);m=json.loads(z.read('METADATA.json')); archive=p.relative_to(source).as_posix()
  if 'source-pack' in p.name:
   pending.append({'archive':archive,'reason':'layered editable pack needs original compositor; not standalone frames'});continue
  seq=m.get('sequence') or [x['file'] for x in m.get('images',[])]
  if seq and isinstance(seq[0],dict):
   m['durationsMs']=[x['durationMs'] for x in seq];seq=[x['file'] for x in seq]
  if not seq:seq=[n for n in z.namelist() if n.endswith('.png') and 'source' not in n]
  base_direction=m.get('direction'); groups={}
  if base_direction:groups[base_direction]=seq
  else:
   for s in seq:
    d=direction(s)
    if d:groups.setdefault(d,[]).append(s)
  if not groups:pending.append({'archive':archive,'reason':'no explicit direction'});continue
  for d,paths in groups.items():
   unique=list(dict.fromkeys(paths));frames=[]
   for n in unique:
    b=z.read(n)
    if b[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError(n)
    w,h=struct.unpack('>II',b[16:24]);frames.append({'path':n,'width':w,'height':h,'sha256':sha(b)})
   sizes={(f['width'],f['height']) for f in frames}
   if len(sizes)!=1:raise ValueError((p,sizes))
   w,h=next(iter(sizes)); timeline,fps,t=timing(m,len(paths));timeline=[unique.index(paths[i]) for i in timeline]
   action=m.get('action','idle' if len(paths)==1 or m.get('animation') is False else 'walk')
   if action=='static':action='idle'
   if 'shown-states' in p.name:action='idle';t='review-states';fps=2
   density=m.get('density',4);lw,lh=w/density,h/density
   if lw not in (128,160):pending.append({'archive':archive,'reason':f'unsupported logical geometry {lw}x{lh}'});continue
   cycles.append({'id':p.stem+'--'+d,'item':m.get('item',0),'body':m.get('sex',m.get('body',p.name.split('_')[0])),'direction':d,'action':action,'outfit':p.stem,'archive':archive,'archiveSha256':sha(raw),'frames':frames,'timeline':timeline,'fps':fps,'loop':m.get('loop',m.get('clip',{}).get('loop',True)),'logicalFrame':[lw,lh],'pivot':[lw/2,112 if lw==128 else 128],'timing':t,'originalBytesPreserved':True,'interchangeableEquipment':False,'scope':m.get('scope',m.get('format','Original equipped composition'))})
 return {'schema':'approved-composite-cycles-v1','sourceCommit':'2801902fa2dad8e83069815faeaa3f53f90bc1b6','approvalScope':'Preserved compositions from art-approved catalogue; not arbitrary combinations or global runtime approval.','cycles':cycles,'pendingArchives':pending}
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('source',type=pathlib.Path);a.add_argument('--output',type=pathlib.Path,default=pathlib.Path(__file__).with_name('catalog.json'));o=a.parse_args();r=build(o.source);o.output.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(len(r['cycles']),'cycles;',len(r['pendingArchives']),'pending archives')
