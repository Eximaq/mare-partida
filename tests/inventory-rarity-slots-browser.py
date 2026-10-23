"""Checks rarity frames and existing inventory controls in an isolated browser save."""
import copy
import os
import sys
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(tempfile.gettempdir())/'mare-inventory-rarity-slots.png'
RARITIES=['common','uncommon','rare','epic','legendary','supreme']
PREVIEW=sys.argv[1] if len(sys.argv)>1 else os.environ.get('MARE_PREVIEW_URL','http://127.0.0.1:8123/')

with sync_playwright() as p:
    browser=p.chromium.launch()
    errors=[]
    context=browser.new_context(viewport={'width':1366,'height':768})
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(PREVIEW);page.wait_for_load_state('networkidle')
    page.wait_for_function('typeof __mareDiagnostics==="function"')
    page.locator('#characterName').fill('Teste Molduras')
    page.locator('#nextToClass').click();page.locator('#createCharacter').click()
    page.wait_for_timeout(400)
    save=copy.deepcopy(page.evaluate("JSON.parse(localStorage.getItem('mare-partida-save-v1'))"))
    save['inventory']=[{
        'id':f'rarity-{rarity}','def':index,'level':1,'plus':0,
        'locked':False,'obtainedAt':index+1,'rarity':rarity
    } for index,rarity in enumerate(RARITIES)]
    page.evaluate("([key,value])=>localStorage.setItem(key,JSON.stringify(value))",['mare-partida-save-v1',save])
    page.reload();page.wait_for_load_state('networkidle')
    page.locator('#mainMenu [data-panel=inventory]').click()
    page.wait_for_selector('.op-item.rarity-supreme')
    for rarity in RARITIES:
        slot=page.locator(f'.op-item.rarity-{rarity}')
        style=slot.evaluate('(el)=>getComputedStyle(el)')
        assert f'/assets/ui/inventory-slots/{rarity}.png' in style['backgroundImage'],rarity
        assert style['backgroundSize']=='contain',rarity
        assert style['backgroundOrigin']=='border-box',rarity
        assert slot.locator('.op-item-icon .item-icon').count()==1,rarity
    empty=page.locator('.op-item.empty').first
    assert empty.evaluate('(el)=>getComputedStyle(el).backgroundImage')=='none'
    page.locator('.op-item.rarity-common').click()
    assert page.locator('.op-item.rarity-common').get_attribute('aria-pressed')=='true'
    assert page.locator('#dialogBody .op-detail-head').count()==1
    assert not errors,errors
    page.screenshot(path=str(OUT))
    print(f'Browser rarity frames, centered item icons, neutral empty slots and selection passed: {OUT}')
    context.close();browser.close()
