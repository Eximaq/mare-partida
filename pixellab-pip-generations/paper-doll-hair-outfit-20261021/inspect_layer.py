"""Check the real output against its frozen inputs; split only a valid whole atlas."""
from pathlib import Path
import argparse,hashlib,json,sys
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[1]/'tools'))
from paper_doll_batch_audit import audit_batch

def inspect(slot):
    inputs=json.loads((HERE/'input-preparation.json').read_text())
    for entry in inputs['files']:
        if hashlib.sha256((HERE/entry['file']).read_bytes()).hexdigest()!=entry['sha256']:
            raise ValueError('Frozen input changed: '+entry['file'])
    tops=[Image.open(HERE/f'body-source-{i:02}.png').getbbox()[1] for i in range(1,5)]
    anchors=[(32,top+1) for top in tops] if slot=='hair' else [(32,27)]*4
    raw=HERE/f'{slot}-raw.png'
    receipt=json.loads((HERE/f'{slot}-job.json').read_text())
    expected_hash=receipt.get('raw_sha256')
    if expected_hash and hashlib.sha256(raw.read_bytes()).hexdigest()!=expected_hash:
        raise ValueError('Original PixelLab output changed: '+slot)
    report=audit_batch(HERE/'body-atlas-input.png',raw,HERE/f'{slot}-mask-input.png',64,anchors,
                       allow_body_occlusion=True,output_dir=HERE/slot)
    report.update(slot=slot,raw_sha256=hashlib.sha256(raw.read_bytes()).hexdigest())
    (HERE/f'{slot}-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    with Image.open(raw) as result:
        if result.size==(128,128):
            composite=Image.alpha_composite(Image.open(HERE/'body-atlas-input.png').convert('RGBA'),result.convert('RGBA'))
            composite.save(HERE/f'{slot}-composite-inspection.png')
            guide=composite.copy();draw=ImageDraw.Draw(guide)
            draw.line((64,0,64,127),fill=(248,210,110,255));draw.line((0,64,127,64),fill=(248,210,110,255))
            guide.save(HERE/f'{slot}-inspection-grid.png')
            guide.resize((768,768),Image.Resampling.NEAREST).save(HERE/f'{slot}-inspection-6x.png')
    print(json.dumps(report))
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('slot',choices=['hair','outfit'])
    inspect(parser.parse_args().slot)
