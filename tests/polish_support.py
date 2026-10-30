import copy,json,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
KEY='mare-partida-save-v1'
SIZES=[(1920,1080),(1366,768),(1280,720)]
def page_for(browser,seed=None,size=(1366,768),errors=None):
    c=browser.new_context(viewport=dict(width=size[0],height=size[1]))
    c.route('**/__dev_version',lambda route:route.fulfill(body='stable-test'))
    if seed:c.add_init_script("if(!sessionStorage.seeded){localStorage.setItem("+json.dumps(KEY)+","+json.dumps(json.dumps(seed))+");sessionStorage.seeded='1'}")
    q=c.new_page()
    if errors is not None:q.on('pageerror',lambda e:errors.append(str(e)))
    q.clock.install();q.goto(os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/'));q.wait_for_load_state('networkidle');q.wait_for_function('typeof __mareDiagnostics==="function"');return c,q
def saved(q):return json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))
def create(q):
    q.locator('#characterName').fill('Nauta Polimento');q.locator('#nextToClass').click();q.locator('#nextToAppearance').click();q.locator('#createCharacter').click();q.locator('[data-confirm-accept]').click();q.clock.run_for(100)
    return saved(q)
def fixture(template):
    g=copy.deepcopy(template);g.update(level=10,gold=5000,materials=100,potions=6,hp=120,energy=80)
    for slot,index in dict(head=18,necklace=20,coat=6,legs=21,boots=8,weapon=0,cloak=23,gloves=25,ring=27,belt=29,charm=10).items():
        g['equipment'][slot]={'id':'worn-'+slot,'def':index,'level':1,'plus':0,'locked':False,'obtainedAt':1}
    g['inventory']=[{'id':f'bag-{i}','def':i%33,'level':2 if i==1 else 1,'plus':0,'locked':i==7,'obtainedAt':i+10,'origin':'Expedição às Ruínas de Brasa'} for i in range(40)]
    g['stats']['crab']=6;g['claimed']=[]
    return g
def panel(q,key):
    if key=='character':
        q.locator('#characterMenuTrigger').click();q.locator('[data-character-section=status]').click();return
    q.locator('.bottom-nav [data-panel="'+('modes' if key in ['map','prison'] else key)+'"]').click()
    if key in ['map','prison']:q.locator('[data-quick-mode="'+key+'"]').click()
def close(q):q.locator('[data-close-panel]' if q.locator('#panelOverlay.inventory-mode').count() else '#closePanel').click()
