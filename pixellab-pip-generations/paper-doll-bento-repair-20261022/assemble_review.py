"""Package real generated bodies and the inherited verified layers; never generate art."""
import hashlib,json,shutil,sys
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
BASE=HERE.parent/'paper-doll-bento-directions-20261021'
sys.path.insert(0,str(BASE))
from compose import save_gif,normalized
DIRECTIONS=['south','north','west','east']
SLOTS=['body','pants','boots','outfit','hair','weapon']
def read(path):return json.loads(path.read_text(encoding='utf-8'))
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
 pack=read(BASE/'review-pack.json');reviews=pack['reviews'];audits={};calls=[];recipe=[]
 for d in ('north','east'):
  folder=HERE/d;review=read(folder/'review.json');reviews[d]=review
  call=read(folder/'manifest.json');assert call['status']=='completed';calls.append(call)
  args=read(folder/'request.json');args['first_frame_url']=d+'/neutral-reference.png'
  recipe.append({'_comment':'Exact sent request; resolve reference path to a data URL.','MCP animate_with_skeleton_v3':args})
  bounds=[Image.open(folder/f'body-{i:02}.png').getbbox() for i in range(8)]
  ground={b[3] for b in bounds};fixed_y=65-next(iter(ground)) if len(ground)==1 else (13 if d=='north' else 10)
  sheet=Image.new('RGBA',(672,84));records=[]
  for i in range(8):
   raw=Image.open(folder/f'body-{i:02}.png').convert('RGBA');assert raw.size==(64,64)
   assert set(raw.getchannel('A').get_flattened_data())=={0,255}
   padded=Image.new('RGBA',(84,84));padded.paste(raw,(10,fixed_y));sheet.paste(padded,(84*i,0))
   records.append({'frame':i,'padding':[10,fixed_y],'native_bounds':bounds[i],'ground_line':bounds[i][3]+fixed_y,'sha256':hashlib.sha256((folder/f'body-{i:02}.png').read_bytes()).hexdigest()})
  sheet.save(HERE/f'body-candidate-{d}.png');save_gif([sheet.crop((i*84,0,(i+1)*84,84)) for i in range(8)],HERE/f'body-{d}.gif');audits[d]=records
 # Accepted inherited attack rows are copied byte-for-byte; repairs never rewrite them.
 for name in SLOTS:shutil.copy2(BASE/f'{name}-attack.png',HERE/f'{name}-attack.png')
 for d in ('south','west'):
  shutil.copy2(BASE/f'body-candidate-{d}.png',HERE/f'body-candidate-{d}.png');shutil.copy2(BASE/f'modular-{d}.gif',HERE/f'modular-{d}.gif')
 shutil.copy2(BASE/'reference-bento-attack.png',HERE/'reference-bento-attack.png')
 pack['reviews']=reviews;pack['bodyCoverage']=[d for d in DIRECTIONS if reviews[d]['body_motion_gate_passed']]
 pack['status']='Frontal/west layers inherited; corrected north/east body studies. Production artwork remains unapproved.'
 pack['sourcePack']='../paper-doll-bento-directions-20261021/review-pack.json'
 write(HERE/'reviews.json',reviews);write(HERE/'review-pack.json',pack)
 manifest={'status':'completed','calls':calls,'charged_generations':sum(c['reported_usage']['generations'] for c in calls),'generation_ceiling':12,'pending_jobs':[],'production_enabled':False,'inherited_directions':['south','west'],'skipped_calls':[{'tool':'inpaint_image_pro_flash','reason':'East body failed its prerequisite gate.','charged_generations':0}],'seed':'omitted','local_assembly':'Fixed transparent padding; inherited valid layers copied unchanged. No local repaint, frame stabilization, duplication or anatomy repair.'}
 write(HERE/'manifest.json',manifest)
 write(HERE/'assembly-audit.json',{'body_records':audits,'inherited_sha256':{slot:hashlib.sha256((HERE/f'{slot}-attack.png').read_bytes()).hexdigest() for slot in SLOTS},'production_enabled':False})
 recipe[0]['_comment_prompt']='Pronto, modelo trocado continue; Pode continuar. Continue Paper Doll with the existing Bento motion and delegated generation decisions.'
 recipe[0]['_pixellab']={'paid_call_policy':'explicit_user_run_request_required','output_directory':'pixellab-pip-generations/paper-doll-bento-repair-20261022','output_collision_policy':'create_unique'}
 recipe.append({'TASK':{'goal':'Package inspection only; retain failed anatomy and use whole original fallback.','inputs':['north/review.json','east/review.json','../paper-doll-bento-directions-20261021/review-pack.json'],'actions':['Run offline request checks before spending.','Preserve eight raw frames and order per call.','Use fixed transparent padding, never per-frame stabilization.','Copy inherited frontal/west layers unchanged.','Keep all artwork unapproved.'],'outputs':['review-pack.json','assembly-audit.json','preview.html']}})
 write(HERE/'repairs.blueprint.json',recipe)
 print('Body-only review packaged:',pack['bodyCoverage'],'; modular:',pack['coverage']['attack-sword'])
if __name__=='__main__':main()
