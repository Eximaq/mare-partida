"""Native retrieval and transparent-margin compaction. Never generate or paint art."""
import argparse,hashlib,json,sys,urllib.request
from pathlib import Path
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent
OLD=HERE.parent/'paper-doll-expansion-20261021'
CROP=(16,4,48,56)
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def write(name,data):(HERE/name).write_text(json.dumps(data,indent=2)+'\n')
def normalized(im):return bytes(v for p in im.convert('RGBA').get_flattened_data() for v in (p if p[3] else (0,0,0,0)))
def compact_cell(im):
    if im.size!=(64,64):raise ValueError('Native body must remain64x64')
    if not im.getbbox():raise ValueError('Empty body')
    compact=im.crop(CROP);restored=Image.new('RGBA',(64,64));restored.paste(compact,(16,4))
    if normalized(restored)!=normalized(im):raise ValueError('Compaction would cut visible body pixels; stop before paying')
    return compact
def grid_preview(im,cw,ch,name):
    preview=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST);d=ImageDraw.Draw(preview)
    for x in range(cw*4,preview.width,cw*4):d.line((x,0,x,preview.height),fill='#dbb25f')
    for y in range(ch*4,preview.height,ch*4):d.line((0,y,preview.width,y),fill='#dbb25f')
    preview.save(HERE/name)
def retrieve():
    receipt=json.loads((HERE/'body-job.json').read_text())
    if receipt['status']!='completed':raise ValueError('Confirm completion before retrieval; never repeat generation on download failure.')
    frames=[]
    for i in range(9):
        path=HERE/f'body-raw-{i:02}.png'
        if not path.exists():path.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download?index={i}',timeout=60).read())
        if receipt.get('sha256',{}).get(path.name,digest(path))!=digest(path):raise ValueError('Original body changed')
        im=Image.open(path).convert('RGBA')
        if im.size!=(64,64) or not im.getbbox():raise ValueError('Invalid body frame')
        frames.append(im)
    echo_matches=normalized(frames[0])==normalized(Image.open(HERE/'body-input.png'))
    receipt.update(outputs=[f'body-raw-{i:02}.png' for i in range(9)],sha256={f'body-raw-{i:02}.png':digest(HERE/f'body-raw-{i:02}.png') for i in range(9)},input_echo_visible_match=echo_matches)
    write('body-job.json',receipt)
    sheet=Image.new('RGBA',(256,128));bounds=[]
    for i,im in enumerate(frames[1:]):sheet.paste(im,((i%4)*64,(i//4)*64));bounds.append(im.getbbox())
    sheet.save(HERE/'body-native.png');grid_preview(sheet,64,64,'body-inspection-grid.png')
    write('body-structure.json',{'echo_matches':echo_matches,'unique_frames':len({normalized(im) for im in frames[1:]}),'bounds':bounds,'partial_alpha_pixels':sum(0<p[3]<255 for im in frames[1:] for p in im.get_flattened_data()),'artwork_approved':False})
    print('Body structure:',json.loads((HERE/'body-structure.json').read_text()))
def prepare():
    quality=json.loads((HERE/'quality-review.json').read_text())
    if not quality['body']['prototype_gate_passed'] or not quality['weapon']['prototype_gate_passed']:raise ValueError('Inspect motion and grip first')
    structure=json.loads((HERE/'body-structure.json').read_text())
    if not structure['echo_matches'] or structure['unique_frames']!=8 or structure['partial_alpha_pixels']:raise ValueError('Body sequence failed structural gate')
    atlas=Image.new('RGBA',(128,104));masks={s:Image.new('RGB',atlas.size) for s in ['hair','outfit']};heads=[]
    for i in range(8):
        im=Image.open(HERE/f'body-raw-{i+1:02}.png').convert('RGBA');box=im.getbbox();compact=compact_cell(im);heads.append(box[1])
        x,y=(i%4)*32,(i//4)*52;atlas.paste(compact,(x,y))
        for slot in masks:
            native=Image.new('RGB',(64,64));d=ImageDraw.Draw(native)
            if slot=='hair':d.rectangle((25,box[1]-3,39,box[1]+10),fill='white')
            else:
                d.rectangle((23,box[1]+11,42,34),fill='white');d.rectangle((23,28,25,34),fill='black');d.rectangle((40,28,42,34),fill='black')
            masks[slot].paste(native.crop(CROP),(x,y))
    atlas.save(HERE/'body-compact.png')
    for slot,im in masks.items():im.save(HERE/f'{slot}-mask.png')
    body=Image.open(OLD/'body-idle-north-raw-01.png').convert('RGBA')
    for slot in ['outfit','hair']:body=Image.alpha_composite(body,Image.open(OLD/f'{slot}-north-raw.png').convert('RGBA').crop((0,0,64,64)))
    body.save(HERE/'look-reference.png');context=Image.new('RGBA',(192,104));context.paste(atlas,(0,0));context.paste(body,(128,20));context.save(HERE/'look-context.png')
    write('inputs.json',{'native_frame':[64,64],'compact_cell':[32,52],'crop':list(CROP),'atlas':[128,104],'order':'original generated1-8 row-major; preserved reference echo excluded','head_tops':heads,'files':{name:digest(HERE/name) for name in ['body-compact.png','hair-mask.png','outfit-mask.png','look-reference.png','look-context.png']}})
    grid_preview(atlas,32,52,'compact-inspection-grid.png');print('Compaction reversible: no visible pixel removed, eight native32x52 cells.')
def inspect(slot):
    sys.path.insert(0,str(HERE.parents[1]/'tools'));from paper_doll_batch_audit import audit_batch
    inputs=json.loads((HERE/'inputs.json').read_text())
    for name,expected in inputs['files'].items():
        if digest(HERE/name)!=expected:raise ValueError('Frozen input changed')
    path=HERE/f'{slot}-job.json';receipt=json.loads(path.read_text());raw=HERE/f'{slot}-raw.png'
    if receipt['status']!='completed':raise ValueError('Confirm layer completion first')
    if not raw.exists():raw.write_bytes(urllib.request.urlopen(f'https://api.pixellab.ai/mcp/images/{receipt["job_id"]}/download',timeout=60).read())
    if receipt.get('raw_sha256',digest(raw))!=digest(raw):raise ValueError('Original layer changed')
    receipt['raw_sha256']=digest(raw);write(path.name,receipt)
    anchors=[(16,top-4+1) for top in inputs['head_tops']] if slot=='hair' else [(16,23)]*8
    report=audit_batch(HERE/'body-compact.png',raw,HERE/f'{slot}-mask.png',(32,52),anchors,True,HERE/slot);write(slot+'-audit.json',report)
    layer=Image.open(raw).convert('RGBA');source=Image.open(HERE/'body-compact.png').convert('RGBA')
    if layer.size==source.size:grid_preview(Image.alpha_composite(source,layer),32,52,f'{slot}-inspection-grid.png')
    print(slot,report['passed'],'unique',report.get('unique_visible_frames'));return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['retrieve','prepare','hair','outfit']);a=p.parse_args()
    if a.action=='retrieve':retrieve()
    elif a.action=='prepare':prepare()
    else:inspect(a.action)
