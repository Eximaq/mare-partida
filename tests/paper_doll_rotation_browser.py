"""Exact pixel regression for90-degree weapon transforms; not a character-art gate."""
import base64,json,os,tempfile
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
REL='pixellab-pip-generations/paper-doll-walk-profiles-20261021/'
def normalized(im): return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'tools/paper-doll-inspector/index.html',wait_until='networkidle')
 # A non-square native crop tests dimensions too; only transparent outer margins removed.
 source=Image.open(ROOT/REL/'weapon-south.png').convert('RGBA').crop((0,20,40,64))
 import io
 memory=io.BytesIO();source.save(memory,format='PNG')
 page.evaluate('''async url=>{
 const im=new Image();im.src=url;await im.decode();window.__rotationCanvas=document.createElement('canvas');__rotationCanvas.width=__rotationCanvas.height=84;
 const a={frames:4,fps:6,loop:false,directions:['south']};window.__rotation=MarePaperDoll.create({getImage:()=>im});
 __rotation.registerRig({id:'rotation-fixture',frameWidth:84,frameHeight:84,pivotX:42,pivotY:65,scale:1,requiredSlots:['weapon'],animations:{attack:a}});
 __rotation.registerPiece({id:'blade',slot:'weapon',rigId:'rotation-fixture',approved:false,animations:{attack:{...a,frameWidth:84,frameHeight:84,url:'fixture',kind:'rigid-attachment',source:{width:40,height:44,anchorX:20,anchorY:16},sockets:{south:[0,1,2,3].map(quarterTurns=>({x:42,y:42,quarterTurns}))}}}});
 }''','data:image/png;base64,'+base64.b64encode(memory.getvalue()).decode())
 for turn in range(4):
  rotated=source if turn==0 else source.transpose([Image.Transpose.ROTATE_270,Image.Transpose.ROTATE_180,Image.Transpose.ROTATE_90][turn-1])
  anchors=[(20,16),(43-16,20),(39-20,43-16),(16,39-20)]
  expected=Image.new('RGBA',(84,84));expected.paste(rotated,(42-anchors[turn][0],42-anchors[turn][1]))
  raw=page.evaluate('''i=>{const c=__rotationCanvas,ctx=c.getContext('2d');ctx.clearRect(0,0,84,84);if(!__rotation.draw(ctx,{rigId:'rotation-fixture',pieces:{weapon:'blade'}},{animationId:'attack',direction:'south',frameIndex:i},42,65,{scale:1,allowDraft:true}))throw Error('Draw failed');return btoa(String.fromCharCode(...ctx.getImageData(0,0,84,84).data));}''',turn)
  assert base64.b64decode(raw)==normalized(expected),turn
 page.goto(BASE+'tools/paper-doll-inspector/index.html?pack=walk-profiles',wait_until='networkidle')
 page.wait_for_function('__paperDollInspector.state().readyDirections?.length===4')
 page.locator('#direction').select_option('south');page.locator('#attachmentPanel > summary').click()
 page.locator('#socketTurn').select_option('1');page.locator('#applySocket').click()
 layers=json.loads(page.locator('#transforms').text_content());assert next(l for l in layers if l['slot']=='weapon')['quarterTurns']==1
 # Editing position must preserve the chosen orientation; export is portable and draft only.
 page.locator('#socketX').fill('31');page.locator('#applySocket').click()
 with tempfile.TemporaryDirectory() as folder:
  with page.expect_download() as download:page.locator('#exportPack').click()
  path=Path(folder)/'review.json';download.value.save_as(path);data=json.loads(path.read_text())
  blade=next(p for p in data['pieces'] if p['slot']=='weapon')
  assert blade['animations']['idle']['sockets']['south'][0]['quarterTurns']==1
  assert blade['animations']['idle']['sockets']['south'][0]['x']==31
  assert all(not p['approved'] for p in data['pieces']) and 'blob:' not in path.read_text()
 page.locator('#restoreSockets').click()
 assert next(l for l in json.loads(page.locator('#transforms').text_content()) if l['slot']=='weapon')['quarterTurns']==0
 assert not errors,errors;browser.close()
print('Native weapon rotation: all four Canvas quarter-turns equal independent Pillow RGBA, including rectangular bounds and grip contact; no resampling.')
