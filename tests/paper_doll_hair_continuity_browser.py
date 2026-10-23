"""Exact-source short hair follows all 80 real poses; no full-character approval."""
import base64,hashlib,io,json,os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];FOLDER=ROOT/'pixellab-pip-generations/paper-doll-hair-continuity-20261022'
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8125/dist/');OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text());audit=json.loads((FOLDER/'source-audit.json').read_text())
assert audit['new_pixels']==0 and audit['paid_calls']==0
for record in audit['copied']:
 assert (ROOT/record['source']).read_bytes()==(FOLDER/record['file']).read_bytes()
 assert hashlib.sha256((FOLDER/record['file']).read_bytes()).hexdigest()==record['sha256']
source=Image.open(ROOT/audit['attack_hair_source']).convert('RGBA');sheet=Image.open(FOLDER/'hair-attack.png').convert('RGBA')
for record in audit['attack_hair_poses']:
 row=['south','north','west','east'].index(record['direction']);i=record['frame'];donor=source.crop((0,row*84,84,(row+1)*84))
 expected=Image.new('RGBA',(84,84));expected.paste(donor,tuple(record['translation']))
 assert expected.tobytes()==sheet.crop((i*84,row*84,(i+1)*84,(row+1)*84)).tobytes()
def rgba(im):return bytes(v for c in im.get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
with sync_playwright() as p:
 b=p.chromium.launch();q=b.new_page(viewport={'width':1366,'height':900});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.add_init_script('localStorage.setItem("mare-partida-save-v1","hair-study-sentinel")')
 q.goto(BASE+'tools/paper-doll-inspector/index.html?pack=hair-continuity',wait_until='networkidle')
 q.wait_for_function('window.__paperDollInspector?.state().readyDirections?.length===4')
 assert q.evaluate('__paperDollInspector.state().mode')=='hair-study'
 assert q.locator('[data-layer=outfit]').is_disabled() and q.locator('[data-layer=weapon]').is_disabled()
 q.locator('#pivots').uncheck();q.locator('#zoom').select_option('2')
 for action in ['idle','walk','attack']:
  key='attack-sword' if action=='attack' else action
  clips={p['slot']:p['animations'][key] for p in pack['pieces']}
  sheets={s:Image.open(FOLDER/c['url']).convert('RGBA') for s,c in clips.items()};clip=clips['body'];q.locator('#animation').select_option(action)
  for row,d in enumerate(clip['directions']):
   q.locator('#direction').select_option(d)
   for i in range(clip['frames']):
    q.locator('#frame').fill(str(i))
    for hair_visible in [False,True]:
     q.locator('[data-layer=hair]').set_checked(hair_visible)
     uri=q.locator(f'[data-direction={d}] canvas').nth(1).evaluate('(c)=>c.toDataURL()')
     actual=Image.open(io.BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
     cell=sheets['body'].crop((84*i,84*row,84*(i+1),84*(row+1)))
     if hair_visible:cell=Image.alpha_composite(cell,sheets['hair'].crop((84*i,84*row,84*(i+1),84*(row+1))))
     expected=Image.new('RGBA',(300,300));expected.paste(cell.resize((168,168),Image.Resampling.NEAREST),(66,110))
     assert rgba(actual)==rgba(expected),(action,d,i,hair_visible)
 q.locator('#direction').select_option('all');q.locator('#playbackMode').select_option('sequence');q.locator('#play').click()
 q.wait_for_function('__paperDollInspector.state().playback.finished',timeout=15000)
 assert q.evaluate('__paperDollInspector.state().mode')=='hair-study'
 q.screenshot(path=str(OUT/'hair-continuity-1366.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'hair-continuity-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='hair-study-sentinel'
 assert not q.evaluate('__paperDollInspector.state().artworkValidated')
 assert not errors,errors;b.close()
print('Hair continuity: native sources, 32 exact translated head pieces, 160 Canvas comparisons, real action sequence, explicit partial scope, mobile and save passed.')
