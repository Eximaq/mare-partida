"""Regression of the read-only motion study; artistic approval is a separate review."""
import base64,json,os,itertools
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
REL=os.environ.get('MARE_MOTION_STUDY','pixellab-pip-generations/paper-doll-bento-motion-20261021/')
FOLDER=ROOT/REL
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)

def normalized(im):return bytes(v for c in im.convert('RGBA').get_flattened_data() for v in (c if c[3] else (0,0,0,0)))

source=Image.open(FOLDER/'reference-bento-attack.png').convert('RGBA')
assert normalized(source)==normalized(Image.open(ROOT/'assets/classes/pirate-sword/attack.png'))
comparison=json.loads((FOLDER/'comparison.json').read_text(encoding='utf-8'))
old_path=(FOLDER/comparison['rejected']).resolve();assert old_path.is_relative_to(ROOT)
old=Image.open(old_path).convert('RGBA')
candidate=[]
pack_path=FOLDER/'review-pack.json';pack=json.loads(pack_path.read_text(encoding='utf-8')) if pack_path.exists() else None
modular=bool(pack and all(p['available'] for p in pack['pieces']))
layers={}
if modular:
    for piece in pack['pieces']:
        layers[piece['slot']]=Image.open(FOLDER/piece['animations']['attack-sword']['url']).convert('RGBA')
def expected_modular(index,hidden=()):
    im=Image.new('RGBA',(84,84))
    for slot in ['body','pants','boots','outfit','hair','weapon']:
        if slot not in hidden:im=Image.alpha_composite(im,layers[slot].crop((index*84,0,(index+1)*84,84)))
    return normalized(im)
for i in range(8):
    raw=Image.open(FOLDER/f'body-south-{i:02}.png').convert('RGBA');assert raw.size==(64,64)
    im=Image.new('RGBA',(84,84));im.paste(raw,(10,13));candidate.append(im)
    original=source.crop((i*84,0,(i+1)*84,84));crop=Image.open(FOLDER/f'bento-south-{i:02}.png')
    reverse=Image.new('RGBA',(84,84));reverse.paste(crop,(10,13));assert normalized(original)==normalized(reverse)
    if modular:
        for slot,layer in layers.items():
            if slot=='body':continue
            cell=layer.crop((i*84,0,(i+1)*84,84))
            assert all(not c[3] or c==s for c,s in zip(cell.get_flattened_data(),original.get_flattened_data())),(slot,i,'foreign visible pixel')
with Image.open(FOLDER/'candidate-south.gif') as gif:
    assert gif.n_frames==8 and gif.info['loop']==0
    for i,im in enumerate(candidate):
        gif.seek(i);assert normalized(gif.convert('RGBA'))==normalized(im)
        assert gif.info['duration']==[80,90,80,80,90,80,80,90][i] and gif.disposal_method==2
with sync_playwright() as p:
    browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':1000})
    context.add_init_script('localStorage.setItem("mare-partida-save-v1","bento-motion-sentinel")')
    q=context.new_page();q.clock.install();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    q.goto(BASE+REL+'preview.html',wait_until='networkidle');q.wait_for_function('__bentoMotion?.().ready')
    assert q.locator('#review').inner_text()==json.loads((FOLDER/'review.json').read_text(encoding='utf-8'))['summary_pt']
    for i in range(8):
        q.locator('#frame').fill(str(i));state=q.evaluate('__bentoMotion()')
        assert state['frameIndex']==i and not state['productionEnabled'] and not state['artworkApproved']
        if modular:
            assert state['modularReady'] and state['unsupportedDirectionFallsBack']
            raw=q.evaluate('btoa(String.fromCharCode(...document.getElementById("modular").getContext("2d").getImageData(0,0,84,84).data))')
            assert base64.b64decode(raw)==expected_modular(i)
        for name,expected in [('original',source.crop((i*84,0,(i+1)*84,84))),('rejected',old.crop((i*84,0,(i+1)*84,84))),('candidate',candidate[i])]:
            raw=q.evaluate('id=>btoa(String.fromCharCode(...document.getElementById(id).getContext("2d").getImageData(0,0,84,84).data))',name)
            assert base64.b64decode(raw)==normalized(expected),(name,i)
    q.locator('#play').click();assert q.evaluate('__bentoMotion().frameIndex')==0
    q.clock.run_for(800);assert q.evaluate('__bentoMotion().frameIndex')==7 and not q.evaluate('__bentoMotion().playing')
    q.locator('#frame').fill('3');assert 'impacto' in q.locator('#status').inner_text()
    q.screenshot(path=str(OUT/'bento-motion-1366.png'),full_page=True)
    q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
    q.screenshot(path=str(OUT/'bento-motion-393.png'),full_page=True)
    if modular:
        for visible in itertools.product([False,True],repeat=5):
            hidden=[]
            for slot,value in zip(['hair','outfit','pants','boots','weapon'],visible):
                q.locator(f'[data-layer={slot}]').set_checked(value)
                if not value:hidden.append(slot)
            raw=q.evaluate('btoa(String.fromCharCode(...document.getElementById("modular").getContext("2d").getImageData(0,0,84,84).data))')
            assert base64.b64decode(raw)==expected_modular(3,hidden)
        with Image.open(FOLDER/'modular-south.gif') as gif:
            assert gif.n_frames==8
            for i in range(8):gif.seek(i);assert normalized(gif.convert('RGBA'))==expected_modular(i)
        stats=q.evaluate('__bentoMotion().stats');assert stats['cacheEntries']<=stats['maxCacheEntries'] and stats['cacheBytes']<=stats['maxCacheBytes']
    q.locator('#guides').check();assert q.evaluate('document.getElementById("candidate").getContext("2d").getImageData(42,65,1,1).data[3]')==255
    assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='bento-motion-sentinel'
    assert not errors,errors;browser.close()
print('Bento motion:8 ordered frames, reversible source crop,24 independent Canvas RGBA checks, exact GIF, one-shot playback, mobile and save isolation passed. No artistic approval inferred.')
