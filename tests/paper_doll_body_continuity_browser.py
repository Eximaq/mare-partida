"""Real body-only package: pixels, lifecycle, safe import and production fallback."""
import base64,copy,hashlib,io,json,os,tempfile
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];REL='pixellab-pip-generations/paper-doll-body-continuity-20261022/'
FOLDER=ROOT/REL;BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8125/dist/')
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text());audit=json.loads((FOLDER/'source-audit.json').read_text())
assert audit['body_pose_count']==80 and audit['pixel_changes']==0
for rec in audit['records']:
 assert hashlib.sha256((ROOT/rec['source']).read_bytes()).hexdigest()==rec['sha256']
 assert (ROOT/rec['source']).read_bytes()==(FOLDER/rec['file']).read_bytes()
def rgba(im):return bytes(v for c in im.get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
with sync_playwright() as p,tempfile.TemporaryDirectory() as tmp:
 b=p.chromium.launch();q=b.new_page(viewport={'width':1366,'height':900});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.add_init_script('localStorage.setItem("mare-partida-save-v1","body-study-sentinel")')
 q.goto(BASE+'tools/paper-doll-inspector/index.html?pack=body-continuity',wait_until='networkidle')
 q.wait_for_function('window.__paperDollInspector?.state().readyDirections?.length===4')
 assert q.evaluate('__paperDollInspector.state().mode')=='body-study'
 assert 'só do corpo' in q.locator('#status').text_content()
 q.locator('#pivots').uncheck();q.locator('#zoom').select_option('2')
 for action in ['idle','walk','attack']:
  key='attack-sword' if action=='attack' else action;clip=pack['pieces'][0]['animations'][key]
  sheet=Image.open(FOLDER/clip['url']).convert('RGBA');q.locator('#animation').select_option(action)
  for row,d in enumerate(clip['directions']):
   q.locator('#direction').select_option(d)
   for i in range(clip['frames']):
    q.locator('#frame').fill(str(i));assert q.evaluate('__paperDollInspector.state().mode')=='body-study'
    uri=q.locator(f'[data-direction={d}] canvas').nth(1).evaluate('(c)=>c.toDataURL()')
    actual=Image.open(io.BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
    expected=Image.new('RGBA',(300,300));cell=sheet.crop((84*i,84*row,84*(i+1),84*(row+1))).resize((168,168),Image.Resampling.NEAREST)
    expected.paste(cell,(66,110));assert rgba(actual)==rgba(expected),(action,d,i)
 q.locator('#direction').select_option('all');q.locator('#playbackMode').select_option('sequence');q.locator('#play').click()
 q.wait_for_function('__paperDollInspector.state().playback.finished',timeout=15000)
 assert q.evaluate('__paperDollInspector.state().mode')=='body-study'
 q.screenshot(path=str(OUT/'body-continuity-1366.png'),full_page=True)
 # Import scope cannot quietly relax normal full-character validation.
 files=[str(FOLDER/rec['file']) for rec in audit['records']]
 for change in ['scope','production','pieces']:
  bad=copy.deepcopy(pack)
  if change=='scope':del bad['scope']
  if change=='production':bad['productionEnabled']=True
  if change=='pieces':bad['appearance']['pieces']['hair']='fabricated'
  path=Path(tmp)/'invalid.json';path.write_text(json.dumps(bad),encoding='utf-8')
  q.locator('#importPack').set_input_files([str(path),*files])
  q.wait_for_function('document.getElementById("importStatus").textContent.includes("não aplicado")')
  assert q.evaluate('__paperDollInspector.state().mode')=='body-study'
 result=q.evaluate('''async (pack)=>{const r=MarePaperDoll.create({getImage:MareFactionSprites.image});r.registerRig(pack.rig);for(const p of pack.pieces)r.registerPiece(p);return r.resolve(pack.appearance,{animationId:'idle',direction:'south',frameIndex:0})}''',pack)
 assert not result['valid'] and result['missing'][0]['code']=='unapproved-piece'
 q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'body-continuity-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='body-study-sentinel'
 assert not errors,errors;b.close()
print('Body study: 80 exact native poses, four directions, continuity playback, strict scoped import, production blocked, mobile and save passed.')
