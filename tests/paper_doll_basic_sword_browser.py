"""Independent source-pixel and real-browser acceptance of a basic shared attack."""
import base64,itertools,json,os,sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];REL='pixellab-pip-generations/paper-doll-basic-sword-20261021/';FOLDER=ROOT/REL;OLD=FOLDER.parent/'paper-doll-walk-profiles-20261021'
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/');OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text());dirs=pack['coverage']['attack-sword']
assert dirs,'No complete real modular attack: do not report visual completion'
assert pack['sharedAction']['factionIndependent'] and all(not p['approved'] for p in pack['pieces'])
weapon=next(p for p in pack['pieces'] if p['slot']=='weapon')['animations']['attack-sword']
def normalized(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def expected(direction,index,hidden=()):
    inputs=json.loads((FOLDER/f'inputs-{direction}.json').read_text());receipt=json.loads((FOLDER/f'body-{direction}-job.json').read_text());layers=[]
    body=Image.new('RGBA',(84,84));body.paste(Image.open(FOLDER/(receipt.get('frame_prefix',f'body-{direction}-raw')+f'-{index+1:02}.png')).convert('RGBA'),tuple(inputs['body_padding']));layers.append((20,'body',body))
    for slot,z in [('outfit',50),('hair',60)]:
        frame=Image.new('RGBA',(84,84));frame.paste(Image.open(FOLDER/f'{slot}-{direction}/frame-{index+1:02}.png').convert('RGBA'),tuple(inputs['layer_padding']));layers.append((z,slot,frame))
    source=weapon['sources'][direction];socket=weapon['sockets'][direction][index];image=Image.open(FOLDER/source['url']).convert('RGBA');w,h=image.size;t=socket.get('quarterTurns',0)
    anchors=[(source['anchorX'],source['anchorY']),(h-1-source['anchorY'],source['anchorX']),(w-1-source['anchorX'],h-1-source['anchorY']),(source['anchorY'],w-1-source['anchorX'])]
    if t:image=image.transpose([Image.Transpose.ROTATE_270,Image.Transpose.ROTATE_180,Image.Transpose.ROTATE_90][t-1])
    blade=Image.new('RGBA',(84,84));blade.paste(image,(socket['x']-anchors[t][0],socket['y']-anchors[t][1]));z=weapon['poseOverrides'][direction][index].get('zIndex',weapon['directionOverrides'][direction]['zIndex']);layers.append((z,'weapon',blade))
    full=Image.new('RGBA',(84,84))
    for _,slot,layer in sorted(layers):
        if slot not in hidden:full=Image.alpha_composite(full,layer)
    return normalized(full)
for slot in ['body','hair','outfit']:
 for action in ['idle','walk']:assert (FOLDER/f'{slot}-{action}.png').read_bytes()==(OLD/f'{slot}-{action}.png').read_bytes()
for d in dirs:
 with Image.open(FOLDER/f'attack-{d}.gif') as gif:
  assert gif.n_frames==8 and gif.info['loop']==0
  for i in range(8):gif.seek(i);assert normalized(gif.convert('RGBA'))==expected(d,i);assert gif.info['duration']==[80,90,80,80,90,80,80,90][i]
with sync_playwright() as p:
 browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':1000});context.add_init_script('localStorage.setItem("mare-partida-save-v1","basic-sword-sentinel")');q=context.new_page();q.clock.install();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.goto(BASE+REL+'preview.html',wait_until='networkidle');q.wait_for_function('__paperDollBasic?.().ready')
 for i in range(8):
  q.locator('#frame').fill(str(i));state=q.evaluate('__paperDollBasic()');assert state['readyDirections']==dirs and not state['productionEnabled']
  for d in dirs:
   raw=q.evaluate('d=>btoa(String.fromCharCode(...document.getElementById(d+"-full").getContext("2d").getImageData(0,0,84,84).data))',d);assert base64.b64decode(raw)==expected(d,i)
  q.locator('#boards').screenshot(path=str(OUT/f'basic-sword-frame-{i+1}.png'))
 for visible in itertools.product([False,True],repeat=4):
  hidden=[]
  for slot,value in zip(['body','hair','outfit','weapon'],visible):
   q.locator(f'[data-layer={slot}]').set_checked(value)
   if not value:hidden.append(slot)
  for d in dirs:
   raw=q.evaluate('d=>btoa(String.fromCharCode(...document.getElementById(d+"-full").getContext("2d").getImageData(0,0,84,84).data))',d);assert base64.b64decode(raw)==expected(d,7,hidden)
 for slot in ['body','hair','outfit','weapon']:q.locator(f'[data-layer={slot}]').check()
 q.locator('#play').click();q.clock.run_for(800);assert q.evaluate('__paperDollBasic().frameIndex')==7 and not q.evaluate('__paperDollBasic().playing')
 q.locator('#play').click();assert q.evaluate('__paperDollBasic().frameIndex')==0;q.clock.run_for(110);assert q.evaluate('__paperDollBasic().frameIndex')==1;q.clock.run_for(700)
 q.screenshot(path=str(OUT/'basic-sword-1366.png'),full_page=True);q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'basic-sword-393.png'),full_page=True)
 q.goto(BASE+'tools/paper-doll-inspector/index.html?pack=basic-sword',wait_until='networkidle');q.wait_for_function('__paperDollInspector.state().readyDirections?.length===4');q.locator('#animation').select_option('attack')
 for d in dirs:
  q.locator('#direction').select_option(d)
  for i in range(8):q.locator('#frame').fill(str(i));s=q.evaluate('__paperDollInspector.state()');assert s['mode']=='draft' and not s['missing'],s
 for d in [d for d in ['south','north','west','east'] if d not in dirs]:
  q.locator('#direction').select_option(d);assert q.evaluate('__paperDollInspector.state().mode')=='fallback'
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='basic-sword-sentinel';assert not errors,errors;browser.close()
print('Basic sword:',dirs,'8 real poses per view, independent native RGBA/GIF,16 layer combinations, one-shot hold/replay, inspector fallback, mobile and save isolation passed.')
