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
const out=process.env.MARE_QA_DIR||'tmp/social-shared-browser';await mkdir(out,{recursive:true});
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

  async function openSocial(page:any,kind:string){
   const close=page.locator('#floatingChat.hud-open [data-close-window]');if(await close.isVisible())await close.click();
   const panel=page.locator('.social-mode #closePanel');if(await panel.isVisible())await panel.click();
   await page.locator('#socialMenuTrigger').click();await page.locator('#socialQuickMenu [data-social-open="'+kind+'"]').click();
  }
  await openSocial(p,'friends');await p.locator('#socialFriendSearch').fill('Companheiro');await p.locator('#socialFriendSearch').press('Enter');
  await p.locator('[data-social-action="add"]').click();
  await openSocial(q,'friends');await q.locator('[data-social-action="friend-accept"]').click();
  await openSocial(p,'friends');await p.locator('[data-social-action="private"]').first().click();
  await p.locator('#chatInput').fill('<b>Teste em dupla</b>');await p.locator('#chatInput').press('Enter');
  await openSocial(q,'messages');await q.locator('[data-social-action="private"]').first().click();
  await q.locator('.social-chat-log').getByText('<b>Teste em dupla</b>',{exact:true}).waitFor();
  assert.equal(await q.locator('.social-chat-log article p b').count(),0);
  await q.locator('#chatInput').fill('Recebido no outro perfil');await q.locator('#chatInput').press('Enter');
  await p.locator('.social-chat-log').getByText('Recebido no outro perfil',{exact:true}).waitFor();
  await p.screenshot({path:resolve(out,'social-real.png')});
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-final-acceptance');
  assert.deepEqual(errors,[]);await other.close();console.log(JSON.stringify({result:'passed',backend:'real API and isolated PostgreSQL',provider:'fixture without emails',flows:['two profiles','shared lobby','search public name','friend request and accept','private messages both directions','literal text escaping','demo save unchanged']}));
 }catch(e){if(context)await context.pages()[0]?.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw new Error('End-to-end browser acceptance failed: '+(e instanceof Error?e.message.split('Call log:')[0].split('\n')[0]:'unknown error'));}finally{await context?.close();await browser?.close();gateway.closeAllConnections();api.closeAllConnections();await Promise.all([new Promise<void>(r=>gateway.close(()=>r())),new Promise<void>(r=>api.close(()=>r()))]);}
});
