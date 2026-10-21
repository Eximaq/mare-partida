"""Compare complete north walk with original per-pose sources, not only assembled sheets."""
import base64,json,os,hashlib
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];REL='pixellab-pip-generations/paper-doll-north-finish-20261021/';FOLDER=ROOT/REL;OLD=ROOT/'pixellab-pip-generations/paper-doll-walk-north-20261021'
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/');OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text());weapon=next(p for p in pack['pieces'] if p['slot']=='weapon')['animations']['walk'];sockets=weapon['sockets']['north']
def normalized(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def expected(index):
    frame=Image.new('RGBA',(84,84));s=sockets[index];frame.paste(Image.open(FOLDER/'weapon-north.png').convert('RGBA'),(s['x']-42,s['y']-35));body=Image.new('RGBA',(84,84));body.paste(Image.open(FOLDER/f'body-raw-{index+1:02}.png').convert('RGBA'),(10,13));frame=Image.alpha_composite(frame,body)
    batch='outfit-first' if index<2 else 'outfit-remaining';n=index+1 if index<2 else index-1;layer=Image.new('RGBA',(84,84));layer.paste(Image.open(FOLDER/batch/f'frame-{n:02}.png').convert('RGBA'),(10,13) if index<2 else (26,13));frame=Image.alpha_composite(frame,layer)
    layer=Image.new('RGBA',(84,84));source=FOLDER/f'hair-preserved-{index+1:02}.png' if index<4 else FOLDER/'hair-repair'/f'frame-{index-3:02}.png';layer.paste(Image.open(source).convert('RGBA'),(26,17) if index<4 else (10,13));return normalized(Image.alpha_composite(frame,layer))
assert pack['coverage']['walk']==['south','north'] and all(not p['approved'] for p in pack['pieces'])
for i in range(1,9):assert (FOLDER/f'body-raw-{i:02}.png').read_bytes()==(OLD/f'body-raw-{i:02}.png').read_bytes()
receipt=json.loads((OLD/'hair-job.json').read_text());assert hashlib.sha256((OLD/'hair-raw.png').read_bytes()).hexdigest()==receipt['raw_sha256']
frozen=json.loads((FOLDER/'inputs.json').read_text())['files']
with Image.open(OLD/'hair-raw.png') as original:
 for i in range(4):
  source=FOLDER/f'hair-preserved-{i+1:02}.png'
  # Pin the preserved file bytes, then compare pixels directly to the original
  # atlas. A prior assembler may re-encode its extracted PNGs on Linux.
  assert hashlib.sha256(source.read_bytes()).hexdigest()==frozen[source.name]
  x=(i%4)*32;y=(i//4)*52
  with Image.open(source) as layer:
   assert layer.size==(32,52)
   assert normalized(layer)==normalized(original.crop((x,y,x+32,y+52)))
with Image.open(FOLDER/'walk-north.gif') as preview:
 assert preview.n_frames==8 and preview.info['loop']==0
 for i in range(8):preview.seek(i);assert normalized(preview.convert('RGBA'))==expected(i)
with sync_playwright() as p:
 browser=p.chromium.launch();c=browser.new_context(viewport={'width':1366,'height':1000});c.add_init_script('localStorage.setItem("mare-partida-save-v1","north-complete-sentinel")');q=c.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.goto(BASE+REL+'preview.html',wait_until='networkidle');q.wait_for_function('window.__paperDollWalk?.().ready')
 for i in range(8):
  q.locator('#frame').fill(str(i));state=q.evaluate('__paperDollWalk()');assert state['readyDirections']==['south','north'] and not state['productionEnabled']
  raw=q.evaluate('''()=>btoa(String.fromCharCode(...document.getElementById('north-full').getContext('2d').getImageData(0,0,84,84).data))''');assert base64.b64decode(raw)==expected(i),i
  q.locator('#boards').screenshot(path=str(OUT/f'north-complete-frame-{i+1}.png'))
 q.screenshot(path=str(OUT/'north-complete-1366.png'),full_page=True);q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'north-complete-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='north-complete-sentinel';assert not errors,errors;browser.close()
print('Complete north walk passed:8 real poses match independent original-body/hair/outfit/weapon composition and decoded GIF; preserved sources, mobile and save isolation.')
