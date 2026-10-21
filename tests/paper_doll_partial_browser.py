"""Partial-direction renderer/import acceptance with geometry fixtures, never art."""
import base64
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('MARE_TEST_URL', 'http://127.0.0.1:8123/')
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1366, 'height': 900})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL + 'tools/paper-doll-inspector/index.html', wait_until='networkidle')
    page.evaluate('localStorage.setItem("mare-partida-save-v1", "partial-test-sentinel")')
    fixture = page.evaluate('''() => {
      const rig=structuredClone(MarePaperDollCatalog.sharedRig),files=[],pieces=[];
      const selected={};
      for(const [slot,color] of Object.entries({body:'#a22',outfit:'#25a',hair:'#dd4',weapon:'#4b6'})){
        const canvas=document.createElement('canvas');canvas.width=336;canvas.height=84;
        const ctx=canvas.getContext('2d');ctx.fillStyle=color;
        for(let frame=0;frame<4;frame++)ctx.fillRect(84*frame+30,25+frame,5,5);
        const name=slot+'-idle.png';files.push({name,base64:canvas.toDataURL().split(',')[1]});
        selected[slot]='partial-'+slot;
        pieces.push({id:selected[slot],slot,rigId:rig.id,available:true,approved:false,
          animations:{idle:{...rig.animations.idle,directions:['south'],url:name,frameWidth:84,frameHeight:84}}});
      }
      return {manifest:{rig,pieces,appearance:{rigId:rig.id,pieces:selected}},files};
    }''')
    files = [{'name': 'partial.json', 'mimeType': 'application/json',
              'buffer': json.dumps(fixture['manifest']).encode()}]
    files += [{'name': f['name'], 'mimeType': 'image/png',
               'buffer': base64.b64decode(f['base64'])} for f in fixture['files']]
    page.locator('#importPanel > summary').click()
    page.locator('#importPack').set_input_files(files)
    page.wait_for_function('__paperDollInspector.state().mode === "partial-draft"')
    for frame in range(4):
        page.locator('#frame').fill(str(frame))
        state = page.evaluate('__paperDollInspector.state()')
        assert state['readyDirections'] == ['south'], state
        assert not state['artworkValidated']
        assert all(m['code'] == 'missing-direction' for m in state['missing'])
        assert state['differences'][0]['pixels'] > 0
        assert all(d['pixels'] == 0 for d in state['differences'][1:])
    assert 'Pacote parcial' in page.locator('#status').inner_text()
    page.locator('[data-layer=hair]').uncheck()
    assert 'hair' in page.evaluate('__paperDollInspector.state().hidden')
    page.locator('#animation').select_option('walk')
    assert page.evaluate('__paperDollInspector.state().mode') == 'fallback'
    assert page.evaluate('__paperDollInspector.state().readyDirections') == []
    assert all(d['pixels'] == 0 for d in page.evaluate('__paperDollInspector.state().differences'))
    page.locator('#animation').select_option('idle')
    page.locator('#resetLayers').click()
    assert page.evaluate('__paperDollInspector.state().readyDirections') == ['south']
    page.locator('#resetPack').click()
    assert page.evaluate('__paperDollInspector.state().mode') == 'fallback'
    assert page.evaluate('localStorage.getItem("mare-partida-save-v1")') == 'partial-test-sentinel'
    assert not errors, errors
    browser.close()
print('Partial-direction browser passed: real PNG audit, four synchronized frames, south composition, three legacy directions, walk fallback, save untouched.')
