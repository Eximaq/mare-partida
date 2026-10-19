"""Constellation interaction, achievement transactions and live final-talent combat; isolated saves."""
import copy,json,tempfile,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,saved,KEY
OUT=Path(tempfile.gettempdir())/'mare-constellation-qa';OUT.mkdir(exist_ok=True)
results=[]
def record(name):results.append(name);print(name+': passed',flush=True)
def diag(q):return q.evaluate('__mareDiagnostics()')
def tree(q):
 q.locator('.bottom-nav [data-panel=character]').click();q.locator('#characterTabs [data-character-tab=talents]').click()
def select(q,id):q.locator('[data-talent-select="'+id+'"]').focus();q.locator('[data-talent-select="'+id+'"]').click()
def add(q,id,n=1):
 select(q,id)
 for _ in range(n):q.locator('[data-talent-add]').click()
def travel(q,id='conchas'):
 q.locator('#enterHunt').click();q.locator('[data-mode=map]').click();q.locator('[data-island='+id+']').click();q.locator('[data-travel-area]').click()
def claimed(q):return saved(q)['achievements']['claimed']
with sync_playwright() as p:
 b=p.chromium.launch();errors=[];c,q=page_for(b,errors=errors);template=create(q);c.close()
 seed=copy.deepcopy(template);seed.update(level=54,gold=1000000);seed['stats'].update(kills=10000,goldEarned=1000000)
 c,q=page_for(b,seed,errors=errors);tree(q)
 assert q.locator('.constellation-lines path').count()>30 and q.locator('.talent-ultimate').count()==3
 initial=diag(q)['talentPoints'];assert initial==54
 add(q,'sword-2-0',10);add(q,'wear')
 for tier in range(1,5):add(q,f'sword-2-{tier}',10)
 assert q.locator('.constellation-lines .lit').count()>0
 add(q,'asura');select(q,'spatial');assert q.locator('[data-talent-add]').is_disabled()
 assert diag(q)['talentPoints']==54
 q.locator('[data-talent-confirm]').click();q.locator('[data-confirm-accept]').click()
 assert diag(q)['talentPoints']==0 and saved(q)['talentBuilds']['sword']['ultimate']=='asura'
 q.reload();q.wait_for_load_state('networkidle');tree(q);assert diag(q)['talentPoints']==0
 record('connected_routes_bridge_final_single_choice_and_reload')
 for w,h in [(1920,1080),(1366,768),(1280,720),(393,852),(320,740)]:
  q.set_viewport_size(dict(width=w,height=h));q.locator('#dialogBody').evaluate('(e)=>e.scrollTop=0')
  q.locator('[data-tree-zoom=root]').click();vp=q.locator('.constellation-viewport');vp.scroll_into_view_if_needed()
  old=q.locator('.constellation-canvas').evaluate('(e)=>e.style.transform')
  q.locator('[data-tree-zoom=in]').click();assert q.locator('.constellation-canvas').evaluate('(e)=>e.style.transform')!=old
  box=vp.bounding_box();q.mouse.move(box['x']+25,box['y']+40);q.mouse.down();q.mouse.move(box['x']+80,box['y']+65,steps=5);q.mouse.up()
  q.locator('[data-tree-zoom=fit]').click();select(q,'asura')
  assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),(w,'horizontal overflow')
  q.locator('#dialogBody').evaluate('(e)=>e.scrollTop=0');q.screenshot(path=str(OUT/f'tree-{w}.png'))
  q.locator('#characterTabs [data-character-tab=achievements]').click();assert q.locator('[data-achievement-id]').count()==31
  assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
  q.screenshot(path=str(OUT/f'achievements-{w}.png'));q.locator('#characterTabs [data-character-tab=talents]').click()
 record('pan_zoom_focus_and_journal_five_resolutions')
 q.set_viewport_size(dict(width=1366,height=768));q.locator('#characterTabs [data-character-tab=achievements]').click()
 q.locator('[data-achievement-claim=kills-0]').click();assert diag(q)['talentPoints']==1 and claimed(q).count('kills-0')==1
 assert q.locator('[data-achievement-claim=kills-0]').is_disabled()
 q.locator('[data-achievement-category=fruit]').click();assert all(x.is_disabled() for x in q.locator('[data-achievement-claim]').all());assert 'Em breve' in q.locator('.achievement-journal').inner_text()
 q.locator('[data-achievement-category=wealth]').click()
 q.evaluate("()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-save-v1')throw Error('quota');return originalSet.call(this,k,v)}}")
 q.locator('[data-achievement-claim=coins-0]').click();assert 'coins-0' not in claimed(q) and diag(q)['talentPoints']==1
 q.evaluate('()=>{Storage.prototype.setItem=window.originalSet}')
 q.locator('[data-achievement-claim=coins-0]').click();assert diag(q)['talentPoints']==2
 q.locator('#characterTabs [data-character-tab=talents]').click();q.locator('[data-talent-reset]').click();q.locator('[data-confirm-accept]').click();assert diag(q)['talentPoints']==56
 assert set(claimed(q))=={'kills-0','coins-0'}
 q.locator('#closePanel').click();travel(q,'dawn');q.locator('#returnLobby').click();travel(q,'conchas');q.locator('#returnLobby').click();travel(q,'dawn');q.locator('#returnLobby').click()
 assert set(saved(q)['achievements']['records']['islands'])=={'dawn','conchas'}
 q.reload();q.wait_for_load_state('networkidle');assert diag(q)['talentPoints']==56
 record('manual_claim_unique_atomic_failure_reset_and_real_unique_visits');c.close()
 # All final builds follow the normal point budget, with 50 common points and 1 intermediate.
 pairs=[('brawler','titan'),('brawler','armamentSkin'),('brawler','immortal'),('sword','asura'),('sword','execution'),('sword','spatial'),('gunner','artillery'),('gunner','camouflage'),('gunner','ricochet'),('rogue','assassinMark'),('rogue','shadowClone'),('rogue','underworld'),('cyborg','overclock'),('cyborg','emp'),('cyborg','orbital'),('strategist','cataclysm'),('strategist','archmage'),('strategist','singularity'),('healer','eternalBlessing'),('healer','guardianAngel'),('healer','empathy')]
 if os.environ.get('MARE_CONSTELLATION_UI_ONLY'):pairs=[]
 for cls,u in pairs:
  g=copy.deepcopy(template);g.update(classId=cls,factionId='government',level=54,potions=0);g['equipment']['weapon']=None;g['equipment']['coat']=None
  g['stats'].update(kills=100,damage=0);g['talentVersion']=2;g['talentBuilds']={cls:{'nodes':{f'{cls}-2-{i}':10 for i in range(5)},'keystone':{'brawler':'concussion','sword':'wear','gunner':'longshot','rogue':'poison','cyborg':'energyShield','strategist':'echo','healer':'rejuvenation'}[cls],'ultimate':u}}
  c,q=page_for(b,g,errors=errors);assert diag(q)['talentPoints']==0,(u,saved(q)['talentBuilds'])
  travel(q);defensive=u in ['immortal','emp','guardianAngel','empathy'];q.evaluate('()=>{Math.random=()=>'+('.5' if defensive or u=='archmage' else '.001')+'}')
  if defensive:q.locator('#autoToggle').click()
  if u=='camouflage':
   q.locator('#autoToggle').click();q.clock.run_for(2500);assert diag(q)['talents']['ultimate']['hidden'];q.locator('#autoToggle').click()
  for _ in range(150 if defensive else 75):
   q.clock.run_for(1000);d=diag(q);rt=d['talents']['ultimate'];procs=rt['procs']
   if defensive and u=='empathy' and d['hp']<d['stats']['maxHP']*.7 and not d['autoPlay']:q.locator('#autoToggle').click()
   if u in ['immortal','emp','guardianAngel'] and procs.get(u,0)>0:break
   if u=='eternalBlessing' and rt['holyHP']>1:break
   if u=='empathy' and procs.get('empathy',0)>0:break
   if u not in ['immortal','emp','guardianAngel','empathy','eternalBlessing'] and d['damage']>0 and procs.get('attacks',0)>0 and (procs.get(u,0)>0 or u in ['spatial','underworld','overclock','archmage','armamentSkin','assassinMark']):break
  assert d['walkable'] and d['hp']>0,(u,d)
  if u in ['immortal','emp','guardianAngel','empathy']:assert procs.get(u,0)>0,(u,d)
  elif u=='eternalBlessing':assert rt['holyHP']>0,(u,d)
  else:assert d['damage']>0 and procs.get('attacks',0)>0,(u,d)
  if u=='armamentSkin':assert q.locator('#miniTalentResource').is_visible() and 'Vigor' in q.locator('#miniTalentLabel').inner_text()
  if u=='archmage':assert d['skillEnergySpent']==0 and sum(d['skillUses'])>0,(u,d)
  if u=='emp':assert any(m['emp']>0 for m in d['mobs'])
  if u in ['immortal','guardianAngel','emp']:
   key={'immortal':'immortalUntil','guardianAngel':'guardianUntil','emp':'empUntil'}[u];assert saved(q)['talentCooldowns'][key]>0
  if u=='underworld':
   q.locator('#returnLobby').click();assert any(it.get('origin')=='Senhor do Submundo' for it in saved(q)['inventory'])
  if u in ['orbital','shadowClone','eternalBlessing']:q.screenshot(path=str(OUT/(u+'-combat.png')))
  record('live_final_'+u);c.close()
 assert not errors,errors;b.close()
print(json.dumps({'groups':len(results),'screenshots':str(OUT),'errors':errors}))
