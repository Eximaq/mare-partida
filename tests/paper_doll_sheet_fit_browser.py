"""Real partial attack pack: edit/export sheet offsets without painting or saves."""
import copy,hashlib,json,os,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1];BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
FOLDER=ROOT/'pixellab-pip-generations/paper-doll-east-fit-20261022'
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(exist_ok=True)
pack=json.loads((FOLDER/'review-pack.json').read_text());pngs=sorted({c['url'] for p in pack['pieces'] for c in p['animations'].values()})
hashes={n:hashlib.sha256((FOLDER/n).read_bytes()).hexdigest() for n in pngs}
with sync_playwright() as p,tempfile.TemporaryDirectory() as temporary:
 browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':900},accept_downloads=True)
 context.add_init_script('localStorage.setItem("mare-partida-save-v1","sheet-fit-sentinel")')
 q=context.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
 q.goto(BASE+'tools/paper-doll-inspector/index.html?pack=bento-east-fit',wait_until='networkidle')
 q.wait_for_function('window.__paperDollInspector?.state().readyDirections?.length===4')
 assert q.locator('#animation').input_value()=='attack'
 assert q.evaluate('__paperDollInspector.state().artworkValidated') is False
 q.locator('#direction').select_option('east');q.locator('#frame').fill('5')
 q.locator('#layerFitPanel > summary').click();q.locator('#fitSlot').select_option('weapon')
 def weapon():return next(x for x in json.loads(q.locator('#transforms').text_content()) if x['slot']=='weapon')
 original=weapon();assert (original['offsetX'],original['offsetY'])==(19,-6)
 for value in ['','-85','85','0.5']:
  q.locator('#fitX').fill(value);q.locator('#applyLayerFit').click();assert weapon()==original
 q.locator('#fitX').fill('20');q.locator('#fitY').fill('-5');q.locator('#fitZ').fill('55');q.locator('#applyLayerFit').click()
 edited=weapon();assert (edited['offsetX'],edited['offsetY'],edited['zIndex'])==(20,-5,55)
 q.locator('#frame').fill('0');assert weapon()['offsetX']==1 and weapon()['offsetY']==-3
 q.locator('#frame').fill('5')
 with q.expect_download() as download:q.locator('#exportLayerFits').click()
 file=Path(temporary)/'review.json';download.value.save_as(file);exported=json.loads(file.read_text())
 assert list(exported['rig']['animations'])==['attack-sword'],'Fallback timelines must not become invented sprite coverage'
 assert exported['reviewOnly'] and not exported['productionEnabled'] and all(p['approved'] is False for p in exported['pieces'])
 clip=next(p for p in exported['pieces'] if p['slot']=='weapon')['animations']['attack-sword']
 assert clip['poseOverrides']['east'][5]=={'offsetX':20,'offsetY':-5,'zIndex':55}
 assert clip['occludedFrames']['north']==[1,2,3,4,5] and 'blob:' not in file.read_text()
 q.locator('#restoreLayerFits').click();assert weapon()['offsetX']==19 and weapon()['offsetY']==-6
 q.locator('#importPack').set_input_files([str(file),*[str(FOLDER/n) for n in pngs]])
 q.wait_for_function('window.__paperDollInspector?.state().readyDirections?.includes("east")')
 q.locator('#frame').fill('5');assert weapon()['offsetX']==20 and weapon()['offsetY']==-5
 for action in ['idle','walk']:
  q.locator('#animation').select_option(action);assert q.evaluate('__paperDollInspector.state().mode')=='fallback'
  assert q.locator('#applyLayerFit').is_disabled()
 q.locator('#animation').select_option('attack');assert q.locator('#applyLayerFit').is_enabled()
 # Reject invalid partial contracts atomically, without losing the previous valid import.
 for animation in [{'attack-sword':{**pack['rig']['animations']['attack-sword'],'fps':11}}, {'unknown':pack['rig']['animations']['attack-sword']}]:
  bad=copy.deepcopy(pack);bad['rig']['animations']=animation
  q.locator('#importPack').set_input_files([str(file),*[str(FOLDER/n) for n in pngs]])
  q.wait_for_function('document.getElementById("importStatus").textContent.includes("recebido")')
  invalid=Path(temporary)/'invalid.json';invalid.write_text(json.dumps(bad),encoding='utf-8')
  q.locator('#importPack').set_input_files([str(invalid),*[str(FOLDER/n) for n in pngs]])
  q.wait_for_function('document.getElementById("importStatus").textContent.includes("não aplicado")')
  assert q.evaluate('__paperDollInspector.state().mode')=='draft'
 q.screenshot(path=str(OUT/'sheet-fit-1366.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 q.screenshot(path=str(OUT/'sheet-fit-393.png'),full_page=True)
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='sheet-fit-sentinel'
 if q.locator('#importPanel').get_attribute('open') is None:q.locator('#importPanel > summary').click()
 q.locator('#resetPack').click();assert q.locator('#applyLayerFit').is_disabled() and q.locator('#exportLayerFits').is_disabled()
 assert not errors,errors;browser.close()
assert hashes=={n:hashlib.sha256((FOLDER/n).read_bytes()).hexdigest() for n in pngs}
print('Sheet fitting: attack-only import, four directions, frame-local edits, validation, export/reimport, reset, missing-action fallback, original PNGs/save and mobile preserved.')
