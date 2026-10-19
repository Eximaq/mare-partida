"""Isolated save/UI regression; never accesses the player's browser profile."""
import json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,KEY
DEV='mare-partida-dev-save-v1'
with sync_playwright() as p:
    b=p.chromium.launch(headless=True);errors=[]
    c,q=page_for(b,errors=errors);normal=create(q)
    assert q.locator('#mainMenu [data-panel]').count()==6
    q.locator('#devLauncher').click();assert q.locator('[data-dev-enter]').is_visible()
    q.locator('[data-dev-enter]').click();q.wait_for_url('**/?dev=1');q.wait_for_function('window.__mareDiagnostics?.().dev.active')
    baseline=q.evaluate('key=>localStorage.getItem(key)',KEY)
    def state():return json.loads(q.evaluate('key=>localStorage.getItem(key)',DEV))
    def open_dev():q.locator('#devLauncher').click()
    def command(name):q.locator('[data-dev-command="'+name+'"]').first.click()
    open_dev();q.locator('[data-dev-command=level][data-value="100"]').click();assert state()['level']==100
    q.evaluate("()=>{window.devOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('quota')}}")
    q.locator('[data-dev-command=level][data-value="200"]').click();assert state()['level']==100;assert q.evaluate('__mareDiagnostics().level')==100
    q.evaluate('()=>{Storage.prototype.setItem=window.devOriginalSet}')
    for cls in ['brawler','gunner','rogue','cyborg','strategist','healer','sword']:
        q.locator('#devClass').select_option(cls);command('class');assert state()['classId']==cls
        options=q.locator('#devUltimate option').evaluate_all('(items)=>items.map(o=>o.value)')
        for o in options[1:]:
            q.locator('#devUltimate').select_option(o);command('build')
            assert state()['talentBuilds'][cls]['ultimate']==o
    command('haki-unlock');assert state()['has_haki_unlocked']
    command('haki-lock');assert not state()['has_haki_unlocked']
    command('haki-kit');assert any(i['def']==q.evaluate('__mareDiagnostics().hakiBookDef') for i in state()['inventory'])
    command('haki-unlock');command('low-hp');assert q.evaluate('__mareDiagnostics().hp<__mareDiagnostics().stats.maxHP')
    command('restore');assert q.evaluate('__mareDiagnostics().hp===__mareDiagnostics().stats.maxHP')
    command('supplies');assert state()['gold']>=1000000
    q.locator('#devCount').fill('3');before=len(state()['inventory']);command('item');assert len(state()['inventory'])==before+3
    q.locator('[data-dev-option=godMode]').check();assert state()['devOptions']['godMode']
    q.locator('[data-dev-travel=beach]').click();open_dev();q.locator('[data-dev-clear]').click();q.locator('[data-dev-spawn=bandit]').click();q.locator('[data-dev-spawn=boss]').click();assert q.evaluate('__mareDiagnostics().alive')==2
    q.locator('[data-dev-close]').click();q.clock.run_for(3000);assert not errors,errors
    open_dev();q.locator('#devFloor').fill('50');command('prison-preview');assert state()['impelDown']['cleared']==50
    q.reload();q.wait_for_function('window.__mareDiagnostics?.().dev.active');assert state()['level']==100
    assert q.evaluate('key=>localStorage.getItem(key)',KEY)==baseline
    for size in [(1920,1080),(1366,768),(1280,720),(393,852),(320,740)]:
        q.set_viewport_size(dict(width=size[0],height=size[1]));open_dev()
        assert q.evaluate('document.documentElement.scrollWidth<=innerWidth'),size
        assert q.locator('.dev-tools').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'),size
        q.screenshot(path=str(Path(tempfile.gettempdir())/f'mare-dev-{size[0]}.png'))
        q.locator('#closePanel').click()
    open_dev();q.locator('[data-dev-exit]').click();q.wait_for_url('http://127.0.0.1:8123/');q.wait_for_function('window.__mareDiagnostics?.().dev.active===false')
    # Normal writes on its own boot are expected; character progression must match original.
    restored=json.loads(q.evaluate('key=>localStorage.getItem(key)',KEY));assert restored['level']==normal['level'];assert restored['classId']==normal['classId'];assert not restored.get('devSandbox')
    # Dev exports cannot replace the real adventure through Import.
    dev_export=state();q.locator('#mainMenu [data-panel=help]').click()
    with q.expect_file_chooser() as chooser:q.locator('[data-import]').click()
    chooser.value.set_files(dict(name='dev.json',mimeType='application/json',buffer=json.dumps(dev_export).encode()))
    q.wait_for_function("document.querySelector('#toastContainer').textContent.includes('só pode ser importado')")
    assert q.evaluate('__mareDiagnostics().level')==normal['level'];q.locator('#closePanel').click()
    open_dev();q.locator('[data-dev-enter]').click();q.wait_for_url('**/?dev=1');q.wait_for_function('window.__mareDiagnostics?.().dev.active')
    open_dev();q.locator('[data-dev-recopy]').click();q.get_by_role('button',name='RECRIAR CÓPIA',exact=True).click();q.wait_for_function('window.__mareDiagnostics?.().level===1');assert state()['level']==1
    # Import/restart must survive pagehide/beforeunload without the old session overwriting them.
    q.locator('#mainMenu [data-panel=help]').click();imported=state();imported['level']=49
    with q.expect_file_chooser() as chooser:q.locator('[data-import]').click()
    chooser.value.set_files(dict(name='sandbox.json',mimeType='application/json',buffer=json.dumps(imported).encode()))
    q.wait_for_function('window.__mareDiagnostics?.().level===49');assert state()['level']==49
    q.locator('#mainMenu [data-panel=help]').click();q.locator('[data-reset]').click();q.locator('[data-confirm-accept]').click()
    q.wait_for_function('window.__mareDiagnostics?.().level===1');assert state()['level']==1
    assert json.loads(q.evaluate('key=>localStorage.getItem(key)',KEY))['level']==normal['level']
    open_dev();q.locator('[data-dev-exit]').click();q.wait_for_function('window.__mareDiagnostics?.().dev.active===false')
    q.locator('#mainMenu [data-panel=help]').click();q.locator('[data-reset]').click();q.locator('[data-confirm-accept]').click()
    q.wait_for_selector('#startOverlay:not(.hidden)');assert q.evaluate('key=>localStorage.getItem(key)',KEY) is None
    assert not errors,errors
    print(json.dumps(dict(passed=True,classes=7,ultimates=21,viewports=5,isolated_save=True,errors=errors)))
    c.close();b.close()
