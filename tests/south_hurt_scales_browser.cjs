'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
let source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
source=source.replace('  window.__mareDiagnostics=',`  window.__hurtScaleQA={paused:false,enterHunt,outputDamage,receiveEnemyAttack,takeDamage,cancelBasicAttack,combatHudBox,combatActorHeight,drawPlayerSpriteBase,syncFruitVfx,get game(){return game},get session(){return session},get world(){return world},get defs(){return itemDefs},stats:getDerived,stop(){autoPlay=false;autoSkills=false}};\n  window.__mareDiagnostics=`).replace('function tick(dt){','function tick(dt){if(window.__hurtScaleQA?.paused)return;');
// Literal targets derived from the released opaque heights and the owner's requested increases.
const targets={marinheiro:150,hoya:126,mr3:112.5,cabaji:112.5,kuroobi:122.85,chew:105.3,buchi:145.125,sham:99.9,gin:99.9,pearl:132.3};
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/sprites-combat-v2/'))failed.push(r.url());});
 await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
 await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8162/',{waitUntil:'networkidle'});
 await page.locator('#characterName').fill('Hurt Escala QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
 await page.evaluate(()=>{const q=__hurtScaleQA;q.enterHunt();q.stop();q.paused=true;});
 // Load one character at a time, as equip does, without flooding the local HTTP fixture.
 for(const key of await page.evaluate(()=>Object.keys(MareSpriteCombatV2Data))){
  await page.evaluate(key=>MareSpriteCombatV2.preload(key),key);
  await page.waitForFunction(key=>Object.entries(MareSpriteCombatV2Data[key].clips).every(([a,ds])=>Object.keys(ds).every(d=>MareSpriteCombatV2.status(key,a,d)==='ready')),key,{timeout:15000}).catch(async e=>{console.error('Unavailable character:',key,await page.evaluate(key=>Object.entries(MareSpriteCombatV2Data[key].clips).flatMap(([a,ds])=>Object.keys(ds).map(d=>({a,d,status:MareSpriteCombatV2.status(key,a,d)}))).filter(x=>x.status!=='ready'),key));throw e;});
 }
 const result=await page.evaluate(targets=>{
  const q=__hurtScaleQA,S=MareSpriteCombatV2,canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;const c=canvas.getContext('2d'),native=c.drawImage.bind(c),calls=[];
  c.drawImage=(im,...args)=>{calls.push({url:im.src,frame:args[0]/args[2],size:args[6]});native(im,...args);};
  const bounds=()=>{const a=c.getImageData(0,0,640,640).data;let top=640,bottom=-1;for(let y=0;y<640;y++)for(let x=0;x<640;x++)if(a[(y*640+x)*4+3]){top=Math.min(top,y);bottom=Math.max(bottom,y);}return {top,height:bottom-top+1};};
  const rows=[];q.world.time=10;
  for(const key of Object.keys(targets))for(const direction of ['south','north','west','east']){
   const m=key==='hoya'?MareHoya.create(q.stats(),320,550,q.world.time):{type:key,x:320,y:550,alive:true,hp:10000,maxHP:10000,moving:0,attackAnim:0,bob:0,emberFacing:direction};
   if(key==='hoya'){const id='akuma_hoya_hoya';q.game.equipment.akuma_no_mi={id:'hoya-qa',def:q.defs.findIndex(d=>d.fruitId===id),fruitId:id,plus:0,level:1};q.game.hp=q.stats().maxHP;q.session.genie=m;m.direction=direction;}
   const render=()=>key==='hoya'?MareHoya.drawActor(c,m,q.world.time):MareNewIslandArt.monster(c,m,q.world.time);
   c.clearRect(0,0,640,640);render();const b=bounds(),logical=q.combatActorHeight(m),barBottom=q.combatHudBox(m).barY+7;
   const baselineSize=calls.at(-1).size;
   const actions=[];
   for(const action of ['walk','attack']){if(key==='hoya'){m.walking=action==='walk'?1:0;if(action==='attack')m.clock.play('attack',{direction});}else{m.moving=action==='walk'?1:0;m.attackAnim=action==='attack'?.3:0;}render();actions.push({action,...calls.at(-1),expectedSize:baselineSize*S.resolve(key,action,direction).clip.size/S.resolve(key,'idle',direction).clip.size});}
   // Actual damage event on monsters; summons have the same reaction timestamp API.
   const before=m.hp;if(key==='hoya')q.receiveEnemyAttack(m,7,null);else q.outputDamage(m,7);
   const hp=m.hp;c.clearRect(0,0,640,640);render();const hurt=calls.at(-1);render();
   rows.push({key,direction,...b,logical,barBottom,hurt,actions,damage:before-hp,sameHP:m.hp===hp,facing:key==='hoya'?m.direction:m.emberFacing});
  }
  const reactions=[];
  for(const key of Object.keys(MareSpriteCombatV2Data))for(const direction of ['south','north','west','east']){
   calls.length=0;S.draw(c,key,320,550,{action:'hurt',direction,progress:.5,height:100});reactions.push({key,direction,...calls.at(-1)});
  }
  const players=[];
  for(const [id,key]of Object.entries(S.fruits))for(const direction of ['front','back','left','right']){
   q.cancelBasicAttack();q.game.equipment.akuma_no_mi={id:'hurt-'+id,def:q.defs.findIndex(d=>d.fruitId===id),fruitId:id,plus:0,level:1};q.game.zoanTransformed=true;q.syncFruitVfx();q.session.zoanTransition=null;q.session.respawn=0;q.session.fruitInvulnerable=0;q.world.hero.direction=direction;q.world.hero.walking=0;q.game.hp=q.stats().maxHP;q.world.time+=1;
   const hp=q.game.hp;q.takeDamage(5,null,false,true);q.drawPlayerSpriteBase(c,320,550);const hurt=calls.at(-1).url;q.world.time+=.181;q.drawPlayerSpriteBase(c,320,550);players.push({key,direction,hurt,after:calls.at(-1).url,damage:hp-q.game.hp,facing:q.world.hero.direction});
  }
  const attacks=[];for(const direction of ['south','north','west','east']){calls.length=0;MareNewIslandArt.monster(c,{type:'kuroobi',x:320,y:550,alive:true,attackAnim:.3,emberFacing:direction},q.world.time);attacks.push({direction,...calls.at(-1)});}
  const g=MareHoya.create(q.stats(),320,550,q.world.time);q.session.genie=g;g.scale=MareHoya.rules.buffScale;c.clearRect(0,0,640,640);MareHoya.drawActor(c,g,q.world.time);const empowered={...bounds(),scale:g.scale,barBottom:q.combatHudBox(g).barY+7};
  return {rows,reactions,attacks,players,empowered};
 },targets);
 for(const row of result.rows){assert.ok(Math.abs(row.height-targets[row.key])<=2,JSON.stringify(row));assert.ok(row.barBottom<row.top,JSON.stringify(row)+' header above sprite');assert.ok(row.hurt.url.endsWith('/'+row.key+'/hurt-south.png'));assert.equal(row.facing,row.direction);assert.equal(row.sameHP,true);if(row.key!=='hoya')assert.equal(row.damage,7);else assert.ok(row.damage>0);for(const a of row.actions){assert.ok(a.url.endsWith('/'+row.key+'/'+a.action+'-'+row.direction+'.png'));assert.ok(Math.abs(a.size-a.expectedSize)<=2,'same proportional scale across actions');}}
 for(const r of result.reactions)assert.ok(r.url.endsWith('/'+r.key+'/hurt-south.png'),JSON.stringify(r));
 for(const p of result.players){assert.ok(p.hurt.endsWith('/'+p.key+'/hurt-south.png'),JSON.stringify(p));assert.ok(!p.after.includes('/hurt-'));assert.equal(p.damage,5);assert.equal(p.facing,p.direction);}
 for(const a of result.attacks)assert.ok(a.url.endsWith('/kuroobi/attack-'+a.direction+'.png'),JSON.stringify(a));
 assert.ok(Math.abs(result.empowered.height-126*result.empowered.scale)<=2);assert.ok(result.empowered.barBottom<result.empowered.top);
 if(process.env.MARE_QA_DIR){fs.mkdirSync(process.env.MARE_QA_DIR,{recursive:true});await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.id='hurt-gallery';canvas.width=1280;canvas.height=1800;Object.assign(canvas.style,{position:'absolute',top:0,left:0,zIndex:99999,background:'#25303c'});document.body.append(canvas);const c=canvas.getContext('2d'),q=__hurtScaleQA;for(const [i,key]of ['marinheiro','hoya','mr3','cabaji','kuroobi','chew','buchi','sham','gin','pearl'].entries()){for(const [j,direction]of ['south','north','west','east'].entries()){const x=160+j*320,y=230+i*155;c.fillStyle='white';c.font='14px sans-serif';c.fillText(key+' / '+direction,x-100,y+22);if(key==='hoya'){const g=MareHoya.create(q.stats(),x,y,q.world.time);g.direction=direction;MareHoya.drawActor(c,g,q.world.time);}else MareNewIslandArt.monster(c,{type:key,x,y,alive:true,emberFacing:direction},q.world.time);}}});await page.locator('#hurt-gallery').screenshot({path:path.join(process.env.MARE_QA_DIR,'world-scales.png')});await page.evaluate(()=>document.querySelector('#hurt-gallery').remove());for(const [width,height]of [[1366,768],[390,844]]){await page.setViewportSize({width,height});await page.screenshot({path:path.join(process.env.MARE_QA_DIR,'game-'+width+'.png')});}}
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log(JSON.stringify(result.rows.map(({key,direction,height,logical})=>({key,direction,height,logical}))));console.log('40 world scales/headers, 84 South Hurt draws, four Kuroobi attacks and effective damage passed.');await context.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
