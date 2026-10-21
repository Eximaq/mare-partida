"""Local provenance packaging; no API calls or account information."""
import hashlib,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
jobs=[json.loads((HERE/f'{slot}-job.json').read_text()) for slot in ['arm','hair','outfit']]
for job in jobs:
    if job['status']!='completed':raise ValueError('Unfinished job')
    if not isinstance(job['reported_usage'],dict):job['reported_usage']={'generations':job['reported_usage']}
total=sum(j['reported_usage']['generations'] for j in jobs)
manifest={'status':'review-only partial character; eight real Walk/south frames added; no production enablement',
 'authorization':'Owner authorized autonomous continuation and recommended PixelLab decisions; within existing conservative cumulative ceiling100; global auto unchanged; no USD overage',
 'scope':{'idle':['south','north','west','east'],'walk':['south'],'attack':[]},
 'jobs':jobs,'generation_usage':{'this_stage_confirmed':total,'prior_confirmed':57,'prior_tool_reported':2,'prior_unexposed_failed_job_estimate':1,'cumulative_confirmed':57+total,'cumulative_conservative':60+total,'ceiling':100},
 'sources':{'walk':'../paper-doll-expansion-20261021/body-walk-minimax-raw-01.png through08; original order, reference echo excluded','idle':'../paper-doll-expansion-20261021/review-pack.json','weapon':'../paper-doll-expansion-20261021/weapon-south.png'},
 'integrity':{'same_native_pixel_scale':True,'padding':[10,13],'pivot':[42,65],'body_edit':'Only explicit carry-arm mask; original face, gait and feet preserved','hair_outfit':'Independent changes-only edits on the same corrected base; protected-face/forearm masks','weapon':'Authorized rigid attachment, no new art or scaling','approval':'prototype visual gate only; approved:false'},
 'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.glob('*.png') if 'inspection' not in p.name},
 'missing':['Walk/north,west,east body and fitted hair/outfit plus directional sword grips','Attack/sword four directions, all body/hair/outfit frames and weapon poses'],
 'validation_report':'../../docs/PAPER-DOLL-CAMINHADA.md'}
(HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
recipe=[{'TASK':'Reuse original MiniMax generated frames1-8 without its reference echo. Preserve original order and 64x64 pixels. Assemble4x2 atlas; use binary carry-arm mask. Verify current cost authorization before any paid replay.'}]
for i,job in enumerate(jobs):
    if i==1:recipe.append({'TASK':'Verify corrected arm: eight distinct south poses, original face and feet, zero changes outside mask and actual hand contact. Stop on failure. Freeze corrected body and both addition masks. Both subsequent edits use this same corrected body independently.'})
    recipe.append({'_comment':job['job_id']+'; completed; charged9 generations','MCP inpaint_image_pro_flash':job['parameters']})
    recipe.append({'TASK':'Audit native output and inspect actual art. Preserve original PNG and receipt; stop on mask, face, hand, silhouette or transparency failure. Never paint repairs or duplicate frames.'})
recipe.append({'TASK':'Run assemble_review.py locally after actual visual gates. Reuse original rigid sword, measure each grip, fixed10/13 padding and42/65 pivot. Preserve four-view Idle, keep all pieces approved:false. Test all eight frames, toggles, mobile workbench, real-world fixture, fallback, saves, Haki and Zoan. No automatic production activation.'})
(HERE/'walk-fit.blueprint.json').write_text(json.dumps(recipe,indent=2)+'\n')
print('Manifest and canonical recipe written; stage confirmed',total,'conservative total',60+total)
