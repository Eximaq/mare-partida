import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {authDatabase} from './integration/auth-support.mjs';
import {createHttpServer} from '../apps/game-server/src/http.js';
import {createAuthHandler} from '../apps/game-server/src/auth/routes.js';
import {createDevGateway} from '../tools/dev-gateway.mjs';
import {tickWeeklyBosses} from '../apps/game-server/src/characters/weekly-boss-worker.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),out=process.env.MARE_QA_DIR||'tmp/weekly-boss-browser';await mkdir(out,{recursive:true});
await authDatabase(async f=>{
 for(const [email,name,slot]of [['owner@example.invalid','AlmiranteTeste',1],['collaborator@example.invalid','ColaboradorTeste',2],['player@example.invalid','JogadorTeste',0]] as const){const l=await f.service.login(email,'fixture');await f.service.createCharacter(l.token,{name,classId:'sword',factionId:'pirate'});if(slot)await f.pool.query('INSERT INTO mare_game.weekly_boss_operators(account_id,slot) VALUES($1,$2)',[(await f.service.me(l.token)).account.id,slot]);}
 const handler=createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9445',cookieSeconds:3600}),api=createHttpServer({isReady:async()=>true,handle:handler});api.listen(0,'127.0.0.1');await once(api,'listening');
 const gateway=createDevGateway({key:await readFile('infra/local/localhost.key','utf8'),cert:await readFile('infra/local/localhost.crt','utf8'),staticRoot:resolve('dist'),onlineRoot:resolve('apps/account-client'),upstream:new URL(`http://127.0.0.1:${(api.address() as any).port}`)});gateway.listen(9445,'127.0.0.1');await once(gateway,'listening');
 const errors:string[]=[],workerErrors:string[]=[],missing:string[]=[];let flight:Promise<unknown>|null=null;
 const timer=setInterval(()=>{if(!flight)flight=tickWeeklyBosses(f.pool).catch(e=>workerErrors.push(e.message)).finally(()=>{flight=null;});},120);
 let browser:any;const pages:any[]=[];
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox'],env:{...process.env,HOME:process.env.MARE_QA_BROWSER_HOME||process.env.HOME}});
  async function login(email:string){const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage();pages.push(p);p.on('pageerror',(e:any)=>errors.push(e.message));p.on('response',(r:any)=>{if(r.status()===404&&/weekly-boss|akainu/.test(r.url()))missing.push(r.url());});p.on('dialog',(d:any)=>d.accept());await p.route(/^https?:\/\/(?!localhost:9445\/)/,(r:any)=>r.abort());await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','sentinel-weekly-test'));await p.goto('https://localhost:9445/online/');await p.locator('#email').fill(email);await p.locator('#password').fill('Fixture password only 123');await p.locator('#login-submit').click();await p.waitForFunction('globalThis.MareGameSession?.controlled && globalThis.MareGameSession.data?.online?.battle',null,{timeout:60000});await p.waitForFunction('globalThis.__mareDiagnostics?.().lobby96.visualState === "ready"',null,{timeout:60000});return p;}
  const p=await login('owner@example.invalid'),q=await login('collaborator@example.invalid'),r=await login('player@example.invalid');
  assert.equal(await r.locator('#weeklyBossMenu').isVisible(),false,'ordinary player must not see a closed event');
  await p.locator('#modesMenuTrigger').click();await p.locator('#weeklyBossMenu').click();await p.locator('#weeklyBossDialog').waitFor();assert(await p.locator('[data-weekly-op=activate]').isDisabled());await p.screenshot({path:resolve(out,'admin-closed.png')});
  await p.locator('[data-weekly-op=test]').click();await p.waitForFunction('globalThis.__mareDiagnostics().map.id === "quest-dungeons" && globalThis.__mareDiagnostics().mobs.some(m=>m.name==="Akainu")',null,{timeout:20000});
  const id=await p.evaluate('MareGameSession.data.online.weeklyBoss.current.id');
  await q.locator('#modesMenuTrigger').click();await q.locator('#weeklyBossMenu').click();await q.locator(`[data-weekly-op=join][data-event="${id}"]`).click();
  for(const page of [p,q])await page.waitForFunction('globalThis.__mareDiagnostics().sharedLobby.players.length === 1',null,{timeout:20000});
  assert.equal(await p.locator('#locationName').textContent(),'Akainu · Teste privado');
  assert.equal(await r.locator('#weeklyBossMenu').isVisible(),false,'private event cannot leak into ordinary account UI');
  // All mutation below is confined to this disposable fixture database.
  const row=(await f.pool.query('SELECT simulation FROM mare_game.weekly_boss_events WHERE id=$1',[id])).rows[0],room=row.simulation;room.mobs[0].attack=room.mobs[0].profile.attack=1;await f.pool.query('UPDATE mare_game.weekly_boss_events SET simulation=$2 WHERE id=$1',[id,JSON.stringify(room)]);
  await p.waitForFunction('MareGameSession.data.online.battle.mobs[0]?.action?.kind === "aoe"',null,{timeout:30000});
  await p.screenshot({path:resolve(out,'aoe-warning-real-game.png')});await p.waitForTimeout(1100);await p.screenshot({path:resolve(out,'aoe-impact-real-game.png')});
  const resources=await p.evaluate('performance.getEntriesByType("resource").filter(r=>r.name.includes("/assets/weekly-boss/akainu/")).map(r=>r.name)');assert(resources.length>=2,'real sprite textures must be requested');
  const hp=await p.evaluate('MareGameSession.data.online.battle.mobs[0].hp');await q.reload();await q.waitForFunction('globalThis.MareGameSession?.data?.online?.weeklyBoss?.current',null,{timeout:30000});assert.equal(await q.evaluate('MareGameSession.data.online.weeklyBoss.current.id'),id);assert(await q.evaluate('MareGameSession.data.online.battle.mobs[0].hp')<=hp);
  await p.setViewportSize({width:390,height:844});await p.locator('#modesMenuTrigger').click();await p.locator('#weeklyBossMenu').click();await p.screenshot({path:resolve(out,'admin-mobile.png')});assert(await p.locator('#weeklyBossDialog').evaluate((d:any)=>{const b=d.getBoundingClientRect();return b.width<=390&&b.x>=0&&b.right<=390;}));
  await p.locator('[data-weekly-op=cancel]').click();for(const page of [p,q])await page.waitForFunction('MareGameSession.data.online.world.mapId === "lobby" && !MareGameSession.data.online.battle.weeklyBossInstanceId',null,{timeout:20000});
  for(const page of pages)assert.equal(await page.evaluate('localStorage.getItem("mare-partida-save-v1")'),'sentinel-weekly-test');
  for(const table of ['weekly_boss_victories','weekly_boss_entitlements'])assert.equal((await f.pool.query(`SELECT count(*)::int n FROM mare_game.${table}`)).rows[0].n,0);
  assert.deepEqual(errors,[]);assert.deepEqual(workerErrors,[]);assert.deepEqual(missing,[]);
  await writeFile(resolve(out,'report.json'),JSON.stringify({passed:true,accounts:3,sharedOperators:2,privateEvent:true,noPublicSpawn:true,noRewards:true,noMissingAssets:true,desktop:[1366,900],mobile:[390,844],resources},null,2));console.log('::notice::Weekly browser passed: three real sessions, shared boss, private isolation, AoE, reconnect, cancellation, desktop/mobile and save sentinel.');
 }catch(error){for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:resolve(out,`failure-${i}.png`)}).catch(()=>{});await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),errors,workerErrors,missing},null,2));throw error;}
 finally{clearInterval(timer);if(flight)await flight;await browser?.close();await new Promise<void>(r=>gateway.close(()=>r()));await new Promise<void>(r=>api.close(()=>r()));}
});
