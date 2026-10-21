"""Verify original output; only split native cells after the whole batch passes."""
from pathlib import Path
import argparse,hashlib,json,sys
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[1]/'tools'))
from paper_doll_batch_audit import audit_batch

def main(slot):
    inputs=json.loads((HERE/'input-preparation.json').read_text())
    for frame in inputs['frames']:
        if hashlib.sha256((HERE/frame['source']).read_bytes()).hexdigest()!=frame['sha256']:
            raise ValueError('Source changed after input preparation')
    anchors={'weapon':[(20,36),(18,35),(20,36),(19,35)],
             'hair':[(32,f['head_top']+1) for f in inputs['frames']],
             'outfit':[(32,27)]*4}[slot]
    raw=HERE/f'{slot}-raw.png'
    report=audit_batch(HERE/'body-atlas-input.png',raw,HERE/f'{slot}-mask-input.png',
                       64,anchors,allow_body_occlusion=slot!='weapon',output_dir=HERE/slot)
    report['slot']=slot
    report['raw_sha256']=hashlib.sha256(raw.read_bytes()).hexdigest()
    (HERE/f'{slot}-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    result=Image.open(raw).convert('RGBA')
    if result.size==(128,128):
        source=Image.open(HERE/'body-atlas-input.png').convert('RGBA')
        composite=Image.alpha_composite(source,result)
        composite.save(HERE/f'{slot}-composite-inspection.png')
        guide=composite.copy();draw=ImageDraw.Draw(guide)
        draw.line((64,0,64,127),fill=(248,210,110,255));draw.line((0,64,127,64),fill=(248,210,110,255))
        guide.save(HERE/f'{slot}-inspection-grid.png')
        guide.resize((768,768),Image.Resampling.NEAREST).save(HERE/f'{slot}-inspection-6x.png')
    print(json.dumps(report))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('slot',choices=['weapon','hair','outfit'])
    main(parser.parse_args().slot)
