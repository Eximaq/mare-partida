"""Shared identity contract and legacy fallback; no modular artwork is claimed."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
KEY='mare-partida-save-v1'
errors=[];rows=[]
with sync_playwright() as p:
 b=p.chromium.launch()
 c=b.new_context(viewport={'width':1366,'height':900});q=c.new_page()
 q.on('pageerror',lambda e:errors.append(str(e)))
 q.goto(URL+'tools/paper-doll-inspector/index.html',wait_until='networkidle')
 classes=q.evaluate('Object.keys(MarePaperDollCatalog.classes)')
 factions=q.evaluate('Object.keys(MarePaperDollCatalog.factions)')
 for cls in classes:
  q.locator('#classId').select_option(cls)
  for faction in factions:
   q.locator('#factionId').select_option(faction)
   for action in ['idle','walk','attack']:
    q.locator('#animation').select_option(action)
    q.wait_for_function('__paperDollInspector.state().referenceReady')
    s=q.evaluate('__paperDollInspector.state()')
    assert s['mode']=='fallback' and not s['artworkValidated'],s
    assert s['appearance']['pieces']['body']=='human-body'
    assert s['appearance']['pieces']['hair']=='human-hair'
    assert s['appearance']['pieces']['outfit']=='human-outfit-'+faction
    assert s['appearance']['rigId']=='human-v1' and not s['appearance']['blocked']
    assert len(s['missing'])==4 and all(d['pixels']==0 for d in s['differences'])
    if action=='attack':
     assert s['pose']['animationId']=='attack-'+s['profile']['category']
     assert s['reference']['animated']==(cls=='sword' and faction=='pirate')
     if not s['reference']['animated']:assert 'repouso' in q.locator('article.board p').first.inner_text()
   rows.append({'classId':cls,'factionId':faction,'category':s['profile']['category']})
 q.locator('#classId').select_option('gunner');q.locator('#factionId').select_option('marine')
 q.screenshot(path=str(OUT/'shared-marine-gunner-1366.png'),full_page=True)
 q.set_viewport_size({'width':393,'height':852});q.screenshot(path=str(OUT/'shared-marine-gunner-393.png'),full_page=True)
 assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert q.evaluate('localStorage.length')==0;c.close()
 # Seed only isolated test contexts. Verify each class/faction resolves the same human
 # identity in the actual game and preserves all existing character/gear fields.
 c=b.new_context();c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'))
 q=c.new_page();q.goto(URL,wait_until='domcontentloaded');q.wait_for_function('typeof __mareDiagnostics==="function"')
 q.locator('#characterName').fill('Base comum isolada');q.locator('#nextToClass').click();q.locator('#createCharacter').click()
 template=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'));c.close()
 weapons={'sword':0,'brawler':2,'gunner':4,'rogue':12,'cyborg':14,'strategist':16,'healer':31}
 for row in rows:
  seed=copy.deepcopy(template);seed.update(classId=row['classId'],factionId=row['factionId'])
  seed['equipment']['weapon']['def']=weapons[row['classId']]
  c=b.new_context();c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'))
  c.add_init_script('if(!sessionStorage.seeded){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+');sessionStorage.seeded="1"}')
  q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(URL,wait_until='domcontentloaded');q.wait_for_function('typeof __mareDiagnostics==="function"')
  d=q.evaluate('__mareDiagnostics()');look=d['paperDoll']['appearance']
  assert look['pieces']['body']=='human-body' and look['category']==row['category']
  assert not look['blocked'] and d['paperDoll']['compositions']==0
  q.reload();q.wait_for_function('typeof __mareDiagnostics==="function"')
  saved=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))
  assert saved['classId']==seed['classId'] and saved['factionId']==seed['factionId']
  assert saved['equipment']==seed['equipment'] and saved['attributes']==seed['attributes'],(row,seed['equipment'],saved['equipment'],seed['attributes'],saved['attributes'])
  assert saved.get('paperDollLook')==seed.get('paperDollLook')
  assert not any(('paper' in k.lower() or 'appearance' in k.lower()) and k!='paperDollLook' for k in saved)
  c.close()
 assert not errors,errors;b.close()
 result={'passed':True,'scope':'28 shared profiles; fallback only; no modular art','rows':rows,'errors':errors}
 (OUT/'shared-profiles.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
 print(json.dumps(result))
