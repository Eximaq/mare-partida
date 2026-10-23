"""Reuse native hair pieces on real body poses; no painting, scaling or synthesis."""
import json,hashlib,shutil
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
BODY=HERE.parent/'paper-doll-body-continuity-20261022'
HAIR=HERE.parent/'paper-doll-walk-profiles-20261021'
def write(name,data):(HERE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def head(frame):
 y=frame.getbbox()[1];points=[x for yy in range(y,y+4) for x in range(84) if frame.getpixel((x,yy))[3]]
 return min(points),y,max(points)
def cell(sheet,i,row):return sheet.crop((i*84,row*84,(i+1)*84,(row+1)*84))
def main():
 pack=json.loads((BODY/'review-pack.json').read_text());records=[]
 for name in ['body-idle.png','body-walk.png','body-attack.png']:
  shutil.copy2(BODY/name,HERE/name);records.append({'file':name,'source':str((BODY/name).relative_to(HERE.parent.parent)).replace('\\','/'),'sha256':digest(BODY/name)})
 for name in ['hair-idle.png','hair-walk.png']:
  shutil.copy2(HAIR/name,HERE/name);records.append({'file':name,'source':str((HAIR/name).relative_to(HERE.parent.parent)).replace('\\','/'),'sha256':digest(HAIR/name)})
 idle=Image.open(BODY/'body-idle.png').convert('RGBA');hair=Image.open(HAIR/'hair-idle.png').convert('RGBA');attack=Image.open(BODY/'body-attack.png').convert('RGBA')
 sheet=Image.new('RGBA',(672,336));poses=[]
 for row,direction in enumerate(['south','north','west','east']):
  donor=cell(hair,0,row);base=head(cell(idle,0,row))
  for i in range(8):
   body=cell(attack,i,row);target=head(body);assert target[2]-target[0]==base[2]-base[0]
   dx,dy=target[0]-base[0],target[1]-base[1]
   result=Image.new('RGBA',(84,84));result.paste(donor,(dx,dy))
   assert sum(c[3]>0 for c in donor.get_flattened_data())==sum(c[3]>0 for c in result.get_flattened_data()),'Clipped hair'
   overlap=sum(a[3]>0 and b[3]>0 for a,b in zip(body.get_flattened_data(),result.get_flattened_data()));assert overlap>0
   sheet.paste(result,(i*84,row*84))
   poses.append({'direction':direction,'frame':i,'source_frame':0,'source_direction':direction,'translation':[dx,dy],'source_head':base,'target_head':target,'body_overlap_pixels':overlap,'rgba_sha256':hashlib.sha256(result.tobytes()).hexdigest()})
 sheet.save(HERE/'hair-attack.png')
 hairpiece={'id':'shared-short-hair-continuity','rigId':pack['rig']['id'],'slot':'hair','available':True,'approved':False,'zIndex':60,'animations':{}}
 for action,spec in pack['rig']['animations'].items():hairpiece['animations'][action]={'kind':'sheet','url':'hair-'+('attack' if action=='attack-sword' else action)+'.png',**spec,'frameWidth':84,'frameHeight':84}
 pack['scope']='body-hair-review';pack['status']='Body and short hair continuity only; outfit, footwear and weapon still absent.'
 pack['rig']['requiredSlots']=['body','hair'];pack['pieces'].append(hairpiece);pack['appearance']['pieces']['hair']=hairpiece['id']
 write('review-pack.json',pack)
 write('source-audit.json',{'paid_calls':0,'new_pixels':0,'body_poses':80,'hair_poses':80,'artistic_continuity_approved':False,'copied':records,'attack_hair_source':'pixellab-pip-generations/paper-doll-walk-profiles-20261021/hair-idle.png','attack_hair_source_sha256':digest(HAIR/'hair-idle.png'),'attack_hair_poses':poses,'method':'Directional static hair surface translated to each real animated head; bodies never duplicated or altered.'})
 print('80 body/hair poses packaged; 32 attack hair placements use original directional pixels.')
if __name__=='__main__':main()
