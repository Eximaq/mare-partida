import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {authDatabase} from './auth-support.mjs';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
test('light frame is owner-only, versioned, no-store and cannot write economic fields',async()=>authDatabase(async f=>{
 const a=await f.service.login('frame-a@example.invalid','fixture'),b=await f.service.login('frame-b@example.invalid','fixture');
 const c=await f.service.createCharacter(a.token,{name:'Frame',classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(a.token,c.id);
 const cmd=async(action:any,payload:any={})=>{const s=await f.service.characterState(a.token,c.id);await f.service.command(a.token,c.id,{requestId:randomUUID(),expectedVersion:s.version,control:lease,action,payload});};
 for(const action of ['items.initialize','world.initialize','battle.start'])await cmd(action);
 const full=await f.service.onlineState(a.token,c.id);assert.equal((full as any).sync?.protocol,1);
 const api=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600})});api.listen(0,'127.0.0.1');await once(api,'listening');
 const base=`http://127.0.0.1:${(api.address() as any).port}`,path=`/v1/characters/${c.id}/frame`,get=(token=a.token,suffix='')=>fetch(base+path+suffix,{headers:{cookie:`__Host-mare_session=${token}`}});
 try{
  const r=await get();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('server-timing')||'',/^app;dur=/);
  const frame=await r.json();assert.equal(frame.protocol,1);assert.equal(frame.characterId,c.id);assert.equal(frame.version,full.state.version);assert.equal(frame.world.mapId,full.world!.mapId);assert.equal(frame.battle.seq,full.battle.seq);assert.ok(Number.isFinite(Date.parse(frame.serverNow)));assert.ok(frame.simulationAgeMs>=0);
  for(const field of ['accountId','ownerId','inventory','originalInventory','gold','token'])assert.equal(frame[field],undefined);
  assert.ok(JSON.stringify(frame).length<JSON.stringify(full).length*.8,'frame omits expensive static projections');
  assert.equal((await get(b.token)).status,404);
  for(const field of ['accountId','ownerId','characterId','gold'])assert.equal((await get(a.token,`?${field}=forged`)).status,400);
  assert.equal((await fetch(base+path,{method:'POST'})).status,405);
  assert.deepEqual(await f.service.characterState(a.token,c.id),full.state);
  await f.service.logout(a.token,'all');assert.equal((await get()).status,401);
 }finally{api.closeAllConnections();await new Promise<void>(r=>api.close(()=>r()));}
}));

test('navigation migration advances only audited map hash and preserves unknown versions',async()=>authDatabase(async f=>{
 const {readFile}=await import('node:fs/promises');const keys:string[]=[];
 for(let i=0;i<2;i++){const s=await f.service.login(`map-${i}@example.invalid`,'fixture'),c=await f.service.createCharacter(s.token,{name:'Map '+i,classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);await f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:0,control:lease,action:'world.initialize',payload:{}});keys.push(c.id);}
 const old='6677e2ee6b208c4f1249f5373942fd3c1aaef8dd4bef26f339891254d85c0b0a';
 await f.pool.query('UPDATE mare_game.character_world SET rules_hash=$2 WHERE character_id=$1',[keys[0],old]);await f.pool.query('UPDATE mare_game.character_world SET rules_hash=$2 WHERE character_id=$1',[keys[1],'a'.repeat(64)]);
 const before=(await f.pool.query('SELECT character_id,x,y,path FROM mare_game.character_world ORDER BY character_id')).rows;
 await f.pool.query(await readFile('apps/game-server/migrations/0033_navigation_memo.sql','utf8'));
 const rows=(await f.pool.query('SELECT character_id,rules_hash FROM mare_game.character_world')).rows;
 assert.equal(rows.find(r=>r.character_id===keys[1]).rules_hash,'a'.repeat(64));assert.notEqual(rows.find(r=>r.character_id===keys[0]).rules_hash,old);
 assert.deepEqual((await f.pool.query('SELECT character_id,x,y,path FROM mare_game.character_world ORDER BY character_id')).rows,before);
}));
