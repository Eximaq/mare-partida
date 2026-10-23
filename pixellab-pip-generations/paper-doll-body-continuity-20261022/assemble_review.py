"""Package existing native body poses without modifying any pixel or timing."""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image
HERE=Path(__file__).resolve().parent
SOURCES={'idle':('paper-doll-walk-profiles-20261021','body-idle.png'), 'walk':('paper-doll-walk-profiles-20261021','body-walk.png'), 'attack-sword':('paper-doll-east-fit-20261022','body-attack.png')}
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 attack=json.loads((HERE.parent/SOURCES['attack-sword'][0]/'review-pack.json').read_text())
 locomotion=json.loads((HERE.parent/SOURCES['walk'][0]/'review-pack.json').read_text())
 rig={**attack['rig'],'requiredSlots':['body'],'animations':{}}
 clips={};records=[]
 for action,(folder,name) in SOURCES.items():
  source=HERE.parent/folder/name;target=HERE/name;shutil.copy2(source,target)
  spec=(attack if action=='attack-sword' else locomotion)['rig']['animations'][action]
  rig['animations'][action]=spec
  clips[action]={'kind':'sheet','url':name,**spec,'frameWidth':84,'frameHeight':84}
  image=Image.open(source).convert('RGBA');assert image.size==(84*spec['frames'],336)
  poses=[]
  for row,direction in enumerate(spec['directions']):
   hashes=[]
   for i in range(spec['frames']):
    frame=image.crop((i*84,row*84,(i+1)*84,(row+1)*84));box=frame.getbbox();assert box
    h=hashlib.sha256(frame.tobytes()).hexdigest();hashes.append(h)
    poses.append({'direction':direction,'frame':i,'bounds':box,'rgba_sha256':h})
   assert len(set(hashes))>1,'A real motion must contain distinct poses'
  records.append({'action':action,'source':f'pixellab-pip-generations/{folder}/{name}','file':name,'sha256':digest(source),'poses':poses})
  assert digest(source)==digest(target)
 pack={'scope':'body-motion-review','reviewOnly':True,'productionEnabled':False,'full_character_artwork_approved':False,
  'status':'Body-only continuity study. Clothing, hair, footwear and weapons are not included or approved.',
  'rig':rig,'pieces':[{'id':'shared-body-continuity','rigId':rig['id'],'slot':'body','available':True,'approved':False,'zIndex':0,'animations':clips}],
  'appearance':{'rigId':rig['id'],'pieces':{'body':'shared-body-continuity'}},
  'bodyCoverage':{a:spec['directions'] for a,spec in rig['animations'].items()}}
 audit={'passed':True,'body_pose_count':sum(len(r['poses']) for r in records),'pixel_changes':0,'paid_calls':0,'artistic_continuity_approved':False,'records':records}
 for name,value in [('review-pack.json',pack),('source-audit.json',audit)]:
  (HERE/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('80 native body poses preserved. Body-only review; no full-character approval.')
if __name__=='__main__':main()
