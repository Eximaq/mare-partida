"""Edit/export real rigid sockets without altering PNGs, approved flags or saves."""
import json,os,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
FILES=ROOT/'pixellab-pip-generations/paper-doll-hair-outfit-20261021'
with sync_playwright() as p, tempfile.TemporaryDirectory() as temporary:
    browser=p.chromium.launch();context=browser.new_context(viewport={'width':1366,'height':900},accept_downloads=True)
    context.add_init_script('localStorage.setItem("mare-partida-save-v1","socket-sentinel")')
    q=context.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    q.goto(BASE+'tools/paper-doll-inspector/index.html',wait_until='networkidle')
    q.wait_for_function('window.__paperDollInspector?.state().referenceReady')
    q.locator('#attachmentPanel > summary').click()
    assert q.locator('#applySocket').is_disabled() and q.locator('#exportPack').is_disabled()
    q.locator('#importPanel > summary').click()
    images=[str(FILES/name) for name in ['body-idle-south.png','hair-idle-south.png','outfit-idle-south.png','rigid-weapon.png']]
    q.locator('#importPack').set_input_files([str(FILES/'review-pack.json'),*images])
    q.wait_for_function('__paperDollInspector.state().readyDirections?.includes("south")')
    def weapon():return next(x for x in json.loads(q.locator('#transforms').text_content()) if x['slot']=='weapon')
    q.locator('#frame').fill('1');assert weapon()['socket']=={'x':28,'y':48}
    # Invalid and empty fields must not mutate the current socket.
    for value in ['','-1','85','1.5']:
        q.locator('#socketX').fill(value);q.locator('#applySocket').click()
        assert weapon()['socket']=={'x':28,'y':48}
    q.locator('#socketX').fill('29');q.locator('#socketY').fill('47');q.locator('#socketZ').fill('10')
    q.locator('#applySocket').click();assert weapon()['socket']=={'x':29,'y':47} and weapon()['zIndex']==10
    q.locator('#frame').fill('0');assert weapon()['socket']=={'x':30,'y':49} and weapon()['zIndex']==80
    q.locator('#frame').fill('1')
    with q.expect_download() as download:q.locator('#exportPack').click()
    destination=Path(temporary)/'review.json';download.value.save_as(destination)
    data=json.loads(destination.read_text());assert data['reviewOnly']
    assert all(piece['approved'] is False for piece in data['pieces'])
    clip=next(x for x in data['pieces'] if x['slot']=='weapon')['animations']['idle']
    assert clip['sockets']['south'][1]=={'x':29,'y':47} and clip['poseOverrides']['south'][1]['zIndex']==10
    assert clip['url']=='rigid-weapon.png' and 'blob:' not in destination.read_text()
    q.locator('#restoreSockets').click();assert weapon()['socket']=={'x':28,'y':48} and weapon()['zIndex']==80
    # Exported JSON is a portable roundtrip, not a save mutation.
    q.locator('#importPack').set_input_files([str(destination),*images])
    q.wait_for_function('__paperDollInspector.state().readyDirections?.includes("south")')
    q.locator('#frame').fill('1');assert weapon()['socket']=={'x':29,'y':47} and weapon()['zIndex']==10
    q.locator('#socketDirection').select_option('north');assert q.locator('#applySocket').is_disabled()
    q.locator('#socketDirection').select_option('south');assert q.locator('#applySocket').is_enabled()
    q.locator('#animation').select_option('walk');assert q.locator('#applySocket').is_disabled()
    q.locator('#animation').select_option('idle')
    q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='socket-sentinel'
    q.locator('#resetPack').click();assert q.locator('#applySocket').is_disabled()
    assert not errors,errors;browser.close()
print('Socket editor passed: per-frame position/depth, invalid-input rejection, restore, portable JSON roundtrip, unavailable views/actions, mobile and save isolation.')
