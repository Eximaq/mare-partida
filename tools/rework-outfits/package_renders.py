import json,pathlib,zipfile,hashlib,argparse
p=argparse.ArgumentParser();p.add_argument('extracted',type=pathlib.Path);a=p.parse_args()
root=pathlib.Path(__file__).parent;m=json.loads((root/'catalog.json').read_text());new=[]
for pending in m['pendingArchives']:
 source=a.extracted/pathlib.Path(pending['archive']).stem;r=source/'rendered';manifest=json.loads((r/'render.json').read_text());meta=json.loads((source/'METADATA.json').read_text())
 out=root/'generated'/(source.name+'.zip');out.parent.mkdir(exist_ok=True)
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for f in sorted(r.glob('*')):
   info=zipfile.ZipInfo(f.name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,f.read_bytes())
 h=hashlib.sha256(out.read_bytes()).hexdigest()
 for c in manifest['cycles']:
  c.update({'id':source.name+'--'+c['direction'],'item':meta.get('item',meta.get('items',[0])[0]),'body':meta.get('sex','female'),'action':'walk','outfit':source.name,'archive':'tools/rework-outfits/generated/'+out.name,'archiveLocal':True,'archiveSource':'local','archiveSha256':h,'timing':'authored','originalBytesPreserved':False,'originalLayersPreserved':True,'interchangeableEquipment':False,'scope':'Original approved layered composition rendered with original ModularPilot; historical candidate flags retained','sourceArchive':pending['archive'],'sourceFlags':manifest['sourceFlags']})
  new.append(c)
m['cycles']+=new;m['renderedSourceArchives']=m.pop('pendingArchives');m['pendingArchives']=[];(root/'catalog.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');print(len(new),'rendered sources',sum(x.stat().st_size for x in (root/'generated').glob('*.zip')),'bytes')
