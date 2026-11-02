"""Pack the owner's nine existing PixelLab exports without resampling source pixels."""
import argparse,hashlib,io,json,zipfile
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
RECORDS=[('alvida','Alvida','efe38a49-b281-47eb-8c09-30d425d03291',84,{'walk':'Walking','attack':'Attack','hurt':'The_body_jolts'}),('morgan','Morgan','dfe782a0-01a4-45f3-8c65-bbe16abc5830',114,{'walk':'Walking','attack':'Attack','hurt':'Jerk_upper'}),('buggy','Buggy','1b32c37b-8aa6-4139-b948-f832eadd55f6',108,{'walk':'Walking','attack':'Attackl','hurt':'Sofrer_dano'}),('kuro','Kuro','ad4bc800-098b-4065-8017-ec46c784fc7d',102,{'walk':'Step_forward','attack':'Both_hands','hurt':'React_with'}),('krieg','Don Krieg','19bcb138-d9d4-432c-aa53-fb384db28bd4',116,{'walk':'Shift_weight','attack':'The_right_hand','hurt':'Tense_the'}),('arlong','Arlong','ceb733b5-99c9-4c84-ab66-7f673c6d0c93',120,{'walk':'Shift_weight','attack':'The_right_hand','hurt':'Flash_red'}),('smoker','Smoker','b262f653-ac04-4988-93ac-8b4b29886fa8',112,{'walk':'The_knees','attack':'The_right_hand','hurt':'The_body_recoils'}),('wapol','Wapol','f208acb0-982c-4d65-9567-39c27e7f43e7',116,{'walk':'Shift_the','attack':'The_jaw','hurt':'Jolt_backward'}),('crocodile','Crocodile','bac38f19-0860-44ac-ae07-7e81e9f541aa',114,{'walk':'Lift_the_right','attack':'Extend_both','hurt':'The_body_flinches'})]
IMPACTS={"alvida":{"south":6,"east":5,"west":5,"north":4},"morgan":{"south":4,"east":4,"west":4,"north":5},"buggy":{"south":3,"east":3,"west":3,"north":3},"kuro":{"south":2,"east":2,"west":2,"north":2},"krieg":{"south":3,"east":5,"west":5,"north":5},"arlong":{"south":4,"east":3,"west":3,"north":4},"smoker":{"south":10,"east":5,"west":5,"north":5},"wapol":{"south":4,"east":4,"west":4,"north":4},"crocodile":{"south":7,"east":7,"west":7,"north":7}}
def main():
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--evidence',type=Path,required=True);a=p.parse_args();runtime={};proof=[]
 for key,name,cid,height,aliases in RECORDS:
  archive=a.source/(key+'.zip');blob=archive.read_bytes()
  with zipfile.ZipFile(io.BytesIO(blob)) as z:
   state=next(s for s in json.loads(z.read('metadata.json'))['states'] if s['character']['id']==cid);frames=state['frames'];groups={'idle':frames['rotations']}
   for action,prefix in aliases.items():
    matches=[n for n in frames['animations'] if n.startswith(prefix)];assert len(matches)==1,(key,action,matches);groups[action]=frames['animations'][matches[0]]
   entry={'id':cid,'name':name,'monster':True,'dungeonBoss':True,'worldHeight':height,'legacyHeight':height,'world_scale':1,'clips':{}};metrics={'id':cid,'name':name,'source':'Existing owner PixelLab character export','archive_sha256':hashlib.sha256(blob).hexdigest(),'clips':{}}
   dest=ROOT/'assets/sprites-combat-v2'/('dungeon-'+key);dest.mkdir(parents=True,exist_ok=True)
   for action,ds in groups.items():
    entry['clips'][action]={};metrics['clips'][action]={}
    for direction,files in ds.items():
     files=[files] if isinstance(files,str) else files;images=[Image.open(io.BytesIO(z.read(f))).convert('RGBA') for f in files];size=max(max(im.size) for im in images);sheet=Image.new('RGBA',(size*len(images),size));bounds=[];hashes=[]
     for n,im in enumerate(images):
      dx,dy=(size-im.width)//2,(size-im.height)//2;sheet.paste(im,(n*size+dx,dy));assert sheet.crop((n*size+dx,dy,n*size+dx+im.width,dy+im.height)).tobytes()==im.tobytes();b=im.getbbox();assert b,(key,action,direction,n);bounds.append([b[0]+dx,b[1]+dy,b[2]+dx,b[3]+dy]);hashes.append(hashlib.sha256(im.tobytes()).hexdigest())
     filename=action+'-'+direction+'.png';sheet.save(dest/filename);original='idle' if action=='idle' else next(n for n in frames['animations'] if n.startswith(aliases[action]));clip={'image':'assets/sprites-combat-v2/dungeon-'+key+'/'+filename,'size':size,'frames':len(images),'fps':12 if len(images)<=9 else 24,'loop':action in ['idle','walk'],'bounds':bounds,'anchor':[size/2,bounds[0][3]],'source_animation':original}
     if action=='attack':clip['impact_frame']=IMPACTS[key][direction]
     if action=='hurt':clip.update(playback_start=0,playback_frames=min(4,len(images)),playback_seconds=.18)
     entry['clips'][action][direction]=clip;metrics['clips'][action][direction]={'source_sizes':[list(im.size) for im in images],'rgba_sha256':hashes}
     if action=='attack' and direction in ['south','east']:
      contact=Image.new('RGB',(size*len(images),size+22),(24,35,43));contact.paste(sheet,(0,22),sheet);d=ImageDraw.Draw(contact)
      for n in range(len(images)):d.text((n*size+3,3),str(n),fill='white')
      contact.save(a.evidence/(key+'-attack-'+direction+'.png'))
   for action in ['walk','attack']:assert set(entry['clips'][action])>={'north','south','east','west'}
   (dest/'metadata.json').write_text(json.dumps({**entry,'provenance':metrics},ensure_ascii=False,indent=2)+'\n',encoding='utf8');runtime['dungeon-'+key]=entry;proof.append({'key':'dungeon-'+key,'character_id':cid,'name':name,'archive_sha256':metrics['archive_sha256'],'world_height':height})
 (ROOT/'dungeon-boss-art-data.js').write_text("'use strict';\nObject.assign(globalThis.MareSpriteCombatV2Data,"+json.dumps(runtime,ensure_ascii=False,separators=(',',':'))+");\n",encoding='utf8')
 (ROOT/'assets/sprites-combat-v2/dungeon-boss-provenance.json').write_text(json.dumps({'source':'Existing owner PixelLab animations, retrieved 2026-11-01','resampling':False,'characters':proof,'portraits':[{'boss_id':key,'path':str(path.relative_to(ROOT)).replace(chr(92),'/'),'source':'Existing approved owner illustration' if key in ['alvida','morgan'] else 'Owner-provided HD portrait','sha256':hashlib.sha256(path.read_bytes()).hexdigest()} for key in [r[0] for r in RECORDS] for path in [ROOT/'assets/ui/boss-dungeons'/(key+'-hd.png' if key in ['alvida','morgan'] else 'portraits/'+key+('.jpg' if key=='buggy' else '.png'))]]},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print('Imported nine existing characters losslessly; no generation.')
if __name__=='__main__':main()
