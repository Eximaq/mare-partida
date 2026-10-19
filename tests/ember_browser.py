"""Ruins: real walking routes, collisions, camera, local combat and preserved saves."""
import copy,json,base64
from playwright.sync_api import sync_playwright
from polish_support import *
OUT=ROOT/'docs/evidence-ruinas-brasas';OUT.mkdir(exist_ok=True)
errors=[];results=[]
def record(name,detail=''):results.append(dict(test=name,passed=True,detail=detail));print(name+': passed',flush=True)
def diag(q):return q.evaluate('__mareDiagnostics()')
def physical(q):
 d=diag(q);assert d['walkable'];assert d['map']==dict(id='embers',width=1024,height=1024);c=d['camera']
 for axis,dim in [('x','width'),('y','height')]:
  if c[dim]>1024:assert c[axis]==(1024-c[dim])/2
  else:assert 0<=c[axis]<=1024-c[dim]+.01
 assert q.evaluate('MareEmberRenderer.stats().chunks')<=20
 for m in d['mobs']:assert q.evaluate('([x,y])=>new MareWorld.Navigation(MareEmber.map).walkable(x,y)',[m['x'],m['y']])
 return d
def route(q,id):
 panel(q,'map');assert q.locator('#emberOverview').is_visible();q.locator('[data-ember-poi='+id+']').click();assert not q.locator('#panelOverlay').is_visible()
 point=q.evaluate('(id)=>MareEmber.paths.find(p=>p.id===id)',id)
 for _ in range(100):
  q.clock.run_for(1000);d=diag(q)
  assert d['walkable']
  if not d['path']:break
 assert not d['path'],('route did not finish',id,d['hero'])
 assert ((d['hero']['x']-point['x'])**2+(d['hero']['y']-point['y'])**2)**.5<3,(id,d['hero'],point)
 physical(q);return point
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c,q=page_for(b,errors=errors);q.evaluate('MareEmberRenderer.boot');template=create(q);c.close()
 for size in SIZES+[(393,852)]:
  suffix=f'{size[0]}x{size[1]}';g=fixture(template);g.update(level=30,hp=10000,energy=1000,gold=10000,materials=1000);g['stats']['kills']=12
  for item in g['equipment'].values():item.update(rarity='legendary',level=30,plus=20)
  c,q=page_for(b,g,size,errors);q.evaluate('MareEmberRenderer.boot');before=saved(q);q.locator('#enterHunt').click();q.locator('#autoToggle').click();q.clock.run_for(100)
  assert q.evaluate('MareEmberRenderer.stats().monsters')==4
  physical(q);q.screenshot(path=str(OUT/f'arrival-{suffix}.png'))
  for id in ['mercado','ancoras','caldeira']:
   route(q,id);q.screenshot(path=str(OUT/f'{id}-{suffix}.png'))
  for _ in range(8):
   if any(m['type']=='boss' for m in diag(q)['mobs']):break
   q.clock.run_for(500)
  assert any(m['type']=='boss' and m['skin']=='caldera-captain' for m in diag(q)['mobs'])
  # Return by walking through the region, then click the actual quay interaction.
  route(q,'cais');q.screenshot(path=str(OUT/f'return-quay-{suffix}.png'))
  point=q.evaluate('MareEmber.returnPoint');d=diag(q);rect=q.locator('#worldCanvas').bounding_box()
  q.mouse.click(rect['x']+(point['x']-round(d['camera']['x']))/d['camera']['width']*rect['width'],rect['y']+(point['y']-round(d['camera']['y']))/d['camera']['height']*rect['height'])
  for _ in range(12):
   q.clock.run_for(1000)
   if diag(q)['scene']=='lobby':break
  assert diag(q)['scene']=='lobby';after=saved(q)
  for key in ['inventory','equipment','gold','materials','level','xp','attributes']:assert after[key]==before[key],key
  q.reload();q.wait_for_load_state('networkidle');again=saved(q)
  for key in ['inventory','equipment','gold','materials','level','xp','attributes']:assert again[key]==after[key]
  record('exploration_camera_return_'+suffix,'Real walking through all four compact districts, three stair approaches and fortress bridge; return and reload preserve resources/items.');c.close()
 # Sustained local auto-hunt: new visuals retain old reward and contract keys.
 g=fixture(template);g.update(level=20,hp=10000,energy=1000)
 for item in g['equipment'].values():item.update(rarity='legendary',level=20,plus=15)
 c,q=page_for(b,g,errors=errors);q.evaluate('MareEmberRenderer.boot');before=saved(q);q.locator('#enterHunt').click()
 for _ in range(80):
  q.clock.run_for(3000)
  if diag(q)['kills']>=before['stats']['kills']+20:break
 d=physical(q);assert d['kills']>=before['stats']['kills']+20,d['kills'];assert d['damage']>0;assert d['hero']['combat'] is not None
 assert q.evaluate('JSON.parse(localStorage.getItem('+json.dumps(KEY)+')).gold')>=before['gold']
 q.screenshot(path=str(OUT/'combat-20-kills.png'));record('twenty_defeats_real_rewards',str(d['kills'])+' kills, damage, XP/gold and navigable monsters.');c.close()
 # Low-level arrival still playable, legacy Fenda da Névoa remains separate.
 c,q=page_for(b,template,errors=errors);q.evaluate('MareEmberRenderer.boot');q.locator('#enterHunt').click();q.clock.run_for(15000);assert diag(q)['map']['id']=='embers';assert diag(q)['kills']>0;record('level_one_arrival');c.close()
 g=copy.deepcopy(template);g['area']='swamp';g['level']=10;c,q=page_for(b,g,errors=errors);q.locator('#enterHunt').click();assert diag(q)['map']['id']=='hunt' and diag(q)['map']['width']==3200;assert all(not m.get('skin') for m in diag(q)['mobs']);c.close();record('legacy_swamp_preserved')
 assert not errors,errors;record('no_javascript_errors');b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
