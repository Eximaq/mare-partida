import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {authDatabase} from './auth-support.mjs';
import {createHttpServer} from '../../apps/game-server/src/http.js';
import {createAuthHandler} from '../../apps/game-server/src/auth/routes.js';
import {characterCommandSchema} from '@mare/shared';
import {tickWorldBattles} from '../../apps/game-server/src/characters/battle.js';
const require=createRequire(import.meta.url),A=require('../../character-appearance.js'),T=require('../../talent-system.js');
async function actor(f:any,cls='sword'){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture'),c=await f.service.createCharacter(login.token,{name:'Navegante',classId:cls,factionId:'pirate'}),lease=await f.service.acquireControl(login.token,c.id),read=()=>f.service.onlineState(login.token,c.id);
 const input=async(action:string,payload:any={})=>characterCommandSchema.parse({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}}),send=async(action:string,payload:any={})=>f.service.command(login.token,c.id,await input(action,payload));
 await send('items.initialize');await send('world.initialize');await send('battle.start');return{login,c,lease,read,input,send};
}
test('every command rejects injected authority, foreign character, absent CSRF and obsolete controller',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f),ids=['items.equip','items.sell','items.open-box','items.use-xp-boost','fruit.register','haki.unlock','dungeon.acknowledge'],empty=['state.sync','journey.begin','hunt.begin','hunt.claim','combat.begin','combat.attack','combat.claim','items.initialize','potions.buy','potions.use','world.initialize','world.stop','world.return','battle.start','battle.first','talents.reset','haki.cast'];
 const values:any=Object.fromEntries([...ids.map(k=>[k,{itemId:'fixture-owned-item'}]),...empty.map(k=>[k,{}])]);Object.assign(values,{
 'profile.appearance':{appearance:A.defaults},'profile.preferences':{hideItems:true},'profile.identity':{name:'Navegante',classId:'sword',factionId:'pirate',appearance:A.defaults},'fruit.cast':{key:'1'},'fruit.transform':{enabled:true},'fruit.move':{x:10,y:10},'hierarchy.promote':{expectedTier:1},'haki.invest':{nodeId:'coating',expectedSeq:0},'haki.configure':{branch:'armament',enabled:true},'haki.toggle':{branch:'armament'},'dungeon.enter':{dungeonId:'alvida'},'dungeon.claim':{dungeonId:'alvida'},'dungeon.craft':{expectedSeq:0},'prison.prepare':{floor:1},'prison.enter':{floor:1},'prison.claim':{floor:5},'achievement.claim':{achievementId:'kills-0'},'talents.commit':{build:T.empty()},'attributes.allocate':{allocation:{strength:1,dexterity:0,vitality:0,intelligence:0,spirit:0}},'inventory.buy':{itemId:'training-weapon-v1',quantity:1},'inventory.sell':{itemId:'training-weapon-v1',quantity:1},'equipment.equip':{itemId:'training-weapon-v1'},'equipment.unequip':{slot:'weapon'},'items.unequip':{slot:'weapon'},'items.lock':{itemId:'fixture-owned-item',locked:true},'forge.execute':{operation:{type:'upgrade',itemId:'fixture-owned-item',expectedSeq:0}},'world.move':{x:10,y:10},'world.travel':{islandId:'dawn'},'battle.auto':{enabled:true},'battle.target':{targetId:null},'battle.skill':{index:0},'contract.claim':{contractId:'crab'},'party.create':{},'party.leave':{},'party.invite':{name:'Navegante'},'party.respond':{inviteId:randomUUID(),accept:true},'party.kick':{memberId:randomUUID()},'party.promote':{memberId:randomUUID()},'party.prepare':{kind:'hunt',destination:'dawn'},'party.ready':{nonce:randomUUID(),ready:true},'party.start':{nonce:randomUUID()}});
 const expected=characterCommandSchema.options.flatMap(s=>{const a:any=s.shape.action;return a.options??[a.value];});assert.deepEqual(Object.keys(values).sort(),expected.sort(),'new actions must be added to the adversarial matrix');
 const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service:f.service,vault:f.vault,origin:'https://localhost:9443',cookieSeconds:3600})});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`,before=await a.read();
 const post=async(v:any,id:string,csrf=true)=>{const r=await fetch(base+`/v1/characters/${id}/commands`,{method:'POST',headers:{'content-type':'application/json',origin:'https://localhost:9443',cookie:`__Host-mare_session=${a.login.token}`,...(csrf?{'x-csrf-token':f.vault.csrf(a.login.token)}:{})},body:JSON.stringify(v)});await r.arrayBuffer();return r.status;};
 try{await f.service.acquireControl(a.login.token,a.c.id,a.lease.epoch);for(const [action,payload]of Object.entries(values)){
 const v=await a.input(action,payload);for(const k of ['ownerId','accountId','characterId','gold','xp','damage','hp','now','cooldown','reward','rng'])assert(!characterCommandSchema.safeParse({...v,payload:{...payload as any,[k]:999}}).success,action+':'+k);
 assert.equal(await post(v,a.c.id,false),403,action+' CSRF');assert.equal(await post(v,b.c.id),404,action+' foreign');assert.equal(await post({...v,payload:{...payload as any,ownerId:a.c.id}},a.c.id),400,action+' injection');assert.equal(await post(v,a.c.id),409,action+' stale control');
 }const after=await a.read();assert.deepEqual(after.state,before.state);assert.deepEqual(after.originalInventory,before.originalInventory);console.log(JSON.stringify({adversarialActions:expected.length,deniedRequests:expected.length*4,authorityFields:expected.length*11}));
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));
test('twelve original worlds advance together without starvation, double reward or expired-controller progress',async()=>authDatabase(async f=>{
 const actors=[];for(let i=0;i<12;i++){const a=await actor(f,['sword','brawler','gunner','rogue','cyborg','strategist','healer'][i%7]);await a.send('world.travel',{islandId:'dawn'});const b=(await a.read()).battle,m=b.mobs.find((m:any)=>m.spawnId==='beach-corsarios-1');assert(m);m.patrolTarget={x:1509.7901182151293,y:1594.6806719081092};m.patrolClock=8;await f.pool.query('UPDATE mare_game.character_battles SET simulation=$2 WHERE character_id=$1',[a.c.id,JSON.stringify(b)]);actors.push(a);}
 const times=[];for(let i=0;i<4;i++){
  await f.pool.query("UPDATE mare_game.character_battles SET tick_at=clock_timestamp()-interval '300 milliseconds'");const start=performance.now();assert.equal(await tickWorldBattles(f.pool),12);times.push(Math.round(performance.now()-start));
 }
 for(const a of actors){const o=await a.read();assert(o.battle.metrics.seconds>=1.2-1e-9,JSON.stringify({seconds:o.battle.metrics.seconds,times}));assert.equal(o.battle.mobs.length,14);assert.equal(o.state.gold,'120');}
 await Promise.all(actors.map(a=>f.service.logout(a.login.token,'all')));const before=(await f.pool.query('SELECT character_id,simulation FROM mare_game.character_battles ORDER BY character_id')).rows;assert.equal(await tickWorldBattles(f.pool),0);assert.deepEqual((await f.pool.query('SELECT character_id,simulation FROM mare_game.character_battles ORDER BY character_id')).rows,before);
 console.log(JSON.stringify({worlds:12,monsters:168,batches:4,maxBatchMs:Math.max(...times),averageBatchMs:Math.round(times.reduce((a,b)=>a+b,0)/times.length)}));
}));

test('navigation upgrade changes only the known hash, preserves all rows and fails closed for unknown rules',async()=>authDatabase(async f=>{
 const {readFile}=await import('node:fs/promises'),a=await actor(f),b=await actor(f),old='76e9e8b995af3a5fcdbd12e34a8d4b280ac276c95e59f3e42e0a81a4825806b5',current=require('../../world-catalog.cjs').load().rulesHash;
 await f.pool.query('UPDATE mare_game.character_world SET rules_hash=$2 WHERE character_id=$1',[a.c.id,old]);
 await f.pool.query('UPDATE mare_game.character_world SET rules_hash=$2 WHERE character_id=$1',[b.c.id,'f'.repeat(64)]);
 const tables=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='mare_game' ORDER BY tablename")).rows.map(r=>r.tablename);
 const snapshot=async()=>{const out:Record<string,unknown>={};for(const t of tables){assert.match(t,/^[a-z_]+$/);out[t]=(await f.pool.query(`SELECT to_jsonb(t) row FROM mare_game.${t} t ORDER BY to_jsonb(t)::text`)).rows.map(r=>t==='character_world'?{...r.row,rules_hash:r.row.character_id===a.c.id?'known':r.row.rules_hash}:r.row);}return out;};
 const before=await snapshot(),sql=(await Promise.all(['0030_navigation_broadphase.sql','0031_navigation_terminal_edges.sql','0033_navigation_memo.sql','0034_navigation_open_mask.sql','0035_skypiea_catalog.sql','0036_skypiea_map_refresh.sql','0041_progression_hud_balance.sql'].map(name=>readFile(new URL('../../apps/game-server/migrations/'+name,import.meta.url),'utf8')))).join('\n');
 await f.pool.query(sql);await f.pool.query(sql);assert.deepEqual(await snapshot(),before);
 assert.equal((await f.pool.query('SELECT rules_hash FROM mare_game.character_world WHERE character_id=$1',[a.c.id])).rows[0].rules_hash,current);
 await a.read();await assert.rejects(b.read(),{code:'world_rules_changed'});
}));
