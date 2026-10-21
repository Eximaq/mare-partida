"""Native profile walk retrieval/audit; never generate, repaint or mirror artwork."""
import argparse,hashlib,json,sys,urllib.request
from pathlib import Path
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent
OLD=HERE.parent/'paper-doll-expansion-20261021'
sys.path.insert(0,str(HERE.parents[1]/'tools'))
from paper_doll_batch_audit import audit_batch

def write(name,data):(HERE/name).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def normalized(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def guide(im,name,cell_width=64):
    bg=Image.new('RGBA',im.size,(25,56,58,255));bg.alpha_composite(im)
    out=bg.convert('RGB').resize((im.width*4,im.height*4),Image.Resampling.NEAREST)
    d=ImageDraw.Draw(out)
    for x in range(cell_width*4,out.width,cell_width*4):d.line((x,0,x,out.height),fill='#bca276')
    out.save(HERE/name)

def retrieve(direction):
    receipt=json.loads((HERE/f'body-{direction}-job.json').read_text(encoding='utf-8'))
    if receipt['status']!='completed':raise ValueError('Confirm completion; never repeat generation for a failed download')
    frames=[]
    for i in range(9):
        path=HERE/f'body-{direction}-raw-{i:02}.png'
        if not path.exists():path.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download?index={i}',timeout=60).read())
        if receipt.get('sha256',{}).get(path.name,digest(path))!=digest(path):raise ValueError('Original changed')
        im=Image.open(path).convert('RGBA')
        if im.size!=(64,64) or not im.getbbox():raise ValueError('Invalid native body')
        frames.append(im)
    echo=normalized(frames[0])==normalized(Image.open(HERE/f'body-{direction}-input.png'))
    receipt.update(sha256={f'body-{direction}-raw-{i:02}.png':digest(HERE/f'body-{direction}-raw-{i:02}.png') for i in range(9)},input_echo_visible_match=echo)
    write(f'body-{direction}-job.json',receipt)
    sheet=Image.new('RGBA',(512,64))
    for i,im in enumerate(frames[1:]):sheet.paste(im,(i*64,0))
    sheet.save(HERE/f'body-{direction}-native.png');guide(sheet,f'body-{direction}-inspection-grid.png')
    report={'echo_matches':echo,'unique_frames':len({normalized(f) for f in frames[1:]}),'bounds':[im.getbbox() for im in frames[1:]],'partial_alpha_pixels':sum(0<c[3]<255 for f in frames[1:] for c in f.get_flattened_data()),'artwork_approved':False}
    write(f'body-{direction}-structure.json',report);print(report)

def prepare(direction):
    quality=json.loads((HERE/'quality-review.json').read_text(encoding='utf-8'))
    if not quality['body'][direction]['prototype_gate_passed']:raise ValueError('Inspect motion and hand positions first')
    structure=json.loads((HERE/f'body-{direction}-structure.json').read_text())
    if not structure['echo_matches'] or structure['unique_frames']!=8 or structure['partial_alpha_pixels']:raise ValueError('Body failed native gate')
    source=Image.new('RGBA',(256,64));masks={s:Image.new('RGB',(256,64)) for s in ['hair','outfit']};heads=[]
    for i in range(8):
        body=Image.open(HERE/f'body-{direction}-raw-{i+1:02}.png').convert('RGBA');crop=body.crop((16,0,48,64));restored=Image.new('RGBA',(64,64));restored.paste(crop,(16,0))
        if normalized(restored)!=normalized(body):raise ValueError('Crop would remove visible body pixels')
        source.paste(crop,(i*32,0));head=body.getbbox()[1];heads.append(head)
        for slot in masks:
            native=Image.new('RGB',(64,64));draw=ImageDraw.Draw(native)
            region=quality['masks'][direction][slot][i]
            for op,rect in region:draw.rectangle(rect,fill='white' if op=='allow' else 'black')
            masks[slot].paste(native.crop((16,0,48,64)),(i*32,0))
    source.save(HERE/f'body-{direction}-compact.png');reference=Image.open(HERE/f'body-{direction}-input.png').convert('RGBA')
    for slot in ['outfit','hair']:
        raw=Image.open(OLD/f'{slot}-{direction}-raw.png').convert('RGBA');reference=Image.alpha_composite(reference,raw.crop((0,0,64,64)))
    reference.save(HERE/f'look-{direction}-reference.png');context=Image.new('RGBA',(320,64));context.paste(source,(0,0));context.paste(reference,(256,0));context.save(HERE/f'look-{direction}-context.png')
    for slot,mask in masks.items():mask.save(HERE/f'{slot}-{direction}-mask.png')
    files=[f'body-{direction}-compact.png',f'look-{direction}-reference.png',f'look-{direction}-context.png']+[f'{s}-{direction}-mask.png' for s in masks]
    write(f'inputs-{direction}.json',{'cell_size':[32,64],'atlas':[256,64],'crop':[16,0,48,64],'fixed_padding':[26,10],'head_tops':heads,'files':{name:digest(HERE/name) for name in files}})
    guide(source,f'compact-{direction}-inspection-grid.png',32);print('Native eight-pose row prepared; crop is reversible')

def inspect(slot,direction):
    inputs=json.loads((HERE/f'inputs-{direction}.json').read_text())
    for name,expected in inputs['files'].items():
        if digest(HERE/name)!=expected:raise ValueError('Frozen input changed')
    receipt=json.loads((HERE/f'{slot}-{direction}-job.json').read_text());raw=HERE/f'{slot}-{direction}-raw.png'
    if receipt['status']!='completed':raise ValueError('Confirm completed job first')
    if not raw.exists():raw.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download',timeout=60).read())
    if receipt.get('raw_sha256',digest(raw))!=digest(raw):raise ValueError('Original layer changed')
    receipt['raw_sha256']=digest(raw);write(f'{slot}-{direction}-job.json',receipt)
    if slot=='hair' and direction=='west' and (HERE/'hair-west-workbench.json').is_file():
        correction=json.loads((HERE/'hair-west-workbench.json').read_text())
        if digest(raw)!=correction['source_sha256']:raise ValueError('Workbench source changed')
        candidate=HERE/correction['output_file']
        if digest(candidate)!=correction['output_sha256']:raise ValueError('Workbench output changed')
        before=Image.open(raw).convert('RGBA');after=Image.open(candidate).convert('RGBA')
        changed=[(i%256,i//256,a,b) for i,(a,b) in enumerate(zip(before.get_flattened_data(),after.get_flattened_data())) if a!=b]
        if [(x,y) for x,y,_,_ in changed]!=[(118,20),(214,20)] or any(b!=(0,0,0,0) for _,_,_,b in changed):raise ValueError('Unexpected Workbench edit')
        raw=candidate
    anchors=json.loads((HERE/'quality-review.json').read_text())['anchors'][direction][slot]
    report=audit_batch(HERE/f'body-{direction}-compact.png',raw,HERE/f'{slot}-{direction}-mask.png',(32,64),anchors,True,HERE/f'{slot}-{direction}')
    write(f'{slot}-{direction}-audit.json',report)
    if report['passed']:guide(Image.alpha_composite(Image.open(HERE/f'body-{direction}-compact.png').convert('RGBA'),Image.open(raw).convert('RGBA')),f'{slot}-{direction}-inspection-grid.png',32)
    print(slot,direction,report['passed'],report.get('unique_visible_frames'));return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['retrieve','prepare','hair','outfit']);parser.add_argument('direction',choices=['west','east']);args=parser.parse_args()
    if args.action=='retrieve':retrieve(args.direction)
    elif args.action=='prepare':prepare(args.direction)
    else:inspect(args.action,args.direction)
