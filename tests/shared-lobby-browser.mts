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
const out=process.env.MARE_QA_DIR||'tmp/shared-lobby-browser';await mkdir(out,{recursive:true});
await authDatabase(async f=>{
 const handler=createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9445',cookieSeconds:3600});
 const api=createHttpServer({isReady:async()=>true,handle:handler});api.listen(0,'127.0.0.1');await once(api,'listening');
 const gateway=createDevGateway({key:await readFile('infra/local/localhost.key','utf8'),cert:await readFile('infra/local/localhost.crt','utf8'),staticRoot:resolve(process.env.MARE_QA_STATIC_ROOT||'dist'),onlineRoot:resolve('apps/account-client'),upstream:new URL(`http://127.0.0.1:${(api.address() as any).port}`)});
 let browser:any,context:any;const errors:string[]=[];
 try{
  gateway.listen(9445,'127.0.0.1');await once(gateway,'listening');browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});context=await browser.newContext({viewport:{width:1366,height:900}});const p=await context.newPage();p.on('dialog',async(d:any)=>{assert.equal(d.type(),'confirm');assert.match(d.message(),/Este personagem está sob controle/);await d.accept();});p.on('pageerror',(e:any)=>errors.push(e.stack||e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-final-acceptance'));
  await p.route(/^https?:\/\/(?!localhost:9445\/)/,(r:any)=>r.abort());
  await p.goto('https://localhost:9445/online/');await p.locator('#email').fill('acceptance@example.invalid');await p.locator('#password').fill('Fixture password only 123');await p.locator('#login-submit').click();await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#classStep [data-class=sword]').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
  await p.waitForFunction(()=>globalThis.MareGameSession?.data?.online?.battle&&globalThis.__mareDiagnostics?.().map.navigation.ready);await p.waitForFunction(()=>globalThis.__mareDiagnostics().lobby96.visualState==='ready',null,{timeout:90000});
  const other=await browser.newContext({viewport:{width:1366,height:900}}),q=await other.newPage();
  await q.route(/^https?:\/\/(?!localhost:9445\/)/,(r:any)=>r.abort());q.on('pageerror',(e:any)=>errors.push(e.stack||e.message));
  await q.goto('https://localhost:9445/online/');await q.locator('#email').fill('companion@example.invalid');await q.locator('#password').fill('Fixture password only 123');await q.locator('#login-submit').click();
  await q.locator('#characterName').fill('Companheiro');await q.locator('#nextToClass').click();await q.locator('#classStep [data-class=sword]').click();await q.locator('#nextToAppearance').click();await q.locator('#createCharacter').click();await q.locator('[data-confirm-accept]').click();
  await q.waitForFunction(()=>globalThis.MareGameSession?.controlled&&globalThis.MareGameSession.data.online.battle);
  for(const page of [p,q])await page.waitForFunction(()=>globalThis.__mareDiagnostics?.().sharedLobby?.players.length===1,null,{timeout:15000});
  for(const page of [p,q])await page.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.draws>0,null,{timeout:90000});
  // Hidden load/status labels must not churn DOM on every animation frame.
  await p.waitForFunction(()=>document.querySelector('#playerVisualStatus')?.getAttribute('data-state')==='ready');
  await p.evaluate(`(() => {
    window.statusMutations=0;
    window.statusObserver=new MutationObserver(records=>window.statusMutations+=records.length);
    for(const id of ['worldLoading','playerVisualStatus'])window.statusObserver.observe(document.getElementById(id),{subtree:true,childList:true,characterData:true,attributes:true});
  })()`);
  await p.waitForTimeout(1200);
  assert.equal(await p.evaluate('window.statusObserver.disconnect(); window.statusMutations'),0,'stable load labels do not rewrite DOM at frame rate');
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.characters')).rows[0].n,2);
  const before=await p.evaluate(()=>globalThis.__mareDiagnostics().sharedLobby.players[0]);
  await q.keyboard.down('ArrowRight');await q.waitForTimeout(1200);await q.keyboard.up('ArrowRight');
  await p.waitForFunction((x:number)=>Math.abs(globalThis.__mareDiagnostics().sharedLobby.players[0].x-x)>20,before.x);
  await p.screenshot({path:resolve(out,'two-players-original-port.png')});console.log('two isolated accounts visible; authoritative movement rendered');
  // Reproduce the original stutter with real requests delayed by 100 ms.
  // Frame-normalized checks distinguish a position jump from a busy CI renderer.
  await q.waitForTimeout(1000);
  for(const page of [p,q]){
    await page.route('**/v1/**',async(r:any)=>{await new Promise(resolve=>setTimeout(resolve,100));await r.continue();});
    await page.evaluate(`(() => {
      window.movementFrames=[]; window.captureMovement=true;
      function sample(t){
        if(!window.captureMovement)return;
        const d=window.__mareDiagnostics(),peer=d.sharedLobby.players[0];
        window.movementFrames.push({t,x:d.hero.x,y:d.hero.y,cx:d.camera.x,cy:d.camera.y,peer:peer?{x:peer.x,y:peer.y}:null});
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    })()`);
  }
  await q.keyboard.down('ArrowRight');await q.waitForTimeout(4000);await q.keyboard.up('ArrowRight');await q.waitForTimeout(1400);
  for(const [page,remote] of [[p,true],[q,false]] as const){
    const frames=await page.evaluate('window.captureMovement=false; window.movementFrames');
    const steps=frames.slice(1).flatMap((b:any,i:number)=>{
      const a=frames[i],dt=b.t-a.t,from=remote?a.peer:a,to=remote?b.peer:b;
      return dt>0&&dt<=50&&from&&to?[{speed:Math.hypot(to.x-from.x,to.y-from.y)/dt,camera:Math.hypot(b.cx-a.cx,b.cy-a.cy)/dt}]:[];
    });
    assert.ok(steps.length>50,'enough regular frames to evaluate motion');
    const positions=frames.map((f:any)=>remote?f.peer?.x:f.x).filter(Number.isFinite);
    assert.ok(Math.max(...positions)-Math.min(...positions)>30,'walking must really occur');
    const speed=Math.max(...steps.map((s:any)=>s.speed)),camera=Math.max(...steps.map((s:any)=>s.camera));
    console.log(JSON.stringify({movement:remote?'remote':'own',addedRequestDelayMs:100,maxPixelsPerMs:speed,maxCameraPixelsPerMs:camera}));
    assert.ok(speed<1,'no snapshot-sized jump in a regular animation frame');
    assert.ok(camera<1,'camera follows without a hard snapshot reset');
    await page.unroute('**/v1/**');
  }
  // Expire only a disposable fixture lease: reproduce returning from a suspended tab.
  const returningId=await p.evaluate(()=>globalThis.MareGameSession.data.character.id);
  const controlRoute=/\/v1\/characters\/[^/]+\/control(?:\/renew)?$/;
  let resumeRenewal!:()=>void;
  const pausedRenewal=new Promise<void>(resolve=>{resumeRenewal=resolve;});
  await p.route(controlRoute,async(r:any)=>{await pausedRenewal;await r.continue();});
  await f.pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()-interval '1 second' WHERE character_id=$1",[returningId]);
  await q.evaluate(()=>globalThis.MareGameSession.read(true));
  // A concurrent polling read can supersede the explicit read; await the rendered state.
  await q.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length===0,null,{timeout:15000});
  resumeRenewal();await p.unroute(controlRoute);
  await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await q.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length===1,null,{timeout:15000});
  console.log('returning tab recovers expired control and mutual presence without takeover');
  await q.waitForFunction(()=>globalThis.MareGameSession.available&&!globalThis.MareGameSession.busy&&!globalThis.MareGameSession.pending);
  await q.evaluate(()=>globalThis.MareGameSession.command('profile.appearance',{appearance:{...globalThis.MareGameSession.data.online.profile.appearance,hairColor:'green'}}));
  await p.waitForFunction(()=>globalThis.MareGameSession.data.online.lobby.players[0]?.appearance96.hairColor==='green');
  await p.route('**/online-state',(r:any)=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'fixture_unavailable'})}));
  await p.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length===0);
  await p.unroute('**/online-state');await p.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length===1);
  await q.waitForFunction(()=>globalThis.MareGameSession.available&&!globalThis.MareGameSession.busy&&!globalThis.MareGameSession.pending);
  let limited=0;for(const page of [p,q])page.on('response',(r:any)=>{if(r.status()===429)limited++;});
  for(let turn=0;turn<22;turn++){const key=turn%2?'ArrowLeft':'ArrowRight',old=turn%2?'ArrowRight':'ArrowLeft';for(const page of [p,q]){await page.keyboard.up(old);await page.keyboard.down(key);}await p.waitForTimeout(3000);}
  for(const page of [p,q]){await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');}
  // Let keyup reach the game loop, then await the confirmed stop before travel.
  for(const page of [p,q]){
    await page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    await page.waitForFunction(()=>globalThis.MareGameSession.available&&!globalThis.MareGameSession.busy&&!globalThis.MareGameSession.pending&&globalThis.MareGameSession.data.online.world.path.length===0);
  }
  console.log('sustained two-player rate-limit responses',limited);assert.equal(limited,0,'normal two-player walking must fit the shared gateway budget');
  await q.waitForFunction(()=>globalThis.MareGameSession.available&&!globalThis.MareGameSession.busy&&!globalThis.MareGameSession.pending);
  console.log('travel start');await q.evaluate(()=>globalThis.MareGameSession.command('world.travel',{islandId:'dawn'}));
  await p.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length===0);
  console.log('return start');await q.waitForFunction(()=>globalThis.MareGameSession.available&&!globalThis.MareGameSession.busy&&!globalThis.MareGameSession.pending);await q.evaluate(()=>globalThis.MareGameSession.command('world.return',{}));
  await p.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length===1);
  await q.evaluate(()=>globalThis.MareGameSession.logout());await p.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length===0);
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-final-acceptance');
  if(errors.length)console.log('browser errors',errors);assert.deepEqual(errors,[]);await other.close();console.log(JSON.stringify({result:'passed',transport:'trusted local HTTPS',backend:'real Node and isolated PostgreSQL',provider:'fixture without emails',flows:['two accounts','original map and dolls','server movement','travel and return','logout removes peer','demo save preserved']}));
 }catch(e){if(context)await context.pages()[0]?.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw new Error('End-to-end browser acceptance failed: '+(e instanceof Error?e.message.split('Call log:')[0].split('\n')[0]:'unknown error'));}finally{await context?.close();await browser?.close();gateway.closeAllConnections();api.closeAllConnections();await Promise.all([new Promise<void>(r=>gateway.close(()=>r())),new Promise<void>(r=>api.close(()=>r()))]);}
});
