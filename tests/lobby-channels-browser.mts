import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {authDatabase} from './integration/auth-support.mjs';
import {createHttpServer,attachRealtime} from '../apps/game-server/src/http.js';
import {createAuthHandler} from '../apps/game-server/src/auth/routes.js';
import {createDevGateway} from '../tools/dev-gateway.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const out=process.env.MARE_QA_DIR!;assert(out);await mkdir(out,{recursive:true});
await authDatabase(async f=>{
 const actors:any[]=[];
 for(let n=0;n<47;n++){
  const login=await f.service.login(`channel-${n}@example.invalid`,'fixture'),c=await f.service.createCharacter(login.token,{name:'Navegante '+n,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id);
  const command=async(action:any,payload:any={})=>f.service.command(login.token,c.id,{requestId:randomUUID(),expectedVersion:(await f.service.characterState(login.token,c.id)).version,control:lease,action,payload});
  for(const action of ['items.initialize','world.initialize','battle.start'])await command(action);
  actors.push({login,c,lease,command});
 }
 await f.pool.query('DELETE FROM mare_game.character_profile WHERE character_id=$1',[actors[1].c.id]);
 await f.pool.query("UPDATE mare_game.character_control SET expires_at=clock_timestamp()-interval '1 second' WHERE character_id=ANY($1::uuid[])",[actors.slice(0,3).map(a=>a.c.id)]);
 const origin='https://localhost:9445',api=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service:f.service,vault:f.vault,origin,cookieSeconds:86400})});
 const realtime=attachRealtime(api,{service:f.service,vault:f.vault,origin});api.listen(0,'127.0.0.1');await once(api,'listening');
 const gateway=createDevGateway({key:await readFile('infra/local/localhost.key','utf8'),cert:await readFile('infra/local/localhost.crt','utf8'),staticRoot:resolve('dist'),onlineRoot:resolve('apps/account-client'),upstream:new URL(`http://127.0.0.1:${(api.address() as any).port}`)});
 let browser:any;const errors:string[]=[];
 let renewal:Promise<unknown>=Promise.resolve(),renewing=false;
 const keeper=setInterval(()=>{if(renewing)return;renewing=true;renewal=Promise.all(actors.slice(3).map(a=>f.service.renewControl(a.login.token,a.c.id,a.lease))).catch(()=>{errors.push('fixture lease renewal failed');}).finally(()=>{renewing=false;});},20000);
 try{
  gateway.listen(9445,'127.0.0.1');await once(gateway,'listening');browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  const pages:any[]=[];
  for(const actor of actors.slice(0,3)){
   const context=await browser.newContext({viewport:{width:1366,height:900}});
   await context.addCookies([{name:'__Host-mare_session',value:actor.login.token,domain:'localhost',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
   await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','lobby-channels-preserved'));
   const page=await context.newPage();page.on('pageerror',(e:any)=>errors.push(e.name+': '+e.message));
   await page.route(/^https?:\/\/(?!localhost:9445\/)/,(r:any)=>r.abort());
   await page.goto(origin+'/game');
   await page.waitForFunction(()=>globalThis.MareGameSession?.controlled&&globalThis.__mareDiagnostics?.().map.navigation.ready,null,{timeout:90000});
   await page.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length>=21,null,{timeout:15000});
   await page.locator('#lobbyChannel').waitFor({state:'visible',timeout:5000});pages.push(page);
  }
  for(const page of pages)await page.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length===23);
  for(let n=0;n<3;n++){
   const names=await pages[n].evaluate(()=>globalThis.__mareDiagnostics().sharedLobby.players.map(p=>p.name));
   for(let other=0;other<3;other++)if(other!==n)assert(names.includes('Navegante '+other));
  }
  const p=pages[1];await p.bringToFront();
  const frameIntervals=await p.evaluate("new Promise(resolve=>{const intervals=[];let last=performance.now();const until=last+8000;function frame(now){intervals.push(now-last);last=now;if(now<until)requestAnimationFrame(frame);else resolve(intervals.slice(2));}requestAnimationFrame(frame);})");
  frameIntervals.sort((a:number,b:number)=>a-b);const rafP95=frameIntervals[Math.floor(frameIntervals.length*.95)];
  await p.locator('#lobbyChannel').click();await p.locator('[data-lobby-channel="2"]').waitFor();
  await p.screenshot({path:resolve(out,'channels-desktop.png')});
  await p.locator('[data-lobby-channel="2"]').click();
  await p.waitForFunction(()=>globalThis.MareGameSession.data.online.lobby.channel.id===2);
  for(const page of [pages[0],pages[2]])await page.waitForFunction(()=>!globalThis.__mareDiagnostics().sharedLobby.players.some(p=>p.name==='Navegante 1'));
  await p.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.length===23);
  await p.setViewportSize({width:390,height:844});await p.locator('#lobbyChannel').click();await p.locator('[data-lobby-channel="1"]').waitFor();
  await p.screenshot({path:resolve(out,'channels-mobile.png')});
  await new Promise(r=>setTimeout(r,5100));await p.locator('[data-lobby-channel="1"]').click();
  await p.waitForFunction(()=>globalThis.MareGameSession.data.online.lobby.channel.id===1);
  for(const page of [pages[0],pages[2]])await page.waitForFunction(()=>globalThis.__mareDiagnostics().sharedLobby.players.some(p=>p.name==='Navegante 1'));
  for(const page of pages)assert.equal(await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'lobby-channels-preserved');
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.character_profile WHERE character_id=$1',[actors[1].c.id])).rows[0].n,0);
  assert.deepEqual(errors,[]);
  const result={passed:true,accounts:47,browserProfiles:3,visiblePeers:23,legacyProfileMutualVisibility:true,channelSwitchDesktopAndMobile:true,demoSavePreserved:true,rafP95Ms:rafP95,provider:'isolated fixture, no hosted email',transport:realtime.report()};
  await writeFile(resolve(out,'browser-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(error){console.error('Browser failure:',error instanceof Error?error.message.split('Call log:')[0]:'unknown');if(browser)for(const [i,c] of browser.contexts().entries())await c.pages()[0]?.screenshot({path:resolve(out,`failure-${i}.png`)}).catch(()=>{});throw Error('Lobby browser acceptance failed');}
 finally{clearInterval(keeper);await renewal;await browser?.close();await realtime.close();gateway.closeAllConnections();api.closeAllConnections();await Promise.all([new Promise<void>(r=>gateway.close(()=>r())),new Promise<void>(r=>api.close(()=>r()))]);}
},undefined,true);
