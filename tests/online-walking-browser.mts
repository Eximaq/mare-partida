// Isolated PostgreSQL and real battle worker; fixture identity only, no hosted accounts.
import {createSimulationPool} from '../apps/game-server/src/simulation-pool.js';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
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
 let simulations:any;let browser:any,context:any;const errors:string[]=[],httpProbe:any[]=[];let browserTimeOrigin=0;
 try{
  gateway.listen(9445,'127.0.0.1');await once(gateway,'listening');browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});context=await browser.newContext({viewport:{width:1366,height:900}});const p=await context.newPage();p.on('dialog',async(d:any)=>{assert.equal(d.type(),'confirm');assert.match(d.message(),/Este personagem está sob controle/);await d.accept();});p.on('pageerror',(e:any)=>errors.push(e.stack||e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-final-acceptance'));
  await p.route(/^https?:\/\/(?!localhost:9445\/)/,(r:any)=>r.abort());
  const pendingHttp=new Map();
  p.on('request',(r:any)=>{const path=new URL(r.url()).pathname;if(!path.startsWith('/v1/'))return;const row={kind:path.split('/').at(-1),method:r.method(),start:Date.now(),end:null,status:null};pendingHttp.set(r,row);httpProbe.push(row);});
  p.on('response',(r:any)=>{const row=pendingHttp.get(r.request());if(row)row.status=r.status();});
  p.on('requestfinished',(r:any)=>{const row=pendingHttp.get(r);if(row)row.end=Date.now();pendingHttp.delete(r);});
  p.on('requestfailed',(r:any)=>{const row=pendingHttp.get(r);if(row){row.end=Date.now();row.failed=true;}pendingHttp.delete(r);});
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
  browserTimeOrigin=await p.evaluate(()=>performance.timeOrigin);
  await p.evaluate(`globalThis.slowNavigation=[];globalThis.keyEvents=[];
   for(const method of ['path','move']){const original=MareWorld.Navigation.prototype[method];MareWorld.Navigation.prototype[method]=function(...args){const started=performance.now(),from={x:args[0]?.x,y:args[0]?.y};try{return original.apply(this,args);}finally{const ms=performance.now()-started;if(ms>20)globalThis.slowNavigation.push({method,map:this.map.id,from,to:args[1],dy:args[2],t:started,ms});}};}
  `);


  simulations=createSimulationPool({databaseUrl:f.pool.options.connectionString!,counts:{solo:2,party:1},workerUrl:new URL('../apps/game-server/dist/simulation-worker.js',import.meta.url)});await simulations.start();
  await p.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);
  await p.evaluate(()=>MareGameSession.command('world.travel',{islandId:'dawn'}));
  await p.waitForFunction(()=>__mareDiagnostics().map.id==='dawn'&&__mareDiagnostics().map.navigation.ready);
  await p.waitForTimeout(2000);
  await p.waitForFunction(()=>/Ping HTTP: \d+ ms.*FPS: \d+/.test(document.querySelector('#onlinePerformance')?.textContent||''));
  await p.evaluate(()=>{const original=globalThis.MareEmberRenderer.monster;globalThis.monsterProbe=[];globalThis.MareEmberRenderer.monster=function(ctx,m,...args){if(m.alive)globalThis.monsterProbe.push({id:m.id,x:m.x,y:m.y,moving:m.moving,phase:m.emberElapsed});return original.call(this,ctx,m,...args);};});
  assert.equal(await p.evaluate(()=>Number.isFinite(__mareDiagnostics().onlineSampledAt)),true,'motion probes need the time associated with the drawn pose');
  let compactReads=0;p.on('response',r=>{if(r.url().endsWith('/frame')&&r.status()===200)compactReads++;});
  const captures=[],keyboardResponseFailures:string[]=[];
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
   await p.evaluate(()=>document.querySelector('#worldCanvas').addEventListener('pointerdown',()=>{const h=__mareDiagnostics().hero;globalThis.motionBefore={x:h.x,y:h.y};globalThis.motionClickedAt=performance.now();},{once:true,capture:true}));
   await p.mouse.click(canvas.x+(target.x-Math.round(screen.camera.x))*canvas.width/screen.camera.width,canvas.y+(target.y-Math.round(screen.camera.y))*canvas.height/screen.camera.height);
   await p.waitForTimeout(5000);
   const meter=await p.evaluate(()=>MareGameSession.network);
   assert.ok(meter.rttMs>=240,'HTTP ping includes injected 250ms network delay');
   assert.match(await p.locator('#onlinePerformance').innerText(),/Ping HTTP: \d+ ms.*FPS: \d+/);
   captures.push({kind:'click',mapId,target,frames:await p.evaluate('window.captureMotion=false;window.motion')});
   const response=await p.evaluate(()=>{
    const before=globalThis.motionBefore;
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
   // Keyboard has its own input path: test actual key events under the same RTT.
   for(let keyboardRound=0;keyboardRound<5;keyboardRound++){
   let restoreCornerOrigin:any=null;
   if(keyboardRound>=3){
    restoreCornerOrigin=await p.evaluate(()=>({x:__mareDiagnostics().hero.x,y:__mareDiagnostics().hero.y}));
    let open:any=null;
    for(let radius=0;radius<=240&&!open;radius+=48)for(let x=-radius;x<=radius&&!open;x+=48)for(let y=-radius;y<=radius&&!open;y+=48){
     const q={x:restoreCornerOrigin.x+x,y:restoreCornerOrigin.y+y};
     if([-48,0,48].every(dx=>[-48,0,48].every(dy=>nav.clear(q,{x:q.x+dx,y:q.y+dy}))))open=q;
    }
    assert.ok(open,'corner sequence requires an open collision-checked test area');
    if(Math.hypot(open.x-restoreCornerOrigin.x,open.y-restoreCornerOrigin.y)>1){await p.evaluate(q=>MareGameSession.command('world.move',q),open);await p.waitForFunction(q=>Math.hypot(__mareDiagnostics().hero.x-q.x,__mareDiagnostics().hero.y-q.y)<2,open,{timeout:15000});}
   }
   const keyOrigin=await p.evaluate(()=>({x:__mareDiagnostics().hero.x,y:__mareDiagnostics().hero.y}));
   const axis=[[1,0,'d','a'],[0,1,'s','w']].find(([dx,dy])=>[-45,-30,-15,15,30,45].every(n=>nav.walkable(keyOrigin.x+Number(dx)*n,keyOrigin.y+Number(dy)*n)));
   assert.ok(axis,'keyboard probe needs a clear corridor on both sides');
   await p.evaluate(`globalThis.keyFrames=[];globalThis.keyInputs=[];globalThis.keyCommands=[];globalThis.recordKeys=true;globalThis.recordRelease=false;globalThis.keyboardPointerEvents=0;
    if(!globalThis.commandProbeInstalled){globalThis.commandProbeInstalled=true;const command=MareGameSession.command;MareGameSession.command=function(action,...args){const row={action,payload:args[0],worldAtStart:MareGameSession.data.online.world,start:performance.now()};if(globalThis.recordKeys)globalThis.keyCommands.push(row);return command.call(this,action,...args).then(value=>{row.end=performance.now();row.world=value?.world;return value;},error=>{row.end=performance.now();row.error=error.code;throw error;});};}
    if(!globalThis.keyProbeInstalled){globalThis.keyProbeInstalled=true;
     window.addEventListener('pointerdown',()=>{if(globalThis.recordKeys)globalThis.keyboardPointerEvents++;},true);
     window.addEventListener('keydown',e=>{const vectors={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0]};const v=vectors[e.key];if(!globalThis.recordKeys||!v||e.repeat)return;const h=__mareDiagnostics().hero;globalThis.keyInputs.push({t:performance.now(),x:h.x,y:h.y,dx:v[0],dy:v[1]});},true);
     for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{if(globalThis.recordKeys&&!e.repeat)globalThis.keyEvents.push({t:performance.now(),type,key:e.key});},true);
     window.addEventListener('keyup',()=>{if(globalThis.recordRelease)globalThis.releasedAt=performance.now();},true);
    }
    function keySample(){if(!globalThis.recordKeys)return;const d=__mareDiagnostics();globalThis.keyFrames.push({t:d.onlineSampledAt,x:d.hero.x,y:d.hero.y,moving:d.hero.walking>0,direction:d.hero.direction,clickMarker:d.destination!==null,busy:MareGameSession.busy,available:MareGameSession.available,controlled:MareGameSession.controlled});requestAnimationFrame(keySample);}requestAnimationFrame(keySample);
   `);
   let held='';for(let i=0;i<8;i++){
    const next=keyboardRound>=3?['w','a','s','d','w','d','s','a'][i]:String(axis[i%2?3:2]);
    if(keyboardRound===4&&held){await p.keyboard.down(next);await p.waitForTimeout(30);await p.keyboard.up(held);held=next;await p.waitForTimeout(80);}
    else{if(held)await p.keyboard.up(held);held=next;await p.keyboard.down(held);await p.waitForTimeout(110);}
   }
   await p.evaluate(()=>{globalThis.recordRelease=true;});await p.keyboard.up(held);await p.waitForTimeout(100);
   const keyboard=await p.evaluate(()=>{globalThis.recordKeys=false;globalThis.recordRelease=false;return {wrongFacingFrames:globalThis.keyInputs.reduce((count,input,i,all)=>{const until=all[i+1]?.t??globalThis.releasedAt;const direction=input.dx<0?'left':input.dx>0?'right':input.dy<0?'back':'front';return count+globalThis.keyFrames.filter(f=>f.t>input.t+50&&f.t<until&&f.direction!==direction).length;},0),pointerEvents:globalThis.keyboardPointerEvents,markerFrames:globalThis.keyFrames.filter(f=>f.t>globalThis.keyInputs[0].t+50&&f.clickMarker).length,responses:globalThis.keyInputs.map((input,i,all)=>{const next=all[i+1]?.t??globalThis.releasedAt;const frame=globalThis.keyFrames.find(f=>f.t>input.t&&f.t<next&&(f.x-input.x)*input.dx+(f.y-input.y)*input.dy>.5);return frame?frame.t-input.t:null;}),stopMs:(globalThis.keyFrames.find(f=>f.t>globalThis.releasedAt&&!f.moving)?.t??Infinity)-globalThis.releasedAt};});
   console.log(JSON.stringify({map:mapId,keyboardRound,keyboard}));await writeFile(resolve(out,'keyboard-'+mapId+'-'+keyboardRound+'.json'),JSON.stringify(await p.evaluate(()=>({frames:globalThis.keyFrames,inputs:globalThis.keyInputs,commands:globalThis.keyCommands,events:globalThis.keyEvents,slowNavigation:globalThis.slowNavigation})),null,2));assert.equal(keyboard.pointerEvents,0,'keyboard must not synthesize mouse inputs');assert.equal(keyboard.markerFrames,0,'keyboard must not create or restore a click destination');assert.equal(keyboard.responses.length,8);
   // Collect latency failures without skipping the independent marker, combat
   // and reconnect regressions. The same strict assertions fail the run below.
   if(!keyboard.responses.every(ms=>ms!==null&&ms<=80))keyboardResponseFailures.push(mapId+':'+keyboardRound+':turn');
   if(!(keyboard.stopMs<=80))keyboardResponseFailures.push(mapId+':'+keyboardRound+':release');
   if(keyboardRound>=3&&keyboard.wrongFacingFrames!==0)keyboardResponseFailures.push(mapId+':'+keyboardRound+':stale_facing');
   await p.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);await p.waitForTimeout(3000);
   if(restoreCornerOrigin){await p.evaluate(q=>MareGameSession.command('world.move',q),restoreCornerOrigin);await p.waitForFunction(q=>Math.hypot(__mareDiagnostics().hero.x-q.x,__mareDiagnostics().hero.y-q.y)<2,restoreCornerOrigin,{timeout:15000});await p.waitForTimeout(300);}
   }
   const heldOrigin=await p.evaluate(()=>({x:__mareDiagnostics().hero.x,y:__mareDiagnostics().hero.y}));
   await p.evaluate(`
    globalThis.heldTrace=[];globalThis.heldCommands=[];globalThis.recordHeld=true;
    if(!globalThis.heldCommandProbe){globalThis.heldCommandProbe=true;const command=MareGameSession.command;MareGameSession.command=function(action,payload){const row={action,payload,start:performance.now()};if(globalThis.recordHeld)globalThis.heldCommands.push(row);return command.call(this,action,payload).then(receipt=>{row.end=performance.now();row.world=receipt?.world;return receipt;});};}
    function sampleHeld(){if(!globalThis.recordHeld)return;const d=__mareDiagnostics(),w=MareGameSession.data.online.world;globalThis.heldTrace.push({t:d.onlineSampledAt,x:d.hero.x,y:d.hero.y,direction:d.hero.direction,moving:d.hero.walking>0,world:w});requestAnimationFrame(sampleHeld);}requestAnimationFrame(sampleHeld);
   `);
   await p.keyboard.down('d');await p.waitForTimeout(3000);
   assert.equal(await p.evaluate(()=>__mareDiagnostics().destination),null,'held keyboard renewal must not create a click marker');
   await p.screenshot({path:resolve(out,'keyboard-held-'+mapId+'.png')});
   await p.evaluate(`
    globalThis.releaseFrames=[];globalThis.recordStop=true;
    globalThis.releaseFacing=__mareDiagnostics().hero.direction;
    function sampleStop(){if(!globalThis.recordStop)return;const d=__mareDiagnostics();globalThis.releaseFrames.push({t:d.onlineSampledAt,x:d.hero.x,y:d.hero.y,direction:d.hero.direction,moving:d.hero.walking>0});requestAnimationFrame(sampleStop);}requestAnimationFrame(sampleStop);
   `);
   await p.keyboard.up('d');await p.waitForTimeout(180);
   const release=await p.evaluate(()=>({expected:globalThis.releaseFacing,frames:globalThis.releaseFrames.slice(2)}));
   assert.ok(release.frames.length>=3,'release has visible frames before the delayed ACK');
   assert.ok(release.frames.every(f=>f.direction===release.expected&&!f.moving),'release must not reverse facing or walk to an earlier sample');
   await p.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);await p.waitForTimeout(3000);
   const releaseTrace=await p.evaluate(()=>{globalThis.recordStop=false;return globalThis.releaseFrames;});
   await writeFile(resolve(out,'release-'+mapId+'.json'),JSON.stringify(releaseTrace,null,2));
   await writeFile(resolve(out,'held-'+mapId+'.json'),JSON.stringify(await p.evaluate(()=>{globalThis.recordHeld=false;return {frames:globalThis.heldTrace,commands:globalThis.heldCommands};}),null,2));
   const vector={right:[1,0],left:[-1,0],back:[0,-1],front:[0,1]}[release.expected];
   assert.ok(vector);let peak=-Infinity,maxPullback=0;
   for(const f of releaseTrace.slice(2)){const along=f.x*vector[0]+f.y*vector[1];peak=Math.max(peak,along);maxPullback=Math.max(maxPullback,peak-along);assert.equal(f.direction,release.expected,'a confirmed stop must not turn the sprite around');}
   console.log(JSON.stringify({map:mapId,releaseFacingPreserved:true,frames:releaseTrace.length,maxPullback}));
   assert.ok(maxPullback<=8,'release must not pull the player back more than eight pixels in this controlled-latency scenario');
   // Return through the authoritative movement contract so this new held-key
   // probe does not change the starting corridor of the existing chase test.
   await p.evaluate(q=>MareGameSession.command('world.move',q),heldOrigin);
   await p.waitForFunction(q=>{const w=MareGameSession.data.online.world;return Math.hypot(w.position.x-q.x,w.position.y-q.y)<2;},heldOrigin,{timeout:15000});
   await p.waitForTimeout(300);
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
  // Cold load with eight sequential compositor modules arriving three seconds
  // apart: progress is real, but total preparation exceeds the former 20s cap.
  const slowModules=/\/tools\/paper-doll-96-v3\/(?:rig|layers|motion|surface|torso|appearance|weapons|wardrobe)\.js(?:\?.*)?$/;
  let delayedModules=0;
  await p.route(slowModules,async(r:any)=>{delayedModules++;await new Promise(resolve=>setTimeout(resolve,3000));await r.continue();});
  const coldStarted=Date.now();await p.reload();
  await p.waitForFunction(()=>document.querySelector('.online-boot-error')||(!document.body.classList.contains('online-session-loading')&&__mareDiagnostics().lobby96.visualState==='ready'),null,{timeout:90000});
  assert.equal(await p.locator('.online-boot-error').count(),0,'progressing appearance must finish even after twenty seconds');
  assert.equal(delayedModules,8);assert.ok(Date.now()-coldStarted>20000);
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-final-acceptance');
  console.log(JSON.stringify({slowAppearancePassed:true,delayedModules,elapsedMs:Date.now()-coldStarted}));
  await p.unroute(slowModules);
  const bootDiagnostics:string[]=[];
  p.on('console',(msg:any)=>{if(msg.text().startsWith('[online-game] bootstrap_failed'))bootDiagnostics.push(msg.text());});
  await p.route(/\/assets\/exported-maps\/(?:dawn|lobby)\/map\.png(?:\?.*)?$/,(r:any)=>r.abort());
  await p.reload();
  await p.locator('.online-boot-error').waitFor({state:'visible',timeout:15000});
  assert.equal(await p.locator('#startOverlay').isVisible(),false);
  assert.deepEqual(bootDiagnostics,['[online-game] bootstrap_failed initial_map_asset_failed']);
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-final-acceptance');
  console.log('Optional depth failure allowed entry; a missing base map reported the specific failure without exposing the creation form.');
  assert.deepEqual(keyboardResponseFailures,[],'WASD turns and release must respond within 80ms before the delayed ACK');
 }catch(error){await context?.pages()[0]?.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw error;}finally{await writeFile(resolve(out,'http-timing.json'),JSON.stringify({browserTimeOrigin,requests:httpProbe},null,2));await simulations?.stop();await context?.close();await browser?.close();gateway.closeAllConnections();api.closeAllConnections();await Promise.all([new Promise<void>(r=>gateway.close(()=>r())),new Promise<void>(r=>api.close(()=>r()))]);}
});
