"""Independent pixel, origin, depth and browser regression for directional review assets."""
import base64,itertools,json,os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1];REL='pixellab-pip-generations/paper-doll-bento-directions-20261021/';FOLDER=ROOT/REL
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/');OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text(encoding='utf-8'));audit=json.loads((FOLDER/'assembly-audit.json').read_text(encoding='utf-8'));DIRECTIONS=['south','north','west','east'];ready=pack['coverage']['attack-sword']
source=Image.open(FOLDER/'reference-bento-attack.png').convert('RGBA')
def rgba(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))
assert rgba(source)==rgba(Image.open(ROOT/'assets/classes/pirate-sword/attack.png'))
assert (FOLDER/'modular-south.gif').read_bytes()==(FOLDER.parent/'paper-doll-bento-skeleton-20261021/modular-south.gif').read_bytes()
pieces={p['slot']:(p,Image.open(FOLDER/p['animations']['attack-sword']['url']).convert('RGBA')) for p in pack['pieces']}

def expected(d,index,hidden=()):
    out=Image.new('RGBA',(84,84));layers=[];row=ready.index(d)
    for slot,(piece,sheet) in pieces.items():
        if slot in hidden:continue
        clip=piece['animations']['attack-sword'];pose=clip.get('poseOverrides',{}).get(d,[{} for _ in range(8)])[index]
        raw=sheet.crop((index*84,row*84,(index+1)*84,(row+1)*84));layer=Image.new('RGBA',(84,84));layer.paste(raw,(pose.get('offsetX',0),pose.get('offsetY',0)))
        layers.append((pose.get('zIndex',piece['zIndex']),layer))
    for _,layer in sorted(layers,key=lambda p:p[0]):out=Image.alpha_composite(out,layer)
    return rgba(out)

for d in ['north','west','east']:
    controls=json.loads((FOLDER/d/'controls.json').read_text());offset=controls['padding'];body_sheet=Image.open(FOLDER/f'body-candidate-{d}.png').convert('RGBA')
    for i,record in enumerate(audit['body_records'][d]):
        original=source.crop((i*84,DIRECTIONS.index(d)*84,(i+1)*84,(DIRECTIONS.index(d)+1)*84));native=Image.open(FOLDER/d/f'bento-{i:02}.png').convert('RGBA');canvas=Image.new('RGBA',(84,84));canvas.paste(native,tuple(offset));assert rgba(canvas)==rgba(original)
        raw=Image.open(FOLDER/d/f'body-{i:02}.png').convert('RGBA');canvas=Image.new('RGBA',(84,84));canvas.paste(raw,tuple(record['body_padding']));assert rgba(canvas)==rgba(body_sheet.crop((i*84,0,(i+1)*84,84)))
for d in ready:
    row=ready.index(d)
    for i in range(8):
        original=source.crop((i*84,DIRECTIONS.index(d)*84,(i+1)*84,(DIRECTIONS.index(d)+1)*84))
        for slot,(_,sheet) in pieces.items():
            if slot=='body':continue
            cell=sheet.crop((i*84,row*84,(i+1)*84,(row+1)*84));assert all(not c[3] or c==s for c,s in zip(cell.get_flattened_data(),original.get_flattened_data())),(d,slot,i)
    with Image.open(FOLDER/f'modular-{d}.gif') as gif:
        assert gif.n_frames==8 and gif.info['loop']==0
        for i in range(8):gif.seek(i);assert rgba(gif.convert('RGBA'))==expected(d,i);assert gif.info['duration']==[80,90,80,80,90,80,80,90][i] and gif.disposal_method==2

with sync_playwright() as p:
    browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':1000});context.add_init_script('localStorage.setItem("mare-partida-save-v1","directional-doll-sentinel")')
    q=context.new_page();q.clock.install();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    q.goto(BASE+REL+'preview.html',wait_until='networkidle');q.wait_for_function('__directionalDoll?.().ready')
    for d in DIRECTIONS:
        q.locator('#direction').select_option(d)
        for i in range(8):
            q.locator('#frame').fill(str(i));state=q.evaluate('__directionalDoll()');assert not state['productionEnabled'] and not state['artworkApproved']
            assert state['mode']==('modular' if d in ready else 'fallback')
            original=source.crop((i*84,DIRECTIONS.index(d)*84,(i+1)*84,(DIRECTIONS.index(d)+1)*84))
            actual=q.evaluate('btoa(String.fromCharCode(...document.getElementById("modular").getContext("2d").getImageData(0,0,84,84).data))')
            assert base64.b64decode(actual)==(expected(d,i) if d in ready else rgba(original)),(d,i)
        assert q.locator('[data-layer]:disabled').count()==(0 if d in ready else 5)
        q.locator('#frame').fill('3');q.screenshot(path=str(OUT/f'directional-{d}-1366.png'),full_page=True)
    for d in ready:
        q.locator('#direction').select_option(d)
        for visible in itertools.product([False,True],repeat=5):
            hidden=[]
            for slot,value in zip(['hair','outfit','pants','boots','weapon'],visible):
                q.locator(f'[data-layer={slot}]').set_checked(value)
                if not value:hidden.append(slot)
            actual=q.evaluate('btoa(String.fromCharCode(...document.getElementById("modular").getContext("2d").getImageData(0,0,84,84).data))');assert base64.b64decode(actual)==expected(d,3,hidden)
    for slot in ['hair','outfit','pants','boots','weapon']:q.locator(f'[data-layer={slot}]').check()
    q.locator('#frame').fill('7');q.locator('#play').click();assert q.evaluate('__directionalDoll().frameIndex')==0;q.clock.run_for(800);assert q.evaluate('__directionalDoll().frameIndex')==7 and not q.evaluate('__directionalDoll().playing')
    q.locator('#direction').select_option('west');q.locator('#frame').fill('3');q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'directional-west-393.png'),full_page=True)
    q.locator('#guides').check();assert q.evaluate('document.getElementById("modular").getContext("2d").getImageData(42,65,1,1).data[3]')==255
    stats=q.evaluate('__directionalDoll().stats');assert stats['cacheEntries']<=stats['maxCacheEntries'] and stats['cacheBytes']<=stats['maxCacheBytes']
    assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='directional-doll-sentinel';assert not errors,errors;browser.close()
print('Directional review:32 real frame views, independent depth/offset composition,64 piece combinations, original fallback, fixed west origin, exact GIFs, mobile, cache and save isolation passed.')
