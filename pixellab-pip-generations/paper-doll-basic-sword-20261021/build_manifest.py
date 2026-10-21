"""Exact per-job usage and portable replay, with no account or upload data."""
import json
from pipeline import HERE,write,digest

def main():
    order=['rejected-body-south/body-south-job.json','body-south-job.json','hair-south-job.json','outfit-south-job.json','body-north-job.json','body-west-job.json','body-east-job.json','hair-north-job.json','outfit-north-job.json','hair-west-job.json','outfit-west-job.json','hair-east-job.json','outfit-east-job.json']
    paths=[HERE/name for name in order if (HERE/name).is_file()]
    jobs=[json.loads(p.read_text()) for p in paths]
    for job in jobs:job.setdefault('seed',job['parameters'].get('seed','omitted'))
    if any(j['status'] not in ['completed','failed'] for j in jobs):raise ValueError('Follow the exact pending getter before final delivery')
    used=sum(j.get('reported_usage',{}).get('generations',0) for j in jobs)
    if used>77:raise ValueError('Closed run ceiling exceeded')
    pack=json.loads((HERE/'review-pack.json').read_text())
    write('manifest.json',{'status':'Direction-gated review; production catalog unchanged','authorization':'Owner delegated recommended PixelLab decisions and explicitly requested basic shared attacks. Initial76 ceiling adjusted publicly to77 before remaining directions, including one rejected-body correction. Global auto unchanged; no further paid retries or USD overage.','jobs':jobs,'generation_usage':{'this_run_confirmed':used,'run_ceiling':77,'prior_conservative':150,'cumulative_conservative':150+used},'coverage':pack['coverage'],'shared_action':pack.get('sharedAction'),'artwork_approved':False,'production_enabled':False,'rejected_originals_preserved':True,'rig':[84,84],'pivot':[42,65],'native_body':[64,64],'layer_cell':[32,64],'layer_atlas':[256,64],'layer_seed':607822274,'weapon':'Original directional PNG, measured integer sockets, exact Canvas90-degree rotations. No generated duplicate weapon frames.','sha256':{p.name:digest(p) for p in HERE.glob('*.png') if 'inspection' not in p.name},'report':'../../docs/PAPER-DOLL-ATAQUE-BASICO.md'})
    recipe=[{'_pixellab':{'paid_call_policy':'explicit_user_run_request_required','output_directory':'pixellab-pip-generations/paper-doll-basic-sword-20261021','output_collision_policy':'create_unique'},'_comment_prompt':'Pode continuar o trabalho','TASK':'Verify current run authority and adjusted77-generation ceiling; create a unique empty output folder. Reuse existing human-v1 sources and fixed native rig. Reject the embedded-blade attempt, then inspect the corrected south body/layers and real combat before widening directions. Never alter main, gameplay clocks, saves or collaborators work.'}]
    for job in jobs:
        recipe.append({'MCP '+job['tool'].removeprefix('MCP '):job['parameters']})
        recipe.append({'TASK':'Poll this exact job to a terminal result without resubmission for a slow getter. Preserve raw originals and returned usage. For body sequences, keep the input echo separate and all eight real generated poses in order. Reject any embedded weapon, turn, changed anatomy or unreadable grip before generating dependent layers. Compact only reversible transparent margins and make pose-specific binary masks protecting anatomy. For layers, validate every cell, transparency and protected pixels before splitting and artistic inspection.'})
        if job['job_id']=='cc6bf7c1-4f45-4659-8be3-9840163fbb3c':
            correction=json.loads((HERE/'outfit-north-workbench.json').read_text())
            recipe.append({'TASK':'Inspect the raw north outfit in Workbench and obtain a still-image ID before repair. The recorded original had a front-facing collar and button seam on the back. Apply only the exact observed central vest recolors below on a new copy; rebind the inspected image ID when replaying against a new generation. Never overwrite the raw or gallery original. The whole body and sleeve pixels stay unchanged.'})
            recipe.append({'MCP pixelart_workbench':correction['parameters']})
            recipe.append({'TASK':'Download the new native layer. Verify the exact119 recolors and unchanged alpha/body/masks before using it. Preserve raw and corrected images, hashes and request. Per-call usage is not exposed; the tool describes exact edits as free for subscribers.'})
    recipe.append({'TASK':'Compose only complete inspected directions with the original rigid blade, measured hand sockets and optional exact90-degree orientations. Preserve old Idle/Walk bytes. Keep approved:false; unimplemented actions or directions use atomic legacy fallback. Produce native sheets and lossless-palette GIFs at approximately12FPS with loop metadata, no quantization or synthetic body frames. Validate original-source RGBA in Chromium, depth, controls/export, one-shot playback, real combat, old class/Haki/Zoan/save paths and Pages build. Push exclusive branch and open PR without merge.'})
    manifest=json.loads((HERE/'manifest.json').read_text());manifest['exact_workbench_edit']=json.loads((HERE/'outfit-north-workbench.json').read_text());write('manifest.json',manifest)
    write('basic-sword.blueprint.json',recipe);print('Confirmed charged:',used,'coverage:',pack['coverage']['attack-sword'])
if __name__=='__main__':main()
