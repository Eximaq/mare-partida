"""Audit an actual masked base-body edit; never patch or invent body pixels."""
import hashlib,json,sys,urllib.request
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[1]/'tools'))
from paper_doll_fit_audit import pixels

def audit(source,edited,mask):
    if source.size!=edited.size or source.size!=mask.size or source.size!=(256,128):return {'passed':False,'reason':'canvas-size-mismatch'}
    before=list(pixels(source));after=list(pixels(edited));allowed=list(pixels(mask.convert('RGB')))
    if any(c not in [(0,0,0),(255,255,255)] for c in allowed):raise ValueError('Nonbinary mask')
    changed=[i for i,(a,b) in enumerate(zip(before,after)) if a!=b and (a[3] or b[3])]
    outside=sum(allowed[i]!=(255,255,255) for i in changed)
    partial=sum(0<p[3]<255 for p in after)
    records=[];fingerprints=[]
    for i in range(8):
        x,y=(i%4)*64,(i//4)*64;box=(x,y,x+64,y+64);a=source.crop(box);b=edited.crop(box);m=mask.crop(box).convert('RGB')
        visible=bytes(v for c in pixels(b) for v in (c if c[3] else (0,0,0,0)));fingerprints.append(hashlib.sha256(visible).hexdigest())
        delta=sum(bool(c!=d and (c[3] or d[3])) for c,d in zip(pixels(a),pixels(b)))
        # An edited base may erase old forearm pixels INSIDE its explicit mask.
        records.append({'frame':i,'changed_pixels':delta,'bbox':b.getbbox(),'source_foot_bottom':a.getbbox()[3],'edited_foot_bottom':b.getbbox()[3] if b.getbbox() else None})
    passed=bool(changed) and not outside and not partial and len(set(fingerprints))>1 and all(r['changed_pixels']>0 and r['bbox'] and r['source_foot_bottom']==r['edited_foot_bottom'] for r in records)
    return {'passed':passed,'scope':'native masked base edit only; artistic review required','outside_mask_changes':outside,'partial_alpha_pixels':partial,'unique_frames':len(set(fingerprints)),'frames':records,'unmasked_face_torso_legs_preserved':not outside,'artwork_approved':False}

def main():
    f=HERE/'arm-job.json';receipt=json.loads(f.read_text());raw=HERE/'body-corrected-raw.png'
    if receipt['status']!='completed':raise ValueError('Confirm job completion first')
    if not raw.exists():raw.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download',timeout=60).read())
    digest=hashlib.sha256(raw.read_bytes()).hexdigest()
    if receipt.get('raw_sha256',digest)!=digest:raise ValueError('Generated original changed')
    receipt['raw_sha256']=digest;f.write_text(json.dumps(receipt,indent=2)+'\n')
    source=Image.open(HERE/'body-input.png').convert('RGBA');edited=Image.open(raw).convert('RGBA');mask=Image.open(HERE/'arm-mask.png').convert('RGB')
    report=audit(source,edited,mask);(HERE/'body-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    if edited.size==(256,128):edited.resize((1024,512),Image.Resampling.NEAREST).save(HERE/'body-corrected-inspection.png')
    if report['passed']:
        for i in range(8):x,y=(i%4)*64,(i//4)*64;edited.crop((x,y,x+64,y+64)).save(HERE/f'body-corrected-{i+1:02}.png')
    print(json.dumps(report))

if __name__=='__main__':main()
