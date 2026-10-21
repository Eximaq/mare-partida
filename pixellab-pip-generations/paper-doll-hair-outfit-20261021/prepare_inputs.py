"""Copy verified existing inputs only; never starts a PixelLab generation."""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image

HERE=Path(__file__).resolve().parent
SOURCE=HERE.parent/'paper-doll-layer-batch-20261021'
RIGID=HERE.parent/'paper-doll-rigid-weapon-20261021'

def main():
    records=[]
    names=['body-atlas-input.png','hair-mask-input.png','outfit-mask-input.png','look-context-input.png','look-reference-source.png']
    names += [f'body-source-{i:02}.png' for i in range(1,5)]
    for origin,names_to_copy in [(SOURCE,names),(RIGID,['rigid-weapon.png','body-idle-south.png'])]:
        for name in names_to_copy:
            source=origin/name;destination=HERE/name
            if destination.exists() and destination.read_bytes()!=source.read_bytes():raise ValueError('Refusing to overwrite different input: '+name)
            shutil.copy2(source,destination)
            with Image.open(destination) as image:
                records.append({'file':name,'origin':origin.name+'/'+name,
                                'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'native_size':list(image.size)})
    for slot in ['hair','outfit']:
        mask=Image.open(HERE/f'{slot}-mask-input.png').convert('RGB')
        assert mask.size==(128,128) and set(mask.get_flattened_data())=={(0,0,0),(255,255,255)}
    (HERE/'input-preparation.json').write_text(json.dumps({'status':'inputs only; no paid calls',
        'frames':4,'direction':'south','animation':'idle','cell':[64,64],'atlas':[128,128],
        'order':'row-major, original frame order','scale':False,'files':records},indent=2)+'\n')
    old=json.loads((SOURCE/'generation-plan.json').read_text())
    calls=[call for call in old['calls'] if call['slot'] in ['hair','outfit']]
    plan={'status':'awaiting explicit approval; no paid calls','estimated_generations':12,'ceiling_generations':12,
          'no_retries':True,'stop_after_failed_gate':True,'calls':calls,
          'assembly':'Separate native layers, split cells without resampling, transparent padding10/13 to84x84, four real frames4FPS; existing rigid weapon reused unchanged.',
          'production':'Review only until art approved; existing gameplay fallback preserved.'}
    (HERE/'generation-plan.json').write_text(json.dumps(plan,indent=2)+'\n')
    print('Prepared two masked layer calls, proposed12 generations total, none submitted.')

if __name__=='__main__':main()
