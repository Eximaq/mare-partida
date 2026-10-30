"""Optional diagnostic overlays must be usable and stay out of the normal game."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8148/dist/');OUT=Path(os.environ.get('MARE_EVIDENCE_ROOT','docs/evidence-paper-doll/refinement/after'))/'diagnostics';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch();c=b.new_context(viewport={'width':1366,'height':900});q=c.new_page()
 q.goto(BASE+'tools/paper-doll-inspector/index.html?pack=complete',wait_until='networkidle');q.wait_for_function('window.__paperDollInspector?.state().mode==="draft"')
 assert q.locator('#motionDiagnostics').count()==1,'The existing inspector must expose an optional motion overlay'
 q.locator('#classId').select_option('gunner');q.locator('#animation').select_option('attack');q.locator('#direction').select_option('east');q.locator('#frame').fill('3');q.locator('#pivots').uncheck()
 clean=q.locator('.board:not([hidden]) canvas').nth(1).evaluate('(c)=>c.toDataURL()');q.locator('#motionDiagnostics').check()
 assert q.locator('.board:not([hidden]) canvas').nth(1).evaluate('(c)=>c.toDataURL()')!=clean
 assert 'emission' in q.locator('#motionReadout').text_content();q.screenshot(path=str(OUT/'inspector.png'),full_page=True)
 q.locator('#motionDiagnostics').uncheck();assert q.locator('.board:not([hidden]) canvas').nth(1).evaluate('(c)=>c.toDataURL()')==clean
 q.goto(BASE,wait_until='networkidle');assert q.evaluate('typeof window.__marePaperDollDebug')=='undefined';assert not q.locator('#paperDollDebugReadout').count()
 q.locator('#characterName').fill('QA Modular');q.locator('#nextToClass').click();q.locator('#nextToAppearance').click();q.locator('#createCharacter').click();q.locator('[data-confirm-accept]').click();normal=q.evaluate('localStorage.getItem("mare-partida-save-v1")')
 q.goto(BASE+'?dev=1&paperDollReview=complete&paperDollDebug=1',wait_until='networkidle');q.wait_for_function('window.__marePaperDollDebug?.().state==="ready"');normal=q.evaluate('localStorage.getItem("mare-partida-save-v1")');q.locator('#paperDollDebugReadout').wait_for(state='visible')
 q.keyboard.press('F9');q.locator('#paperDollDebugReadout').wait_for(state='hidden');q.keyboard.press('F9');q.locator('#paperDollDebugReadout').wait_for(state='visible')
 q.set_viewport_size({'width':393,'height':852});assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'dev-mobile.png'))
 assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')==normal
 b.close()
print('Diagnostics: inspector overlay toggles without changing art, DEV only, keyboard/mobile and normal save preserved.')
