import {test} from 'node:test';
import pg from 'pg';
import {Worker} from 'node:worker_threads';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {authDatabase} from './auth-support.mjs';
import {readCombatInputs} from '../../apps/game-server/src/characters/combat-inputs.js';
import {permanentCharacterPower} from '../../apps/game-server/src/characters/power.js';
import {readFighter} from '../../apps/game-server/src/characters/fighter.js';
import {readCharacterState} from '../../apps/game-server/src/characters/state.js';
import {readBattle} from '../../apps/game-server/src/characters/battle.js';
import {readOriginalInventory} from '../../apps/game-server/src/gameplay/inventory.js';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
import {tickPartyBattles} from '../../apps/game-server/src/characters/party-worker.js';
async function actor(f:any,classId="sword"){
 const s=await f.service.login(randomUUID()+'@example.invalid','fixture'),c=await f.service.createCharacter(s.token,{name:'Batch '+randomUUID().slice(0,8),classId,factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);
 const read=()=>f.service.onlineState(s.token,c.id),command=async(action:any,payload:any={})=>f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:(await f.service.characterState(s.token,c.id)).version,control:lease,action,payload});
 for(const action of ['items.initialize','world.initialize','battle.start'])await command(action);
 return {s,c,read,command};
}
// Counts real round trips in this isolated, serial test file; never replaces PG.
async function countService(_pool:any,run:()=>Promise<any>,observe?:(sql:string)=>void){
 const query=pg.Client.prototype.query;let n=0;
 pg.Client.prototype.query=function(this:pg.Client,...args:any[]){n++;observe?.(typeof args[0]==='string'?args[0]:args[0].text);return (query as any).apply(this,args);} as any;
 try{await run();return n;}finally{pg.Client.prototype.query=query;}
}
async function party(f:any){
 const all=[];for(let i=0;i<4;i++)all.push(await actor(f));const a=all[0]!;await a.command('party.create');
 for(const u of all.slice(1)){await a.command('party.invite',{name:u.c.name});const invite=(await u.read()).party.invites.find((x:any)=>x.status==='pending');await u.command('party.respond',{inviteId:invite.id,accept:true});}
 await a.command('party.prepare',{kind:'hunt',destination:'dawn'});const nonce=(await a.read()).party.group.preparation.nonce;
 for(const u of all)await u.command('party.ready',{nonce,ready:true});await a.command('party.start',{nonce});return all;
}

test('Party monsters persist once while every member keeps the canonical presentation',async()=>authDatabase(async f=>{
 const all=await party(f),views=await Promise.all(all.map(a=>a.read())),room=(await f.pool.query('SELECT simulation FROM mare_game.party_instances WHERE id=$1',[views[0].battle.partyInstanceId])).rows[0].simulation;
 assert(room.mobs.length>0);for(const view of views)assert.deepEqual(view.battle.mobs,room.mobs);
 const rows=(await f.pool.query('SELECT simulation FROM mare_game.character_battles')).rows;
 console.log(JSON.stringify({personalBytes:rows.reduce((n,r)=>n+Buffer.byteLength(JSON.stringify(r.simulation)),0),canonicalMonsterBytes:Buffer.byteLength(JSON.stringify(room.mobs))}));
 for(const row of rows)assert.equal(row.simulation.mobs.length,0,'personal rows must not duplicate the canonical monster timeline');
}));

for(const primary of ['solo','party'] as const)test(`an idle ${primary} worker helps overdue opposite-domain work and obeys revocation`,async()=>authDatabase(async f=>{
 const a=primary==='solo'?(await party(f))[0]!:await actor(f);
 await f.pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '650 milliseconds'");await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '650 milliseconds'");
 const before=(await f.pool.query('SELECT tick_at FROM mare_game.character_battles WHERE character_id=$1',[a.c.id])).rows[0].tick_at;
 const worker=new Worker(new URL('../../apps/game-server/dist/simulation-worker.js',import.meta.url),{workerData:{databaseUrl:f.pool.options.connectionString,kind:primary,index:0,count:1},execArgv:[],env:{NODE_ENV:'test',SystemRoot:process.env.SystemRoot??''},resourceLimits:{maxOldGenerationSizeMb:256,stackSizeMb:4}});
 worker.on('error',()=>{});
 try{
  let progressed=false;
  for(let i=0;i<60;i++){const row=(await f.pool.query('SELECT tick_at FROM mare_game.character_battles WHERE character_id=$1',[a.c.id])).rows[0];if(row.tick_at>before){progressed=true;break;}await new Promise(r=>setTimeout(r,50));}
  assert.equal(progressed,true,'idle reserved CPU must help overdue work');
  await f.service.logout(a.s.token,'all');await new Promise(r=>setTimeout(r,200));
  const stopped=(await f.pool.query('SELECT tick_at FROM mare_game.character_battles WHERE character_id=$1',[a.c.id])).rows[0].tick_at;
  await new Promise(r=>setTimeout(r,650));assert.equal((await f.pool.query('SELECT tick_at FROM mare_game.character_battles WHERE character_id=$1',[a.c.id])).rows[0].tick_at.getTime(),stopped.getTime());
 }finally{if(worker.threadId!==-1){const end=new Promise(r=>worker.once('exit',r)),timeout=setTimeout(()=>{void worker.terminate();},8000);worker.postMessage('stop');await end;clearTimeout(timeout);}}
}));

