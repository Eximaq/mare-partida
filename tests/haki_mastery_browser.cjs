'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:1672,height:1086}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack)});
 const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
 const hook="  window.__hakiQA={get game(){return game},set game(v){game=v},get rt(){return session.haki},get world(){return world},get session(){return session},open:openPanel,close:closePanel,update:updateUI,save:saveGame,stats:getDerived,make:newItem,defs:itemDefs,travel:worldChange,port:returnLobby,attack:heroAttack,damage:takeDamage,spawn:devSpawn,initialize:initializeSession,draw:drawPlayerSprite,hakiScale:hakiVisualScale,get scene(){return scene},set auto(v){autoPlay=v;autoSkills=v},toggle:toggleHaki,cast:castHakiKing};window.__mareDiagnostics=";
 await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',hook)}));
 await page.goto(process.env.MARE_TEST_URL);await page.waitForFunction(()=>window.__hakiQA);
 await page.locator('#characterName').fill('Papacapim');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await page.waitForFunction(()=>__hakiQA.game);
 await page.clock.install({time:new Date('2026-11-01T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-01T12:00:01Z'));
 const frozen=await page.evaluate(()=>{const q=__hakiQA;q.game.level=50;q.game.inventory.push({...q.make(MareHaki.book),id:'qa-book'});q.update();return JSON.stringify({talents:q.game.talentBuilds,attributes:q.game.attributes,points:q.game.achievements.claimed,equipment:q.game.equipment});});
 await page.evaluate(()=>__hakiQA.open('inventory'));await page.locator('[data-item=qa-book]').click();await page.locator('[data-use-haki-book]').click();await page.locator('[data-confirm-accept]').click();
 assert.equal(await page.locator('.hm-node').count(),16);assert.equal(await page.locator('#characterTabs').count(),0);assert(await page.locator('[data-haki-invest=coating]').isDisabled());assert(await page.locator('[data-haki-toggle=armament]').last().isDisabled());
 assert.equal(await page.evaluate(()=>MareHakiProgression.held(__hakiQA.game)),false);
 await page.evaluate(()=>{const q=__hakiQA,P=MareHakiProgression;for(const b of P.ids)q.game=P.addFragments(q.game,b,100,q.defs,d=>q.make(d));q.save();q.open('haki');});

 await page.evaluate(()=>__hakiQA.open('inventory'));await page.locator('[data-inv-category=materials]').click();
 const materialIds=await page.evaluate(()=>__hakiQA.game.inventory.filter(i=>__hakiQA.defs[i.def]?.kind==='haki-fragment').map(i=>i.id));
 assert.equal(materialIds.length,3);
 for(const id of materialIds){assert((await page.locator('[data-item="'+id+'"]').textContent()).includes('100'));await page.locator('[data-item="'+id+'"]').click();assert((await page.locator('.op-detail-wrap').textContent()).includes('Material · Quantidade: 100'));assert.equal(await page.locator('.op-detail-wrap [data-equip]').count(),0);}
 await page.locator('[data-item="'+materialIds[0]+'"]').click();await page.locator('[data-inv-lock="'+materialIds[0]+'"]').click();
 await page.evaluate(()=>__hakiQA.open('haki'));assert(await page.locator('[data-haki-invest=coating]').isDisabled());
 await page.evaluate(()=>__hakiQA.open('inventory'));await page.locator('[data-item="'+materialIds[0]+'"]').click();await page.locator('[data-inv-lock="'+materialIds[0]+'"]').click();
 await page.evaluate(()=>__hakiQA.open('haki'));

 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
 const style=await page.locator('.hm-node').first().evaluate(e=>getComputedStyle(e).backgroundImage);assert(style.includes('workshop-surface.png'));
 const invest=async id=>{await page.locator('[data-haki-node="'+id+'"]').click();await page.locator('[data-haki-invest="'+id+'"]').click();await page.locator('[data-confirm-accept]').click();};
 await invest('coating');assert.equal(await page.evaluate(()=>MareHakiProgression.quantity(__hakiQA.game,'armament',__hakiQA.defs)),99);
 const beforeFail=await page.evaluate(()=>JSON.stringify(__hakiQA.game.haki.mastery));
 await page.evaluate(()=>{window.__realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-save-v1')throw Error('QA quota');return __realSet.call(this,k,v)}});
 await invest('coating');assert.equal(await page.evaluate(()=>JSON.stringify(__hakiQA.game.haki.mastery)),beforeFail);assert.equal(await page.evaluate(()=>MareHakiProgression.quantity(__hakiQA.game,'armament',__hakiQA.defs)),99);
 await page.evaluate(()=>Storage.prototype.setItem=__realSet);
 // A live stale confirmation must not spend after another validated investment.
 await page.locator('[data-haki-invest=coating]').click();
 await page.evaluate(()=>{const q=__hakiQA,r=MareHakiProgression.invest(q.game,'coating',q.game.haki.mastery.seq,q.defs,n=>{localStorage.setItem('mare-partida-save-v1',JSON.stringify(n));return true});q.game=r.state;});
 await page.locator('[data-confirm-accept]').click();assert.equal(await page.evaluate(()=>MareHakiProgression.rank(__hakiQA.game,'coating')),2);
 await invest('coating');
 for(const b of ['armament','observation','conqueror']){
  const nodes=await page.evaluate(b=>MareHakiProgression.branches[b].map(n=>({id:n.id,max:n.max})),b);
  for(const n of nodes){const rank=await page.evaluate(id=>MareHakiProgression.rank(__hakiQA.game,id),n.id);for(let i=rank;i<n.max;i++)await invest(n.id);}
  if(b==='armament'){assert((await page.locator('[data-haki-gate]').textContent()).includes('BLOQUEADO'));await page.locator('[data-haki-node=presence]').click();assert(await page.locator('[data-haki-invest=presence]').isDisabled());}
  if(b==='observation')assert((await page.locator('[data-haki-gate]').textContent()).includes('LIBERADO'));
 }
 assert.equal(await page.evaluate(()=>JSON.stringify({talents:__hakiQA.game.talentBuilds,attributes:__hakiQA.game.attributes,points:__hakiQA.game.achievements.claimed,equipment:__hakiQA.game.equipment})),frozen);
 assert.equal(await page.evaluate(()=>__hakiQA.rt.active),null);
 await page.locator('[data-haki-node=future]').click();await page.screenshot({path:process.env.MARE_QA_DIR+'/haki-tree.png'});
 await page.locator('.haki-disciplines').scrollIntoViewIfNeeded();await page.screenshot({path:process.env.MARE_QA_DIR+'/haki-controls.png'});
 const learnedSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('mare-partida-save-v1')));
 await page.reload();await page.waitForFunction(()=>window.__hakiQA?.game);assert.equal(await page.evaluate(()=>__hakiQA.rt.active),null);
 assert.equal(await page.evaluate(()=>__hakiQA.game.haki.mastery.seq),learnedSave.haki.mastery.seq);
 await page.evaluate(()=>__hakiQA.open('character','haki'));assert.equal(await page.locator('.haki-mastery').count(),1);
 await page.evaluate(()=>{const q=__hakiQA;q.travel('beach');q.auto=false;q.world.mobs=[];q.world.spawnClock=1000;q.game.hp=q.stats().maxHP;q.game.haki.current=100;q.game.haki.auto=null;q.update();});
 await page.evaluate(()=>__hakiQA.close());await page.keyboard.press('h');assert.equal(await page.evaluate(()=>__hakiQA.rt.active),'armament');
 await page.clock.runFor(1000);assert.equal(Math.round(await page.evaluate(()=>__hakiQA.game.haki.current)),95);
 await page.keyboard.press('j');assert.equal(await page.evaluate(()=>__hakiQA.rt.active),'observation');
 await page.keyboard.press('j');assert.equal(await page.evaluate(()=>__hakiQA.rt.active),null);
 await page.evaluate(()=>{const q=__hakiQA;q.game=MareHaki.configure(q.game,'armament',true);MareHaki.touch(q.game,q.rt);q.update();});assert.equal(await page.evaluate(()=>__hakiQA.rt.active),'armament');
 await page.clock.runFor(22000);assert.equal(await page.evaluate(()=>__hakiQA.rt.active),null); // combat expiry clears the continuous effect.
 await page.evaluate(()=>{const q=__hakiQA;q.game.haki.current=100;q.game.haki.auto=null;MareHaki.stop(q.rt);q.toggle('armament');q.port();});assert.equal(await page.evaluate(()=>__hakiQA.rt.active),null);
 await page.evaluate(()=>{const q=__hakiQA;q.travel('beach');q.auto=false;q.world.mobs=[];q.world.spawnClock=1000;q.game.haki.current=100;q.game.haki.auto=null;q.game.haki.kingReadyAt=0;q.update();q.close();});
 await page.keyboard.press('k');assert.equal(await page.evaluate(()=>__hakiQA.game.haki.current),50);assert(await page.evaluate(()=>__hakiQA.rt.kingFX>0));await page.clock.runFor(900);assert.equal(await page.evaluate(()=>__hakiQA.rt.kingFX),0);
 // Actual player compositor and actual exported effect renderer, all four facings.
 await page.waitForFunction(()=>Object.values(MareHakiArt.stats()).length===3&&Object.values(MareHakiArt.stats()).every(i=>i.loaded));
 await page.evaluate(()=>{const q=__hakiQA;MareHaki.stop(q.rt);q.toggle('armament');});await page.clock.runFor(50);await page.screenshot({path:process.env.MARE_QA_DIR+'/haki-live-map.png'});
 for(const gender of ['masculino','feminino']){
  await page.evaluate(gender=>{const q=__hakiQA;q.game=MareCharacterAppearance.apply(q.game,{...MareCharacterAppearance.read(q.game),gender});q.update();},gender);
  await page.clock.runFor(100);
  for(let attempt=0;attempt<50;attempt++){const ready=await page.evaluate(()=>{const q=__hakiQA,c=document.createElement('canvas').getContext('2d');return ['south','north','east','west'].map(d=>{q.world.hero.direction=d;return q.draw(c,0,0)}).every(Boolean)});if(ready)break;await page.clock.runFor(100);await page.waitForTimeout(100);if(attempt===49)throw Error('Directional sprites did not load: '+gender);}
  await page.waitForTimeout(200);
  for(const id of ['armament','observation','conqueror']){
   await page.evaluate(id=>{
    document.getElementById('qa-effects')?.remove();const out=document.createElement('canvas');out.id='qa-effects';out.width=id==='conqueror'?1600:1120;out.height=id==='conqueror'?400:340;out.style.cssText='position:fixed;z-index:100000;left:0;top:0;background:#100d12';document.body.append(out);
    const c=out.getContext('2d'),q=__hakiQA,dirs=['south','north','east','west'];c.fillStyle='#100d12';c.fillRect(0,0,out.width,out.height);c.font='18px Georgia';c.fillStyle='#f3d9a4';
    for(let i=0;i<4;i++){q.world.hero.direction=dirs[i];q.world.hero.walking=0;q.world.hero.attackAnim=0;const cell=id==='conqueror'?400:280,scale=id==='conqueror'?1.3:2.3;c.fillText(id+' · '+dirs[i],i*cell+25,28);c.save();c.translate(i*cell+cell/2,275);c.scale(scale,scale);q.draw(c,0,0);MareHakiArt.draw(c,{active:id==='conqueror'?null:id,eyeFX:1,kingFX:id==='conqueror'?.55:0},{x:0,y:0,direction:dirs[i]},.4,false,(mask,x,y)=>q.draw(mask,x,y),1);c.restore();}
   },id);
   await page.locator('#qa-effects').screenshot({path:process.env.MARE_QA_DIR+'/effects-'+gender+'-'+id+'.png'});
   await page.evaluate(()=>document.getElementById('qa-effects').remove());
  }
 }

 const previousFruit=await page.evaluate(()=>__hakiQA.game.equipment.akuma_no_mi);
 await page.evaluate(()=>{const q=__hakiQA,def=q.defs.find(d=>d.fruitId===MareRankS.rules.phoenix.id);q.game.equipment.akuma_no_mi=q.make(def);q.game.zoanTransformed=true;q.update();});
 for(let attempt=0;attempt<50;attempt++){const ready=await page.evaluate(()=>{const q=__hakiQA,c=document.createElement('canvas').getContext('2d');return ['south','north','east','west'].map(d=>{q.world.hero.direction=d;return q.draw(c,0,0)}).every(Boolean)});if(ready)break;await page.clock.runFor(100);await page.waitForTimeout(100);if(attempt===49)throw Error('Phoenix sprites not ready');}
 await page.evaluate(()=>{
  const out=document.createElement('canvas');out.id='qa-phoenix';out.width=1600;out.height=430;out.style.cssText='position:fixed;z-index:100000;left:0;top:0;background:#100d12';document.body.append(out);const c=out.getContext('2d'),q=__hakiQA;
  c.fillStyle='#100d12';c.fillRect(0,0,out.width,out.height);c.font='18px Georgia';c.fillStyle='#f3d9a4';
  for(let i=0;i<4;i++){const direction=['south','north','east','west'][i];q.world.hero.direction=direction;c.fillText('Fênix + Armamento · '+direction,i*400+25,28);c.save();c.translate(i*400+200,350);MareRankS.drawAura(c,MareRankS.rules.phoenix.id,0,0,.4,1,'back');q.draw(c,0,0);MareRankS.drawAura(c,MareRankS.rules.phoenix.id,0,0,.4,1,'front');MareHakiArt.draw(c,{active:'armament',eyeFX:0,kingFX:0},{x:0,y:0,direction},.4,false,(mask,x,y)=>q.draw(mask,x,y),q.hakiScale());c.restore();}
 });
 await page.locator('#qa-phoenix').screenshot({path:process.env.MARE_QA_DIR+'/effects-phoenix.png'});await page.evaluate(fruit=>{document.getElementById('qa-phoenix').remove();const q=__hakiQA;q.game.equipment.akuma_no_mi=fruit;q.game.zoanTransformed=false;q.update();},previousFruit);

 await page.evaluate(()=>{const q=__hakiQA;q.game.hp=10;q.game.haki.current=100;q.toggle('armament');q.damage(999999,null,true,true);});assert.equal(await page.evaluate(()=>__hakiQA.rt.active),null);
 // Responsive page is the real modal, with scrolling and reachable close/controls.
 const layouts=[];
 for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[1024,768],[393,852],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>__hakiQA.open('haki'));await page.waitForTimeout(80);
  const l=await page.evaluate(()=>{const b=document.querySelector('#dialogBody'),r=document.querySelector('#closePanel').getBoundingClientRect();return {overflow:b.scrollWidth>b.clientWidth+2,close:r.right>innerWidth||r.top<0,w:b.clientWidth,sw:b.scrollWidth}});
  assert(!l.overflow,JSON.stringify({width,l}));assert(!l.close);layouts.push({width,height,...l});
  await page.screenshot({path:process.env.MARE_QA_DIR+'/page-'+width+'x'+height+'.png'});
 }

 if(process.env.MARE_HAKI_FAST!=='1'){
 // A sustained real expedition, followed by frame-duration measurement in the same renderer.
 await page.evaluate(()=>{const q=__hakiQA;q.game.hp=q.stats().maxHP;q.game.attributes.strength=200;q.game.attributes.vitality=45;q.travel('beach');q.game.hp=q.stats().maxHP;q.auto=true;});
 await page.clock.runFor(60000);if(await page.evaluate(()=>__hakiQA.game.stats.kills)<20)await page.clock.runFor(60000);
 const kills=await page.evaluate(()=>__hakiQA.game.stats.kills);assert(kills>=20,'sustained hunt kills: '+kills);
 await page.evaluate(()=>{const q=__hakiQA;q.auto=false;q.close();q.world.mobs=[];q.world.fx=[];q.world.projectiles=[];q.world.spawnClock=1000;q.session.respawn=0;q.game.hp=q.stats().maxHP;q.game.haki.auto=null;q.game.haki.current=100;MareHaki.stop(q.rt);});

 // Performance uses a fresh page with the browser's native RAF, not the accelerated test clock.
 const nativePage=await browser.newPage({viewport:{width:1672,height:1086}});
 await nativePage.addInitScript(save=>localStorage.setItem('mare-partida-save-v1',JSON.stringify(save)),learnedSave);
 await nativePage.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',hook)}));
 await nativePage.goto(process.env.MARE_TEST_URL);await nativePage.waitForFunction(()=>window.__hakiQA?.game);
 await nativePage.evaluate(()=>{const q=__hakiQA;q.travel('beach');q.auto=false;q.world.mobs=[];q.world.fx=[];q.world.projectiles=[];q.world.spawnClock=1000;q.game.hp=q.stats().maxHP;q.game.haki.auto=null;q.game.haki.current=100;MareHaki.stop(q.rt);q.close();});
 await nativePage.waitForFunction(()=>Object.keys(MareHakiArt.stats()).length===3&&Object.values(MareHakiArt.stats()).every(x=>x.loaded));await nativePage.waitForTimeout(500);

 const performanceMatrix=await nativePage.evaluate(async()=>{
  const q=__hakiQA,rows=[],canvasCount=document.querySelectorAll('canvas').length;
  for(const phase of ['baseline','armament','observation','conqueror']){
   MareHaki.stop(q.rt);q.game.haki.current=100;if(phase==='armament'||phase==='observation')MareHaki.toggle(q.game,q.rt,phase);if(phase==='observation')q.rt.eyeFX=10;if(phase==='conqueror')q.rt.kingFX=.8;
   const times=[];await new Promise(resolve=>{let start=0,last=0;function frame(t){if(!start)start=t;if(last)times.push(t-last);last=t;if(t-start<2500)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});
   times.sort((a,b)=>a-b);const at=p=>+times[Math.floor((times.length-1)*p)].toFixed(2);rows.push({phase,frames:times.length,p50:at(.5),p95:at(.95),p99:at(.99),max:at(1)});
  }
  MareHaki.stop(q.rt);return {rows,canvasCount,canvasAfter:document.querySelectorAll('canvas').length,loadedEffects:MareHakiArt.stats(),entities:{mobs:q.world.mobs.length,fx:q.world.fx.length,projectiles:q.world.projectiles.length}};
 });
 assert.equal(performanceMatrix.canvasAfter,performanceMatrix.canvasCount);assert.equal(Object.keys(performanceMatrix.loadedEffects).length,3);
 await nativePage.close();
 fs.writeFileSync(process.env.MARE_QA_DIR+'/performance.json',JSON.stringify({kills, ...performanceMatrix},null,2));
 }

 await page.setViewportSize({width:1672,height:1086});
 await page.evaluate(()=>{const q=__hakiQA;q.game.haki={version:1,unlocked:true,current:55,auto:'armament'};q.game.has_haki_unlocked=true;q.save();});await page.reload();await page.waitForFunction(()=>window.__hakiQA?.game);assert(await page.evaluate(()=>MareHakiProgression.held(__hakiQA.game)));
 assert(await page.evaluate(()=>!!localStorage.getItem('mare-partida-save-v1-before-haki-mastery-v1')));await page.evaluate(()=>__hakiQA.open('haki'));assert(await page.locator('.hm-migration').isVisible());assert(await page.locator('[data-haki-invest]').isDisabled());
 fs.writeFileSync(process.env.MARE_QA_DIR+'/browser-results.json',JSON.stringify({layouts,errors,progression:learnedSave.haki.mastery,checks:'book, real investment, quota rollback, stale confirmation, full gate, persisted ranks, independent class points, H/J/K, exclusivity, auto, drain, combat expiry, port, death, old-save hold and four facings'},null,2));
 assert.deepEqual(errors,[]);console.log('Haki browser functional and visual matrix passed',layouts);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
