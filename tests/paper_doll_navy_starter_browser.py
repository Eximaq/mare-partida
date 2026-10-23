"""Independent composition, occlusion and native-source audit of the dressed candidate."""
import base64, hashlib, io, json, os
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FOLDER=ROOT/'pixellab-pip-generations/paper-doll-navy-starter-20261023'
OUT=ROOT/'docs/evidence-paper-doll/navy-starter';OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8125/dist/')
pack=json.loads((FOLDER/'review-pack.json').read_text());audit=json.loads((FOLDER/'source-audit.json').read_text())
for record in audit['copied']:
    assert (ROOT/record['source']).read_bytes()==(FOLDER/record['file']).read_bytes()
    assert hashlib.sha256((FOLDER/record['file']).read_bytes()).hexdigest()==record['sha256']
assert not pack['productionEnabled'] and all(not p['approved'] for p in pack['pieces'])
def rgba(im):return bytes(v for c in im.get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
images={}
def image(name):
    if name not in images:images[name]=Image.open(FOLDER/name).convert('RGBA')
    return images[name]
def expected(action,direction,index,hidden=()):
    layers=[]
    for piece in pack['pieces']:
        if piece['slot'] in hidden:continue
        clip=piece['animations'][action]
        override={**clip.get('directionOverrides',{}).get(direction,{}),**clip.get('poseOverrides',{}).get(direction,[{}]*clip['frames'])[index]}
        x=override.get('offsetX',clip.get('offsetX',0));y=override.get('offsetY',clip.get('offsetY',0))
        if clip.get('kind')=='rigid-attachment':
            src=clip['sources'][direction];socket=clip['sockets'][direction][index]
            assert not socket.get('quarterTurns',0)
            native=image(src['url']);x+=socket['x']-src['anchorX'];y+=socket['y']-src['anchorY']
        else:
            row=clip['directions'].index(direction);native=image(clip['url']).crop((84*index,84*row,84*(index+1),84*(row+1)))
        layer=Image.new('RGBA',(300,300));layer.paste(native.resize((native.width*2,native.height*2),Image.Resampling.NEAREST),(66+2*x,110+2*y))
        layers.append((override.get('zIndex',clip.get('zIndex',piece['zIndex'])),layer))
    out=Image.new('RGBA',(300,300))
    for _,layer in sorted(layers,key=lambda pair:pair[0]):out=Image.alpha_composite(out,layer)
    return out

for action in pack['coverage']:
    atlas=Image.new('RGBA',(8*168,4*180),(27,39,43,255));label=ImageDraw.Draw(atlas)
    for row,direction in enumerate(pack['coverage'][action]):
        for i in range(pack['rig']['animations'][action]['frames']):
            cell=expected(action,direction,i).crop((66,110,234,278))
            atlas.alpha_composite(cell,(i*168,row*180));label.text((i*168+3,row*180+160),f'{direction} {i}',fill='white')
    atlas.save(OUT/f'{action}-all-poses.png')

with sync_playwright() as p:
    browser=p.chromium.launch();q=browser.new_page(viewport={'width':1366,'height':1000});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    q.add_init_script('localStorage.setItem("mare-partida-save-v1","navy-sentinel")')
    q.goto(BASE+'tools/paper-doll-inspector/index.html?pack=navy-starter',wait_until='networkidle')
    q.wait_for_function('window.__paperDollInspector?.state().readyDirections?.length===4')
    assert q.evaluate('__paperDollInspector.state().mode')=='draft'
    q.locator('#pivots').uncheck();q.locator('#zoom').select_option('2')
    for action,directions in pack['coverage'].items():
        q.locator('#animation').select_option('attack' if action=='attack-sword' else action)
        for direction in directions:
            q.locator('#direction').select_option(direction)
            for i in range(pack['rig']['animations'][action]['frames']):
                q.locator('#frame').fill(str(i))
                for hidden in [(),('outfit',),('weapon',)]:
                    for slot in ['outfit','weapon']:q.locator(f'[data-layer={slot}]').set_checked(slot not in hidden)
                    uri=q.locator(f'[data-direction={direction}] canvas').nth(1).evaluate('(c)=>c.toDataURL()')
                    actual=Image.open(io.BytesIO(base64.b64decode(uri.split(',')[1]))).convert('RGBA')
                    assert rgba(actual)==rgba(expected(action,direction,i,hidden)),(action,direction,i,hidden)
    for slot in ['outfit','weapon']:q.locator(f'[data-layer={slot}]').check()
    q.locator('#direction').select_option('all');q.locator('#playbackMode').select_option('sequence');q.locator('#play').click()
    q.wait_for_function('__paperDollInspector.state().playback.finished',timeout=15000)
    assert q.evaluate('__paperDollInspector.state().mode')=='draft'
    q.screenshot(path=str(OUT/'inspector-1366.png'),full_page=True)
    q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
    q.screenshot(path=str(OUT/'inspector-393.png'),full_page=True)
    assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='navy-sentinel'
    assert not q.evaluate('__paperDollInspector.state().artworkValidated')
    assert not errors,errors;browser.close()
print('Navy starter: source identity, 240 exact Canvas comparisons, 80 four-layer poses, per-pose depth, visibility changes, action sequence, mobile and save isolation passed.')