test('cooperation leaves recent work to its primary lane',async()=>authDatabase(async f=>{
 const a=(await party(f))[0]!,id=(await a.read()).battle.partyInstanceId;
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '200 milliseconds' WHERE id=$1",[id]);
 const before=(await f.pool.query('SELECT tick_at FROM mare_game.party_instances WHERE id=$1',[id])).rows[0].tick_at;
 await tickPartyBattles(f.pool,undefined,200,true);
 assert.equal((await f.pool.query('SELECT tick_at FROM mare_game.party_instances WHERE id=$1',[id])).rows[0].tick_at.getTime(),before.getTime());
}));
test('solo tick stays within 22 database round trips without changing balances',async()=>authDatabase(async f=>{
 const a=await actor(f);await a.command('world.travel',{islandId:'dawn'});const before=await a.read();
 await f.pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '250 milliseconds'");
 const n=await countService(f.pool,()=>tickWorldBattles(f.pool));const after=await a.read();
 assert.deepEqual(after.state,before.state);assert.deepEqual(after.originalInventory,before.originalInventory);assert.ok(n<=22,`solo tick used ${n} queries`);
}));
test('four-member tick writes one canonical room within 52 round trips',async()=>authDatabase(async f=>{
 const all=await party(f),before=await Promise.all(all.map(a=>a.read()));
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '250 milliseconds'");
 let roomWrites=0;const n=await countService(f.pool,()=>tickPartyBattles(f.pool),sql=>{if(/^UPDATE mare_game\.party_instances SET simulation=/i.test(sql))roomWrites++;});assert.equal(roomWrites,1,'one durable canonical timeline per transaction');const after=await Promise.all(all.map(a=>a.read()));
 for(let i=0;i<4;i++){assert.deepEqual(after[i].state,before[i].state);assert.deepEqual(after[i].battle.mobs,after[0].battle.mobs);}
 assert.ok(n<=52,`Party tick used ${n} queries`);
}));
test('Party full and motion projections avoid N+1 reads without exposing private inventory',async()=>authDatabase(async f=>{
 const [a]=await party(f);let full:any,frame:any;
 const fullN=await countService(f.pool,async()=>{full=await a!.read();});
 const frameN=await countService(f.pool,async()=>{frame=await f.service.onlineFrame(a!.s.token,a!.c.id);});
 assert.equal(full.party.group.members.length,4);assert.equal(frame.partyMotion.group.members.length,4);
 for(const m of full.party.group.members)for(const field of ['inventory','potions','materials','accountId','sessionId'])assert.equal(m[field],undefined);
 assert.ok(fullN<=80,`full Party projection used ${fullN} queries`);assert.ok(frameN<=32,`Party frame used ${frameN} queries`);
}));

