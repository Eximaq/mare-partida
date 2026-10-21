"""Retrieve completed masked layers, audit and split native cells; no pixel repair."""
import argparse,json,sys,urllib.request,hashlib
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[1]/'tools'))
from paper_doll_batch_audit import audit_batch

def inspect(slot,direction):
    path=HERE/f'{slot}-{direction}-job.json';receipt=json.loads(path.read_text())
    if receipt['status']!='completed':raise ValueError('Only completed jobs may be retrieved')
    raw=HERE/f'{slot}-{direction}-raw.png'
    if not raw.exists():raw.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download',timeout=60).read())
    digest=hashlib.sha256(raw.read_bytes()).hexdigest()
    if receipt.get('raw_sha256',digest)!=digest:raise ValueError('Original result changed')
    receipt['raw_sha256']=digest;path.write_text(json.dumps(receipt,indent=2)+'\n')
    bodies=[Image.open(HERE/f'body-idle-{direction}-raw-{i:02}.png').convert('RGBA') for i in range(1,5)]
    anchors=[(32,im.getbbox()[1]+1) for im in bodies] if slot=='hair' else [(32,27)]*4
    report=audit_batch(HERE/f'body-{direction}-atlas.png',raw,HERE/f'{slot}-{direction}-mask.png',64,anchors,True,HERE/f'{slot}-{direction}')
    (HERE/f'{slot}-{direction}-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    result=Image.open(raw).convert('RGBA')
    if result.size==(128,128):Image.alpha_composite(Image.open(HERE/f'body-{direction}-atlas.png').convert('RGBA'),result).resize((768,768),Image.Resampling.NEAREST).save(HERE/f'{slot}-{direction}-inspection.png')
    print(slot,direction,'passed',report['passed'],'unique',report.get('unique_visible_frames'))
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('slot',choices=['hair','outfit']);p.add_argument('direction',choices=['north','west','east']);a=p.parse_args();inspect(a.slot,a.direction)
