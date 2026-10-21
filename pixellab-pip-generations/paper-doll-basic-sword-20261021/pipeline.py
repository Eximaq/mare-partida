"""Retrieve and audit native attacks. No paid calls, painting or synthetic frames."""
import argparse, hashlib, json, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageDraw
HERE=Path(__file__).resolve().parent
OLD=HERE.parent/'paper-doll-walk-profiles-20261021'
EXPANSION=HERE.parent/'paper-doll-expansion-20261021'
sys.path.insert(0,str(HERE.parents[1]/'tools'))
from paper_doll_batch_audit import audit_batch

def write(name,data): (HERE/name).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def body_path(direction,index):
    receipt=json.loads((HERE/f'body-{direction}-job.json').read_text())
    return HERE/(receipt.get('frame_prefix',f'body-{direction}-raw')+f'-{index:02}.png')
def normalized(im): return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def guide(im,name,cell=64):
    bg=Image.new('RGBA',im.size,(25,56,58,255));bg.alpha_composite(im)
    out=bg.convert('RGB').resize((im.width*5,im.height*5),Image.Resampling.NEAREST)
    draw=ImageDraw.Draw(out)
    for x in range(cell*5,out.width,cell*5): draw.line((x,0,x,out.height),fill='#bca276')
    out.save(HERE/name)

def retrieve(direction):
    receipt=json.loads((HERE/f'body-{direction}-job.json').read_text())
    if receipt['status']!='completed': raise ValueError('Confirm terminal getter; never resubmit')
    def fetch(i):
        path=body_path(direction,i)
        if not path.exists(): path.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download?index={i}',timeout=60).read())
        if receipt.get('sha256',{}).get(path.name,digest(path))!=digest(path): raise ValueError('Frozen original changed')
    with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(fetch,range(9)))
    frames=[]
    for i in range(9):
        path=body_path(direction,i)
        im=Image.open(path).convert('RGBA')
        if im.size!=(64,64) or not im.getbbox(): raise ValueError('Invalid body canvas')
        frames.append(im)
    receipt['sha256']={body_path(direction,i).name:digest(body_path(direction,i)) for i in range(9)}
    write(f'body-{direction}-job.json',receipt)
    sheet=Image.new('RGBA',(512,64))
    for i,frame in enumerate(frames[1:]): sheet.paste(frame,(i*64,0))
    sheet.save(HERE/f'body-{direction}-native.png');guide(sheet,f'body-{direction}-inspection-grid.png')
    report={'echo_matches':normalized(frames[0])==normalized(Image.open(HERE/f'body-{direction}-input.png')),'unique_frames':len({normalized(im) for im in frames[1:]}),'bounds':[im.getbbox() for im in frames[1:]],'partial_alpha_pixels':sum(0<c[3]<255 for f in frames[1:] for c in f.get_flattened_data()),'artwork_approved':False}
    write(f'body-{direction}-structure.json',report);print(report)

def prepare(direction):
    quality=json.loads((HERE/'quality-review.json').read_text())
    if not quality['body'][direction]['prototype_gate_passed']: raise ValueError('Inspect body before dependent layers')
    structure=json.loads((HERE/f'body-{direction}-structure.json').read_text())
    if not structure['echo_matches'] or structure['unique_frames']!=8 or structure['partial_alpha_pixels']: raise ValueError('Invalid raw sequence')
    source=Image.new('RGBA',(256,64));masks={slot:Image.new('RGB',(256,64)) for slot in ['hair','outfit']}
    for i in range(8):
        body=Image.open(body_path(direction,i+1)).convert('RGBA');crop=body.crop((16,0,48,64));restored=Image.new('RGBA',(64,64));restored.paste(crop,(16,0))
        if normalized(restored)!=normalized(body): raise ValueError('Transparent-margin crop loses visible pixels')
        source.paste(crop,(i*32,0))
        for slot,mask in masks.items():
            native=Image.new('RGB',(64,64));draw=ImageDraw.Draw(native)
            for operation,shape in quality['masks'][direction][slot][i]:
                fill='white' if operation.startswith('allow') else 'black'
                if operation.endswith('-polygon'):draw.polygon([tuple(point) for point in shape],fill=fill)
                else:draw.rectangle(shape,fill=fill)
            mask.paste(native.crop((16,0,48,64)),(i*32,0))
    source.save(HERE/f'body-{direction}-compact.png')
    reference=Image.open(HERE/f'body-{direction}-input.png').convert('RGBA')
    for slot in ['outfit','hair']:
        if direction=='south':
            folder=HERE.parent/'paper-doll-hair-outfit-20261021'
            # These original64 layers already correspond to the front-facing input.
            layer=Image.open(folder/f'{slot}-raw.png').convert('RGBA').crop((0,0,64,64))
        else: layer=Image.open(EXPANSION/f'{slot}-{direction}-raw.png').convert('RGBA').crop((0,0,64,64))
        reference=Image.alpha_composite(reference,layer)
    reference.save(HERE/f'look-{direction}-reference.png')
    context=Image.new('RGBA',(320,64));context.paste(source,(0,0));context.paste(reference,(256,0));context.save(HERE/f'look-{direction}-context.png')
    for slot,mask in masks.items(): mask.save(HERE/f'{slot}-{direction}-mask.png')
    names=[f'body-{direction}-compact.png',f'look-{direction}-reference.png',f'look-{direction}-context.png']+[f'{s}-{direction}-mask.png' for s in masks]
    write(f'inputs-{direction}.json',{'cell_size':[32,64],'atlas':[256,64],'crop':[16,0,48,64],'body_padding':[10,13 if direction in ['south','north'] else 10],'layer_padding':[26,13 if direction in ['south','north'] else 10],'files':{name:digest(HERE/name) for name in names}})
    guide(source,f'compact-{direction}-inspection-grid.png',32)

