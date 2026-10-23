"""Real Chromium regression: repaired body studies and explicit weapon occlusion."""
import base64,json,os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
REL='pixellab-pip-generations/paper-doll-bento-repair-20261022/'
FOLDER=ROOT/REL;BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text(encoding='utf-8'));audit=json.loads((FOLDER/'assembly-audit.json').read_text())
ready=pack['coverage']['attack-sword'];directions=['south','north','west','east']
source=Image.open(FOLDER/'reference-bento-attack.png').convert('RGBA')
def rgba(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
def expected(d,i):
 if d not in ready:return rgba(source.crop((i*84,directions.index(d)*84,(i+1)*84,(directions.index(d)+1)*84)))
 layers=[]
 for piece in pack['pieces']:
  clip=piece['animations']['attack-sword'];row=clip['directions'].index(d);over=clip.get('poseOverrides',{}).get(d,[{}]*8)[i]
  sheet=Image.open(FOLDER/clip['url']).convert('RGBA');cell=sheet.crop((i*84,row*84,(i+1)*84,(row+1)*84));layer=Image.new('RGBA',(84,84));layer.paste(cell,(over.get('offsetX',0),over.get('offsetY',0)))
  layers.append((over.get('zIndex',piece['zIndex']),layer))
 out=Image.new('RGBA',(84,84))
 for _,layer in sorted(layers,key=lambda a:a[0]):out=Image.alpha_composite(out,layer)
 return rgba(out)
for d in ('north','east'):
 sheet=Image.open(FOLDER/f'body-candidate-{d}.png').convert('RGBA')
 for i,row in enumerate(audit['body_records'][d]):
  raw=Image.open(FOLDER/d/f'body-{i:02}.png').convert('RGBA');cell=Image.new('RGBA',(84,84));cell.paste(raw,tuple(row['padding']))
  assert rgba(cell)==rgba(sheet.crop((i*84,0,(i+1)*84,84)))
with sync_playwright() as p:
 browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':1000});context.add_init_script('localStorage.setItem("mare-partida-save-v1","repair-sentinel")')
 q=context.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install();q.goto(BASE+REL+'preview.html',wait_until='networkidle');q.wait_for_function('__directionalDoll?.().ready')
 for d in directions:
  q.locator('#direction').select_option(d)
  for i in range(8):
   q.locator('#frame').fill(str(i));state=q.evaluate('__directionalDoll()');assert not state['productionEnabled'];assert state['mode']==('modular' if d in ready else 'fallback')
   actual=q.evaluate('btoa(String.fromCharCode(...document.getElementById("modular").getContext("2d").getImageData(0,0,84,84).data))');assert base64.b64decode(actual)==expected(d,i),(d,i)
  q.locator('#frame').fill('3');q.screenshot(path=str(OUT/f'repair-{d}-1366.png'),full_page=True)
 q.locator('#direction').select_option('east');q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'repair-east-393.png'),full_page=True)
 # These colored canvases are offscreen technical fixtures, not character artwork.
 result=q.evaluate('''async()=>{
 const rig={id:'visibility',frameWidth:2,frameHeight:2,pivotX:1,pivotY:2,scale:1,requiredSlots:['body','weapon'],animations:{attack:{frames:3,fps:12,loop:false,directions:['north']}}};
 async function image(frames){const c=document.createElement('canvas');c.width=6;c.height=2;const x=c.getContext('2d');for(const i of frames){x.fillStyle=['#aa0000','#00aa00','#0000aa'][i];x.fillRect(i*2,0,1,1);}const im=new Image();im.src=c.toDataURL();await im.decode();return im;}
 const imgs={body:await image([0,1,2]),weapon:await image([0,2])};const runtime=MarePaperDoll.create({getImage:url=>imgs[url]});runtime.registerRig(rig);
 function piece(slot){return {id:slot,rigId:rig.id,slot,approved:true,animations:{attack:{url:slot,kind:'sheet',frameWidth:2,frameHeight:2,frames:3,fps:12,loop:false,directions:['north']}}};}
 const b=piece('body'),w=piece('weapon');runtime.registerPiece(b);runtime.registerPiece(w);const look={rigId:rig.id,pieces:{body:'body',weapon:'weapon'}},pose={animationId:'attack',direction:'north',frameIndex:1};
 const unmarked=runtime.resolve(look,pose).missing[0].code;w.animations.attack.occludedFrames={north:[1]};runtime.registerPiece(w);
 const target=document.createElement('canvas');target.width=2;target.height=2;const ctx=target.getContext('2d');const drawn=runtime.draw(ctx,look,pose,1,2,{scale:1});const rgba=[...ctx.getImageData(0,0,1,1).data];
 w.animations.attack.occludedFrames={north:[0]};runtime.registerPiece(w);const visible=runtime.resolve(look,pose).missing[0].code;
 w.animations.attack.occludedFrames={north:[1]};w.approved=false;runtime.registerPiece(w);const blocked=runtime.resolve(look,pose).missing[0].code;
 return {unmarked,drawn,rgba,visible,blocked};
 }''')
 assert result=={'unmarked':'empty-frame','drawn':True,'rgba':[0,170,0,255],'visible':'occluded-frame-has-pixels','blocked':'unapproved-piece'},result
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='repair-sentinel';assert not errors,errors
 browser.close()
print('Chromium repair:32 comparison frames, native body padding, responsive fallback, offscreen real-alpha weapon occlusion and save isolation passed.')
