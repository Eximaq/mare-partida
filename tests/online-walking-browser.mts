// Isolated PostgreSQL and real battle worker; fixture identity only, no hosted accounts.
import {createSimulationPool} from '../apps/game-server/src/simulation-pool.js';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {authDatabase} from './integration/auth-support.mjs';
import {createHttpServer} from '../apps/game-server/src/http.js';
import {createAuthHandler} from '../apps/game-server/src/auth/routes.js';
import {createDevGateway} from '../tools/dev-gateway.mjs';
declare global {var MareGameSession:any;var __mareDiagnostics:any;}
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||'tmp/online-walking';await mkdir(out,{recursive:true});
await authDatabase(async f=>{
 const handler=createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9445',cookieSeconds:3600});
 const api=createHttpServer({isReady:async()=>true,handle:handler});api.listen(0,'127.0.0.1');await once(api,'listening');
 const gateway=createDevGateway({key:await readFile('infra/local/localhost.key','utf8'),cert:await readFile('infra/local/localhost.crt','utf8'),staticRoot:resolve(process.env.MARE_QA_STATIC_ROOT||'dist'),onlineRoot:resolve('apps/account-client'),upstream:new URL(`http://127.0.0.1:${(api.address() as any).port}`)});
 let simulations:any;let browser:any,context:any;const errors:string[]=[];
 try{
  gateway.listen(9445,'127.0.0.1');await once(gateway,'listening');browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});context=await browser.newContext({viewport:{width:1366,height:900}});const p=await context.newPage();p.on('dialog',async(d:any)=>{assert.equal(d.type(),'confirm');assert.match(d.message(),/Este personagem está sob controle/);await d.accept();});p.on('pageerror',(e:any)=>errors.push(e.stack||e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-final-acceptance'));
  await p.route(/^https?:\/\/(?!localhost:9445\/)/,(r:any)=>r.abort());
  p.on('framenavigated',(frame:any)=>{if(frame===p.mainFrame())console.log(JSON.stringify({navigation:new URL(frame.url()).pathname}));});
  let blockedDepth=0;
  await p.route('**/assets/map-depth/objects/export-14436f8b05ddc40898b1f60d.png',(r:any)=>{
   blockedDepth++;
   return r.abort();
  });
  await p.goto('https://localhost:9445/online/');await p.locator('#email').fill('acceptance@example.invalid');await p.locator('#password').fill('Fixture password only 123');await p.locator('#login-submit').click();await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#classStep [data-class=sword]').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
  await p.waitForFunction(()=>document.querySelector('.online-boot-error')||(globalThis.MareGameSession?.data?.online?.battle&&globalThis.__mareDiagnostics?.().map.navigation.ready));
  assert.ok(blockedDepth>0,'the test must block an optional object mask');
  assert.equal(await p.locator('.online-boot-error').count(),0,'a missing optional object mask must not block entry to the port');
  await p.waitForFunction(()=>globalThis.__mareDiagnostics().lobby96.visualState==='ready',null,{timeout:90000});


  simulations=createSimulationPool({databaseUrl:f.pool.options.connectionString!,counts:{solo:2,party:1},workerUrl:new URL('../apps/game-server/dist/simulation-worker.js',import.meta.url)});await simulations.start();
  await p.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);
  await p.evaluate(()=>MareGameSession.command('world.travel',{islandId:'dawn'}));
  await p.waitForFunction(()=>__mareDiagnostics().map.id==='dawn'&&__mareDiagnostics().map.navigation.ready);
  await p.waitForTimeout(2000);
  await p.waitForFunction(()=>/Ping HTTP: \d+ ms.*FPS: \d+/.test(document.querySelector('#onlinePerformance')?.textContent||''));
  await p.evaluate(()=>{const original=globalThis.MareEmberRenderer.monster;globalThis.monsterProbe=[];globalThis.MareEmberRenderer.monster=function(ctx,m,...args){if(m.alive)globalThis.monsterProbe.push({id:m.id,x:m.x,y:m.y,moving:m.moving,phase:m.emberElapsed});return original.call(this,ctx,m,...args);};});
  assert.equal(await p.evaluate(()=>Number.isFinite(__mareDiagnostics().onlineSampledAt)),true,'motion probes need the time associated with the drawn pose');
  let compactReads=0;p.on('response',r=>{if(r.url().endsWith('/frame')&&r.status()===200)compactReads++;});
  const captures=[];
  for(const mapId of ['lobby','dawn']){
   await p.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);
   await p.evaluate(id=>MareGameSession.command(id==='lobby'?'world.return':'world.travel',id==='lobby'?{}:{islandId:'dawn'}),mapId);
   await p.waitForFunction(id=>__mareDiagnostics().map.id===id&&__mareDiagnostics().map.navigation.ready,mapId);
   await p.waitForTimeout(1000);
   const screen=await p.evaluate(()=>{const d=__mareDiagnostics(),r=document.querySelector('#worldCanvas').getBoundingClientRect();return {x:d.hero.x,y:d.hero.y,camera:d.camera,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};});
   const nav=require('../world-catalog.cjs').load().navigation(mapId);
   let target:any;
   for(const [dx,dy] of [[0,-280],[300,0],[-300,0],[0,280],[200,-250],[220,-120],[-200,-140],[140,150]]){
    const q={x:screen.x+dx,y:screen.y+dy};if(!nav.walkable(q.x,q.y)||!nav.path(screen,q).length)continue;
    const free=await p.evaluate(q=>{const d=__mareDiagnostics(),c=d.camera,r=document.querySelector('#worldCanvas').getBoundingClientRect(),x=r.x+(q.x-Math.round(c.x))*r.width/c.width,y=r.y+(q.y-Math.round(c.y))*r.height/c.height;return document.elementFromPoint(x,y)?.id==='worldCanvas'&&!d.mobs.some(m=>Math.hypot(m.x-q.x,m.y-30-q.y)<55)&&(d.scene!=='lobby'||!d.npcs.some(n=>Math.hypot(n.x-q.x,n.y-30-q.y)<55));},q);
    if(free){target=q;break;}
   }
   assert(target);
   await p.route('**/v1/**',async(r:any)=>{try{await new Promise(resolve=>setTimeout(resolve,250));await r.continue();}catch{errors.push('delayed_request_failed');}});
   await p.evaluate(`window.motion=[];window.captureMotion=true;function capture(t){if(!window.captureMotion)return;const d=__mareDiagnostics(),s=MareGameSession.data.online;window.motion.push({t:d.onlineSampledAt,x:d.hero.x,y:d.hero.y,world:s.world,auto:s.battle.auto,stats:{manual:d.stats.moveSpeed,auto:d.stats.huntSpeed}});requestAnimationFrame(capture)}requestAnimationFrame(capture);`);
   const canvas=await p.locator('#worldCanvas').boundingBox();
   await p.evaluate(()=>document.querySelector('#worldCanvas').addEventListener('pointerdown',()=>{globalThis.motionClickedAt=performance.now();},{once:true,capture:true}));
   await p.mouse.click(canvas.x+(target.x-Math.round(screen.camera.x))*canvas.width/screen.camera.width,canvas.y+(target.y-Math.round(screen.camera.y))*canvas.height/screen.camera.height);
   await p.waitForTimeout(5000);
   const meter=await p.evaluate(()=>MareGameSession.network);
   assert.ok(meter.rttMs>=240,'HTTP ping includes injected 250ms network delay');
   assert.match(await p.locator('#onlinePerformance').innerText(),/Ping HTTP: \d+ ms.*FPS: \d+/);
   captures.push({kind:'click',mapId,target,frames:await p.evaluate('window.captureMotion=false;window.motion')});
   const response=await p.evaluate(()=>{
    const before=window.motion.filter(f=>f.t<=globalThis.motionClickedAt).at(-1);
    const first=window.motion.find(f=>f.t>globalThis.motionClickedAt&&Math.hypot(f.x-before.x,f.y-before.y)>.5);
    return first?first.t-globalThis.motionClickedAt:null;
   });
   console.log(JSON.stringify({map:mapId,clickToMotionMs:response,httpRttMs:meter.rttMs}));
   assert.ok(response!==null&&response<=80,'manual movement must respond before the delayed server acknowledgement');
   // Alternate real pointer inputs faster than the delayed HTTP round trip.
   await p.evaluate(`globalThis.rapidFrames=[];globalThis.rapidClicks=[];globalThis.recordRapid=true;
    if(!globalThis.rapidListener){globalThis.rapidListener=true;document.querySelector('#worldCanvas').addEventListener('pointerdown',()=>{if(!globalThis.recordRapid)return;const d=__mareDiagnostics();globalThis.rapidClicks.push({t:performance.now(),x:d.hero.x,y:d.hero.y,target:globalThis.rapidTarget});});}
    function sample(){if(!globalThis.recordRapid)return;const d=__mareDiagnostics();globalThis.rapidFrames.push({t:d.onlineSampledAt,x:d.hero.x,y:d.hero.y});requestAnimationFrame(sample);}requestAnimationFrame(sample);
   `);
   for(let i=0;i<8;i++){
    const destination=i%2?target:{x:screen.x,y:screen.y};
    const point=await p.evaluate(q=>{globalThis.rapidTarget=q;const d=__mareDiagnostics(),r=document.querySelector('#worldCanvas').getBoundingClientRect();const x=r.x+(q.x-Math.round(d.camera.x))*r.width/d.camera.width,y=r.y+(q.y-Math.round(d.camera.y))*r.height/d.camera.height;return {x,y,canvas:document.elementFromPoint(x,y)?.id==='worldCanvas'};},destination);
    assert.ok(point.canvas,'rapid input must hit the game canvas');await p.mouse.click(point.x,point.y);await p.waitForTimeout(110);
   }
   const rapid=await p.evaluate(()=>{globalThis.recordRapid=false;return globalThis.rapidClicks.map((click,i,all)=>{
    const dx=click.target.x-click.x,dy=click.target.y-click.y,length=Math.hypot(dx,dy);
    const next=all[i+1]?.t??Infinity;
    const frame=globalThis.rapidFrames.find(f=>f.t>click.t&&f.t<next&&((f.x-click.x)*dx+(f.y-click.y)*dy)/length>.5);
    return frame?frame.t-click.t:null;
   });});
   console.log(JSON.stringify({map:mapId,rapidClickToMotionMs:rapid}));
   assert.equal(rapid.length,8);assert.ok(rapid.every(ms=>ms!==null&&ms<=80),'new clicks must turn immediately while earlier commands remain in flight');
   await p.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);
   await p.waitForTimeout(3000);
   await p.unroute('**/v1/**');
   // Reject an actual UI command before it reaches the isolated backend.
   const original=await p.evaluate(()=>({world:structuredClone(MareGameSession.data.online.world),version:MareGameSession.data.online.state.version}));
   let rejected=0;
   await p.route('**/commands',async(r:any)=>{rejected++;await new Promise(resolve=>setTimeout(resolve,250));await r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'version_conflict'})});});
   const rejectPoint=await p.evaluate(q=>{const d=__mareDiagnostics(),r=document.querySelector('#worldCanvas').getBoundingClientRect();return {x:r.x+(q.x-Math.round(d.camera.x))*r.width/d.camera.width,y:r.y+(q.y-Math.round(d.camera.y))*r.height/d.camera.height};},{x:screen.x,y:screen.y});
   await p.mouse.click(rejectPoint.x,rejectPoint.y);
   await p.waitForTimeout(1200);
   assert.equal(rejected,1);assert.equal(await p.evaluate(()=>MareGameSession.data.online.state.version),original.version);
   const corrected=await p.evaluate(()=>({x:__mareDiagnostics().hero.x,y:__mareDiagnostics().hero.y}));
   assert.ok(Math.hypot(corrected.x-original.world.position.x,corrected.y-original.world.position.y)<2,'rejected prediction returns to the authoritative pose');
   await p.unroute('**/commands');
   console.log(JSON.stringify({map:mapId,rejectionReconciled:true}));
  }
  await p.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);
  await p.evaluate(()=>MareGameSession.command('battle.auto',{enabled:true}));
  await p.evaluate(`window.motion=[];window.captureMotion=true;function capture(t){if(!window.captureMotion)return;const d=__mareDiagnostics(),s=MareGameSession.data.online;window.motion.push({t:d.onlineSampledAt,x:d.hero.x,y:d.hero.y,world:s.world,auto:s.battle.auto,stats:{manual:d.stats.moveSpeed,auto:d.stats.huntSpeed}});requestAnimationFrame(capture)}requestAnimationFrame(capture);`);
  await p.waitForTimeout(18000);captures.push({kind:'auto',frames:await p.evaluate('window.captureMotion=false;window.motion')});
  for(const run of captures){
   const frames=run.frames;let travel=0,maxWindowSpeed=0,windows=0;
   for(let i=1;i<frames.length;i++){
    const a=frames[i-1],b=frames[i],dt=b.t-a.t,d=Math.hypot(b.x-a.x,b.y-a.y),speed=Math.max(a.world.speed,b.world.speed);
    // Snapshot callbacks may advance presentation between RAF probes. Individual deltas use
    // the existing 100ms resumed-frame cap; sustained velocity is checked below at 300ms.
    travel+=d;assert.ok(d<=speed*Math.max(dt,100)/1000+3,run.kind+' must not teleport beyond a bounded render step');
    let distance=0,limit=0;
    for(let j=i;j>0&&b.t-frames[j-1].t<=350;j--){const x=frames[j-1],y=frames[j];distance+=Math.hypot(y.x-x.x,y.y-x.y);limit+=Math.max(x.world.speed,y.world.speed)*(y.t-x.t)/1000;if(b.t-x.t>=300){windows++;assert.ok(distance<=limit+3,run.kind+' must not sprint to catch up');maxWindowSpeed=Math.max(maxWindowSpeed,distance*1000/(b.t-x.t));break;}}
   }
   assert.ok(travel>50,run.kind+' must actually move');assert.ok(windows>20,'enough measured windows for a speed assertion');
   if(run.kind==='click'){const end=frames.at(-1);assert.ok(Math.hypot(end.x-run.target.x,end.y-run.target.y)<2,'distant click must eventually arrive by walking');}
   console.log(JSON.stringify({kind:run.kind,map:run.mapId,maxWindowSpeed,passed:true}));
  }
  // The speed window above is fixed, but the neutral monsters may only start
  // following near its end. Wait for the same movement evidence threshold,
  // rather than assuming 18 seconds always contains 101 moving samples.
  await p.waitForFunction(()=>{
   const last=new Map();let moves=0;
   for(const v of globalThis.monsterProbe){const prior=last.get(v.id);if(prior&&Math.hypot(v.x-prior.x,v.y-prior.y)>.01)moves++;last.set(v.id,v);}
   return moves>100;
  },null,{timeout:30000,polling:250});
  const samples=await p.evaluate('globalThis.monsterProbe');let moves=0,sliding=0,rewinds=0;const last=new Map();
  for(const v of samples){const prev=last.get(v.id);if(prev){if(v.phase<prev.phase-.01)rewinds++;if(Math.hypot(v.x-prev.x,v.y-prev.y)>.01){moves++;if(!v.moving)sliding++;}}last.set(v.id,v);}
  console.log(JSON.stringify({monsterFrames:samples.length,moves,sliding,phaseRewinds:rewinds}));
  assert.ok(moves>100,'real monster movement observed');assert.equal(sliding,0,'moving monsters animate their steps');assert.equal(rewinds,0,'walk animation clock never rewinds on snapshots');
  const disconnected=/\/(?:online-state|frame)$/;await p.route(disconnected,(r:any)=>r.abort());await p.evaluate(()=>MareGameSession.read(true).catch(()=>{}));
  await p.waitForFunction(()=>/Sem conexão/.test(document.querySelector('#onlinePerformance')?.textContent||''),null,{timeout:5000});
  await p.unroute(disconnected);await p.evaluate(()=>MareGameSession.read(true));
  // Polling and the one-second meter have independent clocks. Assert recovery
  // itself with a bound, rather than assuming both complete in a fixed 1100ms.
  await p.waitForFunction(()=>MareGameSession.available&&/Ping HTTP:/.test(document.querySelector('#onlinePerformance')?.textContent||''),null,{timeout:10000});
  assert.ok(compactReads>5,'current server advertises compact frames, renderer consumes them');
  assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-final-acceptance');await p.screenshot({path:resolve(out,'combat.png')});
  await p.setViewportSize({width:640,height:900});
  await p.waitForFunction(()=>MareGameSession.available&&Number.isFinite(__mareDiagnostics().hero.x),null,{timeout:10000});
  await p.screenshot({path:resolve(out,'combat-narrow.png')});assert.deepEqual(errors,[]);
  console.log('Mouse routes in lobby/dawn and automatic chase passed with real backend/worker in desktop/narrow viewports; demo preserved.');
  const bootDiagnostics:string[]=[];
  p.on('console',(msg:any)=>{if(msg.text().startsWith('[online-game] bootstrap_failed'))bootDiagnostics.push(msg.text());});
  await p.route(/\/assets\/exported-maps\/(?:dawn|lobby)\/map\.png(?:\?.*)?$/,(r:any)=>r.abort());
  await p.reload();
  await p.locator('.online-boot-error').waitFor({state:'visible',timeout:15000});
  assert.equal(await p.locator('#startOverlay').isVisible(),false);
  assert.deepEqual(bootDiagnostics,['[online-game] bootstrap_failed initial_map_asset_failed']);
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-final-acceptance');
  console.log('Optional depth failure allowed entry; a missing base map reported the specific failure without exposing the creation form.');
 }catch(error){await context?.pages()[0]?.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw error;}finally{await simulations?.stop();await context?.close();await browser?.close();gateway.closeAllConnections();api.closeAllConnections();await Promise.all([new Promise<void>(r=>gateway.close(()=>r())),new Promise<void>(r=>api.close(()=>r()))]);}
});
