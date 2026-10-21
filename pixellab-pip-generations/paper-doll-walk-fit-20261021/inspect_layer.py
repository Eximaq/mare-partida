"""Audit and split only successful native eight-frame hair/clothing results."""
import argparse,hashlib,json,sys,urllib.request
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[1]/'tools'))
from paper_doll_batch_audit import audit_batch

def inspect(slot):
    inputs=json.loads((HERE/'layer-inputs.json').read_text())
    for name,digest in inputs['files'].items():
        if hashlib.sha256((HERE/name).read_bytes()).hexdigest()!=digest:raise ValueError('Frozen input changed: '+name)
    path=HERE/f'{slot}-job.json';receipt=json.loads(path.read_text());raw=HERE/f'{slot}-raw.png'
    if receipt['status']!='completed':raise ValueError('Confirm completion before retrieval')
    if not raw.exists():raw.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download',timeout=60).read())
    digest=hashlib.sha256(raw.read_bytes()).hexdigest()
    if receipt.get('raw_sha256',digest)!=digest:raise ValueError('Original generated layer changed')
    receipt['raw_sha256']=digest;path.write_text(json.dumps(receipt,indent=2)+'\n')
    bodies=[Image.open(HERE/f'body-corrected-{i+1:02}.png').convert('RGBA') for i in range(8)]
    anchors=[(32,im.getbbox()[1]+1) for im in bodies] if slot=='hair' else [(32,27)]*8
    report=audit_batch(HERE/'body-corrected-raw.png',raw,HERE/f'{slot}-mask.png',64,anchors,True,HERE/slot)
    (HERE/f'{slot}-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    layer=Image.open(raw).convert('RGBA')
    if layer.size==(256,128):Image.alpha_composite(Image.open(HERE/'body-corrected-raw.png').convert('RGBA'),layer).resize((1024,512),Image.Resampling.NEAREST).save(HERE/f'{slot}-inspection.png')
    print(slot,'passed',report['passed'],'unique',report.get('unique_visible_frames'))
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('slot',choices=['hair','outfit']);inspect(p.parse_args().slot)
