"""Save the exact frame range exposed by get_image, with untouched originals."""
from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image
import argparse,json,hashlib,sys
P=Path(__file__).resolve().parent
a=argparse.ArgumentParser();a.add_argument('job');a.add_argument('name');a.add_argument('url');a.add_argument('count',type=int);a.add_argument('--echo',action='store_true');a.add_argument('--charged',type=float);a.add_argument('--skill-assets',type=Path,help='Optional PixelLab skill assets directory for ledger update');v=a.parse_args()
assert v.url.startswith('https://api.pixellab.ai/mcp/images/') and (v.count==1 or 'index=0' in v.url)
out=P/(v.name+'-raw');out.mkdir(exist_ok=True)
frames=[];records=[]
for i in range(v.count):
    f=out/f'{i:02}.png'
    if not f.exists():urlretrieve(v.url.replace('index=0',f'index={i}'),f)
    im=Image.open(f).convert('RGBA');assert im.size==(64,64),im.size
    records.append({'path':str(f.relative_to(P)).replace('\\','/'),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bounds':im.getbbox(),'role':'input-echo' if v.echo and i==0 else 'generated'})
    if not(v.echo and i==0):frames.append(im)
sheet=Image.new('RGBA',(64*len(frames),64))
for i,im in enumerate(frames):sheet.paste(im,(64*i,0))
sheet.save(P/(v.name+'-sheet.png'))
sheet.resize((sheet.width*3,192),Image.Resampling.NEAREST).save(P/(v.name+'-inspection.png'))
(P/(v.name+'-audit.json')).write_text(json.dumps({'job_id':v.job,'frames':records,'source_order_preserved':True,'productionEnabled':False},indent=2)+'\n')
if v.skill_assets:
    sys.path.insert(0,str(v.skill_assets.resolve()))
    from manifest import add_job
    entry={'job_id':v.job,'status':'completed','outputs':[r['path'] for r in records]}
    if v.charged is not None:entry['reported_usage']={'generations':v.charged}
    add_job(str(P),entry)
print(f'{v.name}: {len(frames)} frames preserved, visual inspection pending')
