import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {authDatabase} from './integration/auth-support.mjs';
import {createHttpServer} from '../apps/game-server/src/http.js';
import {createAuthHandler} from '../apps/game-server/src/auth/routes.js';
import {createDevGateway} from '../tools/dev-gateway.mjs';
import {tickWorldBattles} from '../apps/game-server/src/characters/battle.js';
declare global {var MareGameSession:any;var __mareDiagnostics:any;}
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||'tmp/final-online-browser';await mkdir(out,{recursive:true});
await authDatabase(async f=>{
 const handler=createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600});let lose=false;
 const api=createHttpServer({isReady:async()=>true,handle:async(req,res)=>{const end=res.end.bind(res);if(req.url?.endsWith('/commands'))res.end=((...args:any[])=>{if(lose){lose=false;res.destroy();return res;}return (end as any)(...args);}) as any;return handler(req,res);}});api.listen(0,'127.0.0.1');await once(api,'listening');
 const gateway=createDevGateway({key:await readFile('infra/local/localhost.key','utf8'),cert:await readFile('infra/local/localhost.crt','utf8'),staticRoot:resolve('dist'),onlineRoot:resolve('apps/account-client'),upstream:new URL(`http://127.0.0.1:${(api.address() as any).port}`)});
 let browser:any,context:any,tick:Promise<unknown>|undefined,interval:NodeJS.Timeout|undefined,stopping=false;const errors:string[]=[];
 try{
  gateway.listen(9443,'127.0.0.1');await once(gateway,'listening');browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});context=await browser.newContext({viewport:{width:1366,height:900}});const p=await context.newPage();p.on('dialog',async(d:any)=>{assert.equal(d.type(),'confirm');assert.match(d.message(),/Este personagem está sob controle/);await d.accept();});p.on('pageerror',(e:any)=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-final-acceptance'));
  await p.route(/^https?:\/\/(?!localhost:9443\/)/,(r:any)=>r.abort());
  await p.goto('https://localhost:9443/online/');await p.locator('#email').fill('acceptance@example.invalid');await p.locator('#password').fill('Fixture password only 123');await p.locator('#login-submit').click();await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#classStep [data-class=sword]').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
  await p.waitForFunction(()=>globalThis.MareGameSession?.data?.online?.battle&&globalThis.__mareDiagnostics?.().map.navigation.ready);await p.waitForFunction(()=>globalThis.__mareDiagnostics().lobby96.visualState==='ready',null,{timeout:90000});
  const initial=await p.evaluate(()=>({state:globalThis.MareGameSession.data.online.state,items:globalThis.MareGameSession.data.online.originalInventory}));assert.equal(initial.state.level,1);assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.characters')).rows[0].n,1);
  await p.screenshot({path:resolve(out,'original-port-real-backend.png')});console.log('creation passed');
  // Loss occurs after the real backend committed; no simulated economic response.
  lose=true;
  await p.locator('#buyPotion').click();await p.waitForFunction(()=>globalThis.MareGameSession.pending&&!globalThis.MareGameSession.busy);await p.keyboard.press('i');await p.locator('[data-online-action=resume]').click();await p.keyboard.press('Escape');await p.waitForFunction(()=>!globalThis.MareGameSession.pending&&!globalThis.MareGameSession.busy);
  assert.equal((await f.pool.query('SELECT potions FROM mare_game.game_inventory')).rows[0].potions,initial.items.potions+1);assert.equal((await f.pool.query("SELECT count(*)::int n FROM mare_game.character_commands WHERE result->>'action'='potions.buy'")).rows[0].n,1);
  console.log('loss recovery passed');await p.keyboard.press('i');const boots=initial.items.inventory.find((i:any)=>i.def===8);assert(boots);await p.locator('[data-item="'+boots.id+'"]').click();await p.locator('[data-equip="'+boots.id+'"]').click();await p.waitForFunction(()=>!globalThis.MareGameSession.busy&&!!globalThis.MareGameSession.data.online.originalInventory.equipment.boots);await p.keyboard.press('Escape');
  console.log('equipment passed');await p.locator('.location-heading').click();await p.locator('[data-island=dawn]').click();await p.locator('[data-travel-island=dawn]').click();await p.waitForFunction(()=>globalThis.__mareDiagnostics().map.id==='dawn'&&globalThis.__mareDiagnostics().map.navigation.ready);
  console.log('travel passed');interval=setInterval(()=>{if(!stopping&&!tick)tick=tickWorldBattles(f.pool).catch(()=>{errors.push('worker_failure');}).finally(()=>{tick=undefined;});},250);
  if(!await p.evaluate(()=>globalThis.MareGameSession.data.online.battle.auto))await p.locator('#autoToggle').click();
  await p.waitForFunction(()=>globalThis.MareGameSession.data.online.achievements.kills>0,null,{timeout:120000});await p.screenshot({path:resolve(out,'original-hunt-real-backend.png')});
  console.log('server kill passed');await p.locator('#returnLobby').click();await p.waitForFunction(()=>globalThis.__mareDiagnostics().map.id==='lobby'&&!globalThis.MareGameSession.busy);stopping=true;if(interval)clearInterval(interval);await tick;
  console.log('return passed');const persisted=(await f.pool.query('SELECT experience,gold FROM mare_game.character_progression')).rows[0];assert(BigInt(persisted.experience)>0n);const receipts=(await f.pool.query('SELECT count(*)::int n FROM mare_game.world_battle_rewards')).rows[0].n;assert(receipts>0);
  await p.reload();await p.waitForFunction(()=>globalThis.MareGameSession?.controlled&&globalThis.MareGameSession.data.online.battle);const after=await p.evaluate(()=>({xp:globalThis.MareGameSession.data.online.state.experience,gold:globalThis.MareGameSession.data.online.state.gold,boots:globalThis.MareGameSession.data.online.originalInventory.equipment.boots.id}));assert.deepEqual(after,{xp:String(persisted.experience),gold:String(persisted.gold),boots:boots.id});
  console.log('reload passed');await p.locator('#captainMenuTrigger').click();await p.locator('[data-captain-section=settings]').click();await p.locator('[data-settings-card=general]').click();await p.locator('[data-online-action=logout]').click();await p.waitForURL('**/online/');await p.reload();assert(await p.locator('#login-form').isVisible());
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-final-acceptance');assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'passed',transport:'trusted HTTPS, TLS checks enabled',backend:'actual Node and isolated PostgreSQL',provider:'deterministic fixture, no hosted provider or emails',flows:['login','original creation','original map and HUD','purchase with lost reply and single receipt','equipment','original Dawn hunt and server reward','reload persistence','logout','demo save unchanged']}));
 }catch(e){if(context)await context.pages()[0]?.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw new Error('End-to-end browser acceptance failed: '+(e instanceof Error?e.message.split('Call log:')[0].split('\n')[0]:'unknown error'));}finally{stopping=true;if(interval)clearInterval(interval);await tick;await context?.close();await browser?.close();gateway.closeAllConnections();api.closeAllConnections();await Promise.all([new Promise<void>(r=>gateway.close(()=>r())),new Promise<void>(r=>api.close(()=>r()))]);}
});
