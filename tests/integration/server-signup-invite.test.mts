import assert from 'node:assert/strict';
import {test} from 'node:test';
import {once} from 'node:events';
import {AuthService} from '../../apps/game-server/src/auth/service.js';
import {AuthFault} from '../../apps/game-server/src/auth/errors.js';
import {digest} from '../../apps/game-server/src/auth/vault.js';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {authDatabase} from './auth-support.mjs';

const code='isolated-test-invitation-12345678',origin='https://localhost:9443';
const gated=(f:any)=>new AuthService({pool:f.pool,provider:f.provider,vault:f.vault,origin,
 policy:{absoluteMs:86400000,idleMs:7200000,recheckMs:900000},signupInviteHash:digest(code)} as any);

test('signup requires a valid invitation before contacting the provider, with CSRF and strict fields',async()=>authDatabase(async f=>{
 const service=gated(f),server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault:f.vault,origin,cookieSeconds:86400})});
 let sends=0;const start=f.provider.start.bind(f.provider);f.provider.start=async(...args)=>{sends++;return start(...args);};
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 try{
  const pre=await fetch(base+'/v1/auth/csrf'),csrf=(await pre.json()).csrfToken,cookie=pre.headers.getSetCookie()[0]!.split(';')[0]!;
  const credentials={email:'invited@example.invalid',password:'Isolated fixture password'};
  const post=(payload:unknown,csrfToken=csrf)=>fetch(base+'/v1/auth/signup',{method:'POST',headers:{origin,cookie,'content-type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify(payload)});
  for(const payload of [credentials,{...credentials,inviteCode:'incorrect'}]){
   const r=await post(payload);assert.equal(r.status,403);assert.equal((await r.json()).error,'invitation_invalid');
  }
  assert.equal(sends,0,'invalid invitations cannot spend an SMTP send');
  assert.equal((await post({...credentials,inviteCode:code},'wrong')).status,403);
  assert.equal((await post({...credentials,inviteCode:code,ownerId:'forged'})).status,400);
  const ok=await post({...credentials,inviteCode:code});assert.equal(ok.status,202);assert.equal(sends,1);
  assert.ok(ok.headers.getSetCookie().some(c=>c.startsWith('__Host-mare_flow=')));
  assert.ok(!JSON.stringify(await ok.json()).includes(code));
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.accounts')).rows[0].n,0,'requesting confirmation cannot create an authenticated account');
  const admissions=await f.pool.query('SELECT * FROM mare_game.signup_admissions');assert.equal(admissions.rowCount,1);
  assert.ok(!JSON.stringify(admissions.rows).includes(credentials.email));assert.ok(!JSON.stringify(admissions.rows).includes(code));
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

test('provider-only signup cannot bypass admission; existing accounts and valid invited confirmation remain usable',async()=>authDatabase(async f=>{
 const existing=await f.service.login('existing@example.invalid','fixture');
 const character=await f.service.createCharacter(existing.token,{name:'Preservado',classId:'sword',factionId:'pirate'});
 const service=gated(f);
 await assert.rejects(service.login('outside@example.invalid','fixture'),{code:'invitation_required'});
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.accounts')).rows[0].n,1);
 await service.drainRevocations();assert.equal(f.provider.logouts,1,'refused provider session is revoked');
 assert.equal((await service.me((await service.login('existing@example.invalid','fixture')).token)).character?.id,character.id);
 const oldFlow=await f.service.startFlow('signup','old-flow@example.invalid','fixture','original-browser');
 await assert.rejects(service.callback(oldFlow.token,'original-browser','fixture-code'),{code:'invitation_required'});
 const flow=await (service.startFlow as any)('signup','invited@example.invalid','fixture','original-browser',code);
 await assert.rejects(service.callback(flow.token,'different-browser','fixture-code'),{code:'invalid_auth_flow'});
 const confirmed=await service.callback(flow.token,'original-browser','fixture-code');assert.ok((await service.me(confirmed.token)).account.id);
 await assert.rejects(service.callback(flow.token,'original-browser','fixture-code'),{code:'invalid_auth_flow'});
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.signup_admissions')).rows[0].n,0,'admission is consumed atomically');
 assert.equal((await service.me((await service.login('invited@example.invalid','fixture')).token)).account.id,(await service.me(confirmed.token)).account.id);
 assert.equal((await service.me(existing.token)).character?.id,character.id);
}));

test('invited login still requires provider confirmation and consumes admission once under concurrency',async()=>authDatabase(async f=>{
 const service=gated(f),login=f.provider.login.bind(f.provider);let confirmed=false;
 f.provider.login=async(email,password)=>{if(!confirmed)throw new AuthFault(401,'authentication_failed');return login(email,password);};
 await (service.startFlow as any)('signup','confirmed@example.invalid','fixture','browser',code);
 await assert.rejects(service.login('confirmed@example.invalid','fixture'),{code:'authentication_failed'});
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.accounts')).rows[0].n,0);
 confirmed=true;
 const sessions=await Promise.all([service.login('confirmed@example.invalid','fixture'),service.login('confirmed@example.invalid','fixture')]);
 const accounts=await Promise.all(sessions.map(s=>service.me(s.token)));assert.equal(accounts[0]!.account.id,accounts[1]!.account.id);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.signup_admissions')).rows[0].n,0);
 await (service.startFlow as any)('signup','expired@example.invalid','fixture','browser',code);
 await f.pool.query("UPDATE mare_game.signup_admissions SET expires_at=clock_timestamp()-interval '1 second'");
 await assert.rejects(service.login('expired@example.invalid','fixture'),{code:'invitation_required'});
}));

test('a failed browser callback gives safe guidance without confirming or admitting anyone',async()=>authDatabase(async f=>{
 const service=gated(f),server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault:f.vault,origin,cookieSeconds:86400})});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 try{
  const raw=await fetch(base+'/v1/auth/callback?code=do-not-reflect', {redirect:'manual'});
  assert.equal(raw.status,400);assert.deepEqual(await raw.json(),{error:'invalid_auth_flow'});
  const browser=await fetch(base+'/v1/auth/callback?code=do-not-reflect&next=https://example.invalid',{headers:{accept:'text/html,application/xhtml+xml'},redirect:'manual'});
  assert.equal(browser.status,303);
  assert.equal(browser.headers.get('location'),'/online/?auth_error=invalid_auth_flow');
  assert.equal(browser.headers.get('cache-control'),'no-store');
  assert.equal(browser.headers.get('referrer-policy'),'no-referrer');
  assert.equal(browser.headers.get('set-cookie'),null,'a failed callback must not issue or replace a session');
  assert.equal((await fetch(base+'/v1/me')).status,401);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.accounts')).rows[0].n,0);
  await assert.rejects(service.login('outside@example.invalid','fixture'),{code:'invitation_required'});
  const recover=await service.startFlow('recovery','outside@example.invalid',undefined,'browser');
  await assert.rejects(service.callback(recover.token,'browser','fixture-code'),{code:'invitation_required'});
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

test('provider confirmation followed by a wrong-browser callback is distinct from login before confirmation',async()=>authDatabase(async f=>{
 const service=gated(f),login=f.provider.login.bind(f.provider);let confirmed=false;
 f.provider.login=async(email,password)=>{if(!confirmed)throw new AuthFault(401,'authentication_failed');return login(email,password);};
 const flow=await service.startFlow('signup','confirmed-elsewhere@example.invalid','fixture','original-browser',code);
 await assert.rejects(service.login('confirmed-elsewhere@example.invalid','fixture'),{code:'authentication_failed'});
 // The provider verifies the email before redirecting to the BFF. The wrong browser has no PKCE binding.
 confirmed=true;
 await assert.rejects(service.callback(flow.token,'other-browser','fixture-code'),{code:'invalid_auth_flow'});
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.accounts')).rows[0].n,0);
 const session=await service.login('confirmed-elsewhere@example.invalid','fixture');
 assert.ok((await service.me(session.token)).account.id);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM mare_game.signup_admissions')).rows[0].n,0);
}));