def inspect(slot,direction):
    inputs=json.loads((HERE/f'inputs-{direction}.json').read_text())
    for name,expected in inputs['files'].items():
        if digest(HERE/name)!=expected: raise ValueError('Frozen input changed')
    receipt=json.loads((HERE/f'{slot}-{direction}-job.json').read_text());raw=HERE/f'{slot}-{direction}-raw.png'
    if receipt['status']!='completed': raise ValueError('Confirm completion first')
    if not raw.exists(): raw.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download',timeout=60).read())
    if receipt.get('raw_sha256',digest(raw))!=digest(raw): raise ValueError('Original layer changed')
    receipt['raw_sha256']=digest(raw);write(f'{slot}-{direction}-job.json',receipt)
    correction_file=HERE/f'{slot}-{direction}-workbench.json'
    if correction_file.is_file():
        correction=json.loads(correction_file.read_text());candidate=HERE/correction['output_file']
        if digest(raw)!=correction['source_sha256'] or digest(candidate)!=correction['output_sha256']:raise ValueError('Frozen Workbench copy changed')
        before=Image.open(raw).convert('RGBA');after=Image.open(candidate).convert('RGBA')
        expected=list(before.get_flattened_data());original=expected.copy()
        for op in json.loads(correction['parameters']['argv'][3]):
            if op['operation']!='map_colors' or op['frames']!=[1] or op['layer']!='image':raise ValueError('Unexpected correction operation')
            x0,y0,x1,y1=op['region'];mapping={tuple(bytes.fromhex(a[1:])):tuple(bytes.fromhex(b[1:])) for a,b in op['colors'].items()}
            for y in range(y0,y1+1):
                for x in range(x0,x1+1):
                    index=y*before.width+x;expected[index]=mapping.get(expected[index],expected[index])
        if expected!=list(after.get_flattened_data()) or sum(a!=b for a,b in zip(original,expected))!=correction['changed_pixels']:raise ValueError('Workbench changed unexpected pixels')
        if any(a[3]!=b[3] for a,b in zip(original,expected)):raise ValueError('Clothing repair changed alpha')
        raw=candidate
    anchors=json.loads((HERE/'quality-review.json').read_text())['anchors'][direction][slot]
    report=audit_batch(HERE/f'body-{direction}-compact.png',raw,HERE/f'{slot}-{direction}-mask.png',(32,64),anchors,True,HERE/f'{slot}-{direction}')
    write(f'{slot}-{direction}-audit.json',report)
    guide(Image.alpha_composite(Image.open(HERE/f'body-{direction}-compact.png').convert('RGBA'),Image.open(raw).convert('RGBA')),f'{slot}-{direction}-inspection-grid.png',32)
    print(slot,direction,report['passed']);return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('operation',choices=['retrieve','prepare','inspect']);p.add_argument('direction',choices=['south','north','west','east']);p.add_argument('--slot',choices=['hair','outfit']);args=p.parse_args()
    if args.operation=='inspect': inspect(args.slot,args.direction)
    else: globals()[args.operation](args.direction)