test('batched fighters match original formulas for all seven classes and retain no stale data',async()=>authDatabase(async f=>{
 const all:Awaited<ReturnType<typeof actor>>[]=[];for(const classId of ['sword','brawler','gunner','rogue','cyborg','strategist','healer'])all.push(await actor(f,classId));
 const c=await f.pool.connect();try{
  await c.query('BEGIN');
  for(let start=0;start<all.length;start+=4){
   const group=all.slice(start,start+4),inputs=await readCombatInputs(c,group.map(a=>a.c.id));
   for(const a of group){const state=await readCharacterState(c,a.c.id),battle=await readBattle(c,a.c.id),input=inputs.get(a.c.id)!;
    assert.deepEqual(input.state,state);assert.equal(input.permanentPower(),await permanentCharacterPower(c,a.c.id,state));assert.deepEqual(input.inventory,await readOriginalInventory(c,a.c.id));
    assert.deepEqual(input.fighter(battle),await readFighter(c,a.c.id,state));
   }
  }
  const id=all[0]!.c.id,first=(await readCombatInputs(c,[id])).get(id)!;
  await c.query('UPDATE mare_game.character_progression SET level=2 WHERE character_id=$1',[id]);
  await c.query("UPDATE mare_game.character_profile SET preferences=jsonb_set(preferences,'{healThreshold}','0.4') WHERE character_id=$1",[id]);
  await c.query('UPDATE mare_game.game_inventory SET potions=potions+1 WHERE character_id=$1',[id]);
  const next=(await readCombatInputs(c,[id])).get(id)!;
  assert.equal(first.state.level,1);assert.equal(next.state.level,2);assert.equal(next.preferences.healThreshold,.4);assert.equal(next.inventory!.potions,first.inventory!.potions+1);
  await c.query('ROLLBACK');
  assert.equal((await readCombatInputs(c,[id])).get(id)!.state.level,1,'rollback cannot leave cached projections');
 }finally{await c.query('ROLLBACK');c.release();}
}));
test('batch path retains inventory owner validation and rejects corrupt foreign-bound items',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f),before=await a.read(),foreign=structuredClone(before.originalInventory.inventory);
 foreign[0].boundToCharacter=b.c.id;
 await f.pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(foreign)]);
 const c=await f.pool.connect();try{await assert.rejects(readCombatInputs(c,[a.c.id]),{code:'original_inventory_unavailable'});}finally{c.release();}
}));
test('full solo projection reuses authenticated inputs within a 65-query budget',async()=>authDatabase(async f=>{
 const a=await actor(f);let full:any;
 const n=await countService(f.pool,async()=>{full=await a.read();});
 assert.equal(full.state.characterId,a.c.id);assert.equal(full.combatPreview.rulesetId,'original-character-v1');
 assert.ok(n<=65,`solo full projection used ${n} queries`);
}));

test('revocation committed between roster read and peer locking prevents that actor from ticking',async()=>authDatabase(async f=>{
 const all=await party(f),target=all[1]!;await target.command('battle.auto',{enabled:true});
 await f.pool.query("UPDATE mare_game.party_instances SET tick_at=clock_timestamp()-interval '250 milliseconds'");
 const before=(await f.pool.query('SELECT tick_at FROM mare_game.character_battles WHERE character_id=$1',[target.c.id])).rows[0].tick_at;
 const query=pg.Client.prototype.query;let revoked=false;
 pg.Client.prototype.query=function(this:pg.Client,...args:any[]){
  const sql=typeof args[0]==='string'?args[0]:args[0].text,value=(query as any).apply(this,args);
  if(!revoked&&sql.includes('FROM mare_game.party_members m JOIN mare_game.characters')){
   revoked=true;return Promise.resolve(value).then(async result=>{
    await f.pool.query('UPDATE mare_game.app_sessions SET revoked_at=clock_timestamp() WHERE account_id=(SELECT account_id FROM mare_game.characters WHERE id=$1)',[target.c.id]);return result;
   });
  }return value;
 } as any;
 try{await tickPartyBattles(f.pool);}finally{pg.Client.prototype.query=query;}
 const after=(await f.pool.query('SELECT tick_at,simulation FROM mare_game.character_battles WHERE character_id=$1',[target.c.id])).rows[0];
 assert.equal(revoked,true);assert.equal(after.simulation.auto,false);assert.deepEqual(after.tick_at,before);
}));

test('Party projection preserves legacy characters before inventory and battle opt-in',async()=>authDatabase(async f=>{
 const all=[];for(let i=0;i<2;i++){
  const s=await f.service.login(randomUUID()+'@example.invalid','fixture'),c=await f.service.createCharacter(s.token,{name:'Legacy '+randomUUID().slice(0,8),classId:'sword',factionId:'pirate'}),lease=await f.service.acquireControl(s.token,c.id);
  const command=async(action:any,payload:any={})=>f.service.command(s.token,c.id,{requestId:randomUUID(),expectedVersion:(await f.service.characterState(s.token,c.id)).version,control:lease,action,payload});all.push({s,c,command});
 }
 const a=all[0]!,b=all[1]!;await a.command('party.create');await a.command('party.invite',{name:b.c.name});
 const pending=await f.service.onlineState(b.s.token,b.c.id);await b.command('party.respond',{inviteId:pending.party!.invites[0]!.id,accept:true});
 const full=await f.service.onlineState(a.s.token,a.c.id);
 assert.equal(full.party!.group!.members.length,2);assert.equal(full.combatPreview.rulesetId,'online-combat-v2');assert.equal(full.originalInventory,undefined);
}));
