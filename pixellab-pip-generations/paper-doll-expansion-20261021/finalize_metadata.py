"""Summarize recorded calls only; no authentication, generation or balance requests."""
import hashlib,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
NAMES=['character-job.json','walk-south-job.json','walk-template-job.json',
       *[f'idle-{d}-job.json' for d in ['north','west','east']],
       *[f'{s}-{d}-job.json' for s in ['hair','outfit','weapon'] for d in ['north','west','east']],
       'attack-south-job.json','attack-south-retry-job.json','walk-minimax-job.json']

def main():
    calls=[json.loads((HERE/name).read_text()) for name in NAMES]
    for name,receipt in zip(NAMES,calls):
        slot=next((s for s in ['hair','outfit','weapon'] if receipt.get('parameters',{}).get('mask_image_url','').startswith(s+'-')),None)
        if slot:
            direction=receipt['parameters']['mask_image_url'].split('-')[1]
            raw=HERE/f'{slot}-{direction}-raw.png'
            if raw.exists():
                digest=hashlib.sha256(raw.read_bytes()).hexdigest()
                if receipt.get('raw_sha256',digest)!=digest:raise ValueError('Original output changed: '+raw.name)
                receipt['raw_sha256']=digest
                (HERE/name).write_text(json.dumps(receipt,indent=2)+'\n')
    confirmed=sum(c.get('reported_usage',{}).get('generations',0) for c in calls)
    reported=sum(c.get('tool_reported_generations',0) or (c.get('estimated_generations',0) if c.get('tool')=='MCP create_character' else 0) for c in calls if 'reported_usage' not in c)
    unknown=sum(c.get('estimated_generations',0) for c in calls if 'reported_usage' not in c and c.get('tool') in ['MCP animate_image','MCP animate_image_pixminimax'])
    manifest={'status':'four-direction Idle prototype; production not enabled',
              'authorization':'Owner authorized autonomous recommended PixelLab continuation in this execution; self-imposed ceiling100 additional generations, no USD overage or global auto change.',
              'ceiling_generations':100,'confirmed_charged_generations':confirmed,
              'other_tool_reported_generations':reported,'unconfirmed_estimate_generations':unknown,
              'conservative_total':confirmed+reported+unknown,'calls':calls,
              'ready':['idle/south','idle/north','idle/west','idle/east'],
              'missing':['approved four-direction Walk body/hair/outfit/weapon','approved four-direction sword Attack body/hair/outfit/weapon','skills/hurt/death coverage before production migration'],
              'artwork_approved':False,'jobs_owned_still_processing':[c['job_id'] for c in calls if c.get('status')=='processing']}
    (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    steps=[{'TASK':'Review current run authority, ceiling and all recorded quality failures before paying. This recipe is an audit, not permission to repeat the run. Preserve originals; do not reproduce rejected work automatically.'}]
    for c in calls:
        if c.get('status')=='processing':continue
        if c['tool']=='MCP animate_character':steps.append({'TASK':'The original managed character id is recorded below. When recreating from a new create_character result, substitute only its returned id, retaining the same tool parameters.'})
        if c['tool']=='MCP inpaint_image_pro_flash':steps.append({'TASK':'Load the exact supplied native body atlas/frame, binary mask and optional context. Verify registration and frozen input pixels. No rescaling or painting source art.'})
        steps.append({'_comment':c.get('job_id',c.get('character_id'))+'; '+c['status'],c['tool']:c['parameters']})
    steps.append({'TASK':'Preserve outputs in order. Inspect body identity/loop before layer work. Split only successful masked atlases without repainting; use assemble_review.py for transparent padding and real hand sockets. Keep all pieces unapproved and fall back for missing actions. Validate in real browser before proposing merge.'})
    (HERE/'expansion.blueprint.json').write_text(json.dumps(steps,indent=2)+'\n')
    plan=json.loads((HERE/'run-plan.json').read_text());plan.update(known_charged_generations=confirmed,other_reported_generations=reported,unconfirmed_estimate_generations=unknown,conservative_total=confirmed+reported+unknown)
    (HERE/'run-plan.json').write_text(json.dumps(plan,indent=2)+'\n')
    print('Recorded usage:',confirmed,'confirmed,',reported,'other reported,',unknown,'unconfirmed estimate. Pending owned jobs:',manifest['jobs_owned_still_processing'])

if __name__=='__main__':main()
