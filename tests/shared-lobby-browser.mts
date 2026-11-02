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
 const gateway=createDevGateway({key:await readFile('infra/local/localhost.key','utf8'),cert:await readFile('infra/local/localhost.crt','utf8'),staticRoot:resolve('dist'),onlineRoot:resolve('apps/account-client'),upstream:new URL(`http://127.0.0.1:${(api.address() as any).port}`)});
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
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.characters')).rows[0].n,2);
  const before=await p.evaluate(()=>globalThis.__mareDiagnostics().sharedLobby.players[0]);
  await q.keyboard.down('ArrowRight');await q.waitForTimeout(1200);await q.keyboard.up('ArrowRight');
  await p.waitForFunction((x:number)=>Math.abs(globalThis.__mareDiagnostics().sharedLobby.players[0].x-x)>20,before.x);
  await p.screenshot({path:resolve(out,'two-players-original-port.png')});console.log('two isolated accounts visible; authoritative movement rendered');
  // Expire only a disposable fixture lease: reproduce returning from a suspended tab.
  const returningId=await p.evaluate(()=>globalThis.MareGameSession.data.character.id);
  await f.pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()-interval '1 second' WHERE character_id=$1",[returningId]);
  await q.evaluate(()=>globalThis.MareGameSession.read(true));
  assert.equal(await q.evaluate(()=>globalThis.__mareDiagnostics().sharedLobby.players.length),0);
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
