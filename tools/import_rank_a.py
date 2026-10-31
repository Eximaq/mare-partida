"""Import owner-supplied Rank A sheets unchanged; emit browser frame metadata."""
import argparse,json,hashlib,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCES={'ope':('Ope Ope no Mi',{'fruit.png':'Ope Ope no Mi.png','skill-1.png':'Skill 1.png','shambles.png':'Skill 1.2.png','skill-2.png':'Skill 2.png','skill-3.png':'Skill 3.png'},{'room':'power-aura-take-16','tact':'power-aura-take-15','gamma':'power-aura-take-12'}),'mero':('Mero Mero no Mi',{'fruit.png':'Mero Mero no Mi.png','skill-1.png':'Skill 4.png','skill-2.png':'Skill 5.png','skill-3.png':'Skill 6.png'},{'mellow':'power-aura-take-16','kiss':'firelight-take-1','rain':'power-aura-take-1'})}
def main(source):
 effects={};origins=[]
 for family,(folder,icons,sheets) in SOURCES.items():
  out=ROOT/'assets/akuma'/family;out.mkdir(parents=True,exist_ok=True)
  files={**icons,**{name+ext:name+ext for name in sheets.values() for ext in ['.png','.json']}}
  for dest,original in files.items():
   raw=(source/folder/original).read_bytes();(out/dest).write_bytes(raw);origins.append({'file':str((out/dest).relative_to(ROOT)).replace(chr(92),'/'),'source':folder+'/'+original,'sha256':hashlib.sha256(raw).hexdigest()})
  for name,file in sheets.items():
   frames=json.loads((out/(file+'.json')).read_text())['frames'];effects[name]={'image':'assets/akuma/'+family+'/'+file+'.png','frames':[{**f['frame'],'duration':f['duration'],'pivot':f.get('pivot',{'x':.5,'y':.5})} for f in frames]}
 rules=json.loads((ROOT/'assets/akuma/rank-a-rules.json').read_text())
 (ROOT/'assets/akuma/rank-a-manifest.json').write_text(json.dumps({'origin':'Owner supplied files; imported unchanged','mellowSource':'take-16 confirmed by owner instead of requested take-18','files':origins},ensure_ascii=False,indent=2),encoding='utf8')
 (ROOT/'rank-a-data.js').write_text("'use strict';\nglobalThis.MareRankAData="+json.dumps({'rules':rules,'effects':effects},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);main(p.parse_args().source)
