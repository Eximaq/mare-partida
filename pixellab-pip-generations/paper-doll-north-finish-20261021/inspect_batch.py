"""Retrieve completed four-pose edits, verify masks, preserve all raw pixels."""
import argparse,json,sys,urllib.request
from pathlib import Path
from PIL import Image
from prepare_inputs import HERE,digest,write,guide
sys.path.insert(0,str(HERE.parents[1]/'tools'))
from paper_doll_batch_audit import audit_batch
def inspect(batch):
    inputs=json.loads((HERE/'inputs.json').read_text())
    for name,expected in inputs['files'].items():
        if digest(HERE/name)!=expected:raise ValueError('Frozen input changed: '+name)
    path=HERE/(batch+'-job.json');receipt=json.loads(path.read_text());raw=HERE/(batch+'-raw.png')
    if receipt['status']!='completed':raise ValueError('Confirm completion first; never repeat a paid call for download failure')
    if not raw.exists():raw.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download',timeout=60).read())
    if receipt.get('raw_sha256',digest(raw))!=digest(raw):raise ValueError('Generated original changed')
    receipt['raw_sha256']=digest(raw);write(path.name,receipt)
    indices=inputs['cell_order'][batch]
    anchors=[(32,Image.open(HERE/f'body-raw-{i:02}.png').getbbox()[1]+1) for i in indices] if batch=='hair-repair' else [(16,27)]*6 if batch=='outfit-remaining' else [(32,27)]*4
    cell_size=(32,64) if batch=='outfit-remaining' else 64
    report=audit_batch(HERE/(batch+'-input.png'),raw,HERE/(batch+'-mask.png'),cell_size,anchors,True,HERE/batch);write(batch+'-audit.json',report)
    result=Image.open(raw).convert('RGBA');body=Image.open(HERE/(batch+'-input.png')).convert('RGBA')
    if result.size==body.size:
        composite=Image.alpha_composite(body,result)
        if batch=='outfit-remaining':
            bg=Image.new('RGBA',composite.size,(25,56,58,255));preview=Image.alpha_composite(bg,composite).convert('RGB').resize((1152,384),Image.Resampling.NEAREST);preview.save(HERE/(batch+'-composite-inspection-grid.png'))
        else:guide(composite,batch+'-composite-inspection-grid.png')
    print(batch,'structural',report['passed'],'unique',report.get('unique_visible_frames'));return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('batch',choices=['hair-repair','outfit-first','outfit-last','outfit-remaining']);inspect(p.parse_args().batch)
