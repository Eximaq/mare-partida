'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
let source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
source=source.replace('  window.__mareDiagnostics=','  window.__alubarnaQA={paused:false,returnLobby,saveGame,draw:drawWorld,combatHudBox,outputDamage,get game(){return game},get world(){return world},nav:navigator,stats:getDerived,stop(){autoPlay=false;autoSkills=false},start(){autoPlay=true;autoSkills=false},step(dt){this.paused=false;try{tick(dt)}finally{this.paused=true}},center(){camera.update(world.hero,activeMap(),0,true)}};'+String.fromCharCode(10)+'  window.__mareDiagnostics=').replace('function tick(dt){','function tick(dt){if(window.__alubarnaQA?.paused)return;');
const expected={puppu:110,merry:120,valentine:135,doublefinger:150,mr1:170};
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/alubarna|sprites-combat-v2\/(puppu|merry|valentine|doublefinger|mr1)/.test(r.url()))missing.push(r.url());});
 await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
 await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8162/',{waitUntil:'networkidle'});
 await page.locator('#characterName').fill('Alubarna QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await page.evaluate(()=>{__alubarnaQA.paused=true;__alubarnaQA.stop();});
 const openMap=async()=>{await page.locator('#mainMenu [data-panel=modes]').click();await page.locator('[data-quick-mode=map]').click();};
 await openMap();await page.locator('[data-voyage-region=alabasta]').click();assert.equal(await page.locator('[data-island]').count(),6);
 await page.locator('[data-island=alubarna-01]').click();assert(await page.locator('[data-travel-area=alubarna-01]').isDisabled(),'level gate visible in actual UI');
 await page.locator('[data-voyage-region=skypiea]').click();assert.equal(await page.locator('[data-island]').count(),0);assert((await page.locator('.voyage-empty').innerText()).includes('em breve'));
 const out=process.env.MARE_QA_DIR||path.join(__dirname,'../docs/evidence-alubarna');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'skypiea.png')});await page.locator('#closePanel').click();
 await page.evaluate(()=>{const q=__alubarnaQA;q.game.level=80;q.game.attributes.strength=50000;q.game.attributes.vitality=10000;});
 await page.waitForFunction(()=>MareAlubarna.image.complete&&MareAlubarna.image.naturalWidth===6592);
 for(const key of Object.keys(expected)){await page.evaluate(k=>MareSpriteCombatV2.preload(k),key);await page.waitForFunction(k=>Object.entries(MareSpriteCombatV2Data[k].clips).every(([a,ds])=>Object.keys(ds).every(d=>MareSpriteCombatV2.status(k,a,d)==='ready')),key);}
 const scales=await page.evaluate(()=>{
  const q=__alubarnaQA,canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;const c=canvas.getContext('2d'),draw=c.drawImage.bind(c),calls=[];c.drawImage=(im,...a)=>{calls.push(im.src);draw(im,...a);};const result=[];
  for(const key of ['puppu','merry','valentine','doublefinger','mr1'])for(const direction of ['south','north','west','east']){
   const m={type:key,x:300,y:500,hp:10000,maxHP:10000,alive:true,emberFacing:direction,moving:0,attackAnim:0};c.clearRect(0,0,600,600);MareNewIslandArt.monster(c,m,q.world.time);
   const a=c.getImageData(0,0,600,600).data;let x0=600,x1=0,y0=600,y1=0;for(let y=0;y<600;y++)for(let x=0;x<600;x++)if(a[(y*600+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
   m.moving=1;MareNewIslandArt.monster(c,m,q.world.time+.2);const walk=calls.at(-1);m.moving=0;m.attackAnim=.58;MareNewIslandArt.monster(c,m,q.world.time);const attack=calls.at(-1);
   q.outputDamage(m,7);MareNewIslandArt.monster(c,m,q.world.time);const hurt=calls.at(-1),hp=m.hp;MareNewIslandArt.monster(c,m,q.world.time);result.push({key,direction,width:x1-x0+1,height:y1-y0+1,top:y0,barBottom:q.combatHudBox(m).barY+7,walk,attack,hurt,hp,same:m.hp===hp});
  }return result;
 });
 for(const r of scales){assert(Math.abs(Math.max(r.width,r.height)-expected[r.key])<=2,JSON.stringify(r));assert(r.barBottom<r.top);assert(new URL(r.walk).pathname.endsWith('/walk-'+r.direction+'.png'));assert(new URL(r.attack).pathname.endsWith('/attack-'+r.direction+'.png'));assert(new URL(r.hurt).pathname.endsWith('/hurt-south.png'));assert.equal(r.hp,9993);assert.equal(r.same,true);}
 await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.id='new-monsters';canvas.width=1300;canvas.height=400;Object.assign(canvas.style,{position:'fixed',top:0,left:0,zIndex:99999,background:'#25303b'});document.body.append(canvas);const c=canvas.getContext('2d');for(const [i,k]of ['puppu','merry','valentine','doublefinger','mr1'].entries()){MareNewIslandArt.monster(c,{type:k,x:130+i*260,y:300,alive:true,emberFacing:'south'},100);c.fillStyle='white';c.font='18px sans-serif';c.fillText(k,60+i*260,335);}});
 await page.locator('#new-monsters').screenshot({path:path.join(out,'monster-scales.png')});await page.evaluate(()=>document.querySelector('#new-monsters').remove());
 const visits=[];
 for(const [id,type,level]of [['alubarna-01','puppu',53],['alubarna-02','valentine',58],['alubarna-03','merry',63],['alubarna-04','doublefinger',68],['alubarna-05','mr1',75]]){
  await openMap();await page.locator('[data-voyage-region=alabasta]').click();await page.locator('[data-island='+id+']').click();assert.equal(await page.locator('.dungeon-monster-name').count(),1);await page.locator('[data-travel-area='+id+']').click();
  const initial=await page.evaluate(()=>{const q=__alubarnaQA;q.stop();q.paused=true;q.game.hp=q.stats().maxHP;return {area:q.game.area,map:__mareDiagnostics().map.id,spawn:q.nav().walkable(q.world.hero.x,q.world.hero.y),mobs:q.world.mobs.map(m=>({type:m.type,level:m.level})),routes:q.world.mobs.every(m=>q.nav().path(q.world.hero,m).length>0)};});
  assert.equal(initial.area,id);assert.equal(initial.map,id);assert(initial.spawn&&initial.routes);assert.equal(initial.mobs.length,10);assert(initial.mobs.every(m=>m.type===type&&m.level===level));
  const combat=await page.evaluate(()=>{const q=__alubarnaQA,before={kills:q.game.stats.kills,xp:q.game.xp,gold:q.game.gold},clock=Date.now;let elapsed=0;Date.now=()=>clock()+elapsed;q.start();let ticks=0;for(;ticks<6000&&q.game.stats.kills-before.kills<5;ticks++){elapsed+=50;q.step(.05);}Date.now=clock;q.stop();return {kills:q.game.stats.kills-before.kills,xp:q.game.xp-before.xp,gold:q.game.gold-before.gold,ticks};});
  assert(combat.kills>=5,JSON.stringify({id,combat}));assert(combat.xp>0&&combat.gold>0);
  await page.evaluate(()=>{const q=__alubarnaQA,d=MareAlubarna.worlds[q.game.area].districts[2],route=q.nav().path(q.world.hero,d);for(let i=0;route.length&&i<10000;i++)q.nav().follow(q.world.hero,route,300,.1);if(Math.hypot(q.world.hero.x-d.x,q.world.hero.y-d.y)>2)throw Error('Cannot walk to city square');q.center();q.draw();});
  await page.screenshot({path:path.join(out,id+'.png')});visits.push({id,...combat});await page.evaluate(()=>__alubarnaQA.returnLobby());
 }
 for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[390,844]]){await page.setViewportSize({width,height});await openMap();await page.locator('[data-voyage-region=alabasta]').click();await page.screenshot({path:path.join(out,'alabasta-tab-'+width+'.png')});await page.locator('#closePanel').click();}
 await page.evaluate(()=>__alubarnaQA.saveGame());await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>__alubarnaQA.game);const saved=await page.evaluate(()=>({area:__alubarnaQA.game.area,progress:Object.fromEntries(MareAlubarna.specs.map(s=>[s.id,__alubarnaQA.game.hunts.areas[s.id].kills]))}));assert.equal(saved.area,'alubarna-05');assert(Object.values(saved.progress).every(n=>n>=5));
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log(JSON.stringify({passed:true,scales:scales.map(({key,direction,width,height})=>({key,direction,width,height})),visits,saved}));await context.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
