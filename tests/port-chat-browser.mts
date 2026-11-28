import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:https';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {authDatabase} from './integration/auth-support.mjs';
import {createAuthHandler} from '../apps/game-server/src/auth/routes.js';
const {chromium}=createRequire(import.meta.url)('playwright');

await authDatabase(async({service,vault})=>{
  const certificate=await createRequire(import.meta.url)('selfsigned').generate([{name:'commonName',value:'localhost'}]);
  const server=createServer({key:certificate.private,cert:certificate.cert});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const address=server.address();
  assert(address&&typeof address==='object');
  const origin='https://127.0.0.1:'+address.port;
  const handle=createAuthHandler({service,vault,origin,cookieSeconds:600});
  server.on('request',(req,res)=>{
    if(req.url?.startsWith('/v1/')){void handle(req,res);return;}
    if(req.url==='/ui.js'||req.url==='/session.js'){
      res.setHeader('content-type','text/javascript');
      res.end(readFileSync(req.url==='/ui.js'?'ui-system.js':'apps/account-client/game-session.js'));return;
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<body><section class="hud-open"><nav><button aria-pressed="true" data-chat-channel="all">Geral</button></nav><div id="gameLog"></div><form id="chatForm"><input/><button>Enviar</button></form></section><script src="/session.js"></script><script src="/ui.js"></script><script>const api=MareGameSession.api;api("/v1/me").then(data=>MareUI.mountPortChat(document.querySelector("section"),document.querySelector("nav"),gameLog,{api,data,available:true,controlled:true}));</script>');
  });
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});
  try{
    async function join(name:string,width:number){
      const {token}=await service.login(randomUUID()+'@example.invalid','fixture');
      const {id}=await service.createCharacter(token,{name,classId:'sword',factionId:'pirate'});
      await service.acquireControl(token,id);
      const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height:760}});
      await context.addCookies([{name:'__Host-mare_session',value:token,url:origin,httpOnly:true}]);
      const page=await context.newPage();
      page.on('pageerror',(error:Error)=>console.error(error.message));
      page.on('response',(r:any)=>{if(r.status()>=400)console.error(new URL(r.url()).pathname,r.status());});
      await page.goto(origin);
      await page.getByPlaceholder('Mensagem para todos…').waitFor();
      return page;
    }
    const a=await join('Capitã',1366),b=await join('Marujo',393);
    for(const [sender,reader,message] of [[a,b,'Olá <b>porto</b>'],[b,a,'Recebido!']]){
      await sender.locator('input').fill(message);
      await sender.getByRole('button',{name:'Enviar ao chat geral'}).click();
      await reader.locator('[data-port-message]').filter({hasText:message}).waitFor({timeout:12000});
    }
    assert.equal(await b.locator('#gameLog b').count(),0);
    await b.reload();await b.locator('[data-port-message]').filter({hasText:'Recebido!'}).waitFor();
    assert.equal(await b.locator('[data-port-message]').count(),2);
    console.log('Two browser sessions exchanged both messages through the real HTTP API and PostgreSQL; history survived reload.');
  }finally{await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
