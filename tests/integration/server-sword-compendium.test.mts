import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {authDatabase} from './auth-support.mjs';
import {openDailySwords} from '../../apps/game-server/src/characters/daily-sword-event.js';
import {tickWeeklyBosses} from '../../apps/game-server/src/characters/weekly-boss-worker.js';
import {sendOfficialMail} from '../../apps/game-server/src/characters/mail.js';
import {swordAttachments} from '../../apps/game-server/src/characters/sword-collection-store.js';
import {itemTradeRestriction} from '../../apps/game-server/src/characters/item-negotiability.js';

async function actor(f:any){
 const login=await f.service.login(randomUUID()+'@example.invalid','fixture');
 const {id}=await f.service.createCharacter(login.token,{name:'Lamina '+randomUUID().slice(0,8),classId:'sword',factionId:'pirate'});
 const lease=await f.service.acquireControl(login.token,id),read=()=>f.service.onlineState(login.token,id);
 const command=async(action:string,payload:any={})=>({requestId:randomUUID(),expectedVersion:(await read()).state.version,action,payload,control:{epoch:lease.epoch,token:lease.token}});
 const send=(input:any)=>f.service.command(login.token,id,input);
 const act=async(action:string,payload:any={})=>send(await command(action,payload));
 for(const op of ['items.initialize','world.initialize','battle.start'])await act(op);
 return {id,read,command,send,act};
}
test('two players share the sword arena, both earn individual receipts and return to port on victory',async()=>authDatabase(async f=>{
 const a=await actor(f),b=await actor(f);
 await f.pool.query('UPDATE mare_game.character_progression SET level=100 WHERE character_id=ANY($1::uuid[])',[[a.id,b.id]]);
 const timing=(await f.pool.query("SELECT (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date::text AS day")).rows[0].day;
 const opening=new Date(timing+'T20:00:00-03:00'),client=await f.pool.connect();
 let roomRow:any;
 try{
  await client.query('BEGIN');
  await assert.rejects(openDailySwords(client,a.id,new Date(opening.getTime()-1)),{code:'sword_event_closed'});
  roomRow=await openDailySwords(client,a.id,opening);
  assert.equal((await openDailySwords(client,b.id,opening)).id,roomRow.id);
  await client.query('COMMIT');
 }finally{client.release();}
 const id=roomRow.id,mob=roomRow.simulation.mobs[0];
 // Scale the fight down while retaining real hits and the worker's reward logic.
 mob.hp=25000;mob.nextPunchAt=Date.now()+1e8;mob.nextAoeAt=Date.now()+1e8;
 await f.pool.query("UPDATE mare_game.weekly_boss_events SET simulation=$2, opened_at=clock_timestamp()-interval '10 seconds',closes_at=clock_timestamp()+interval '10 minutes' WHERE id=$1",[id,roomRow.simulation]);
 for(const who of [a,b]){
  await who.act('weeklyBoss.execute',{op:'join',eventId:id});
  const view=await who.read();assert.equal(view.world.mapId,'arena-espadachins');assert.equal(view.battle.mobs[0].type,mob.type);
  await f.pool.query("UPDATE mare_game.character_world SET x=$2,y=$3,path='[]',speed=0 WHERE character_id=$1",[who.id,mob.x+20,mob.y]);
 }
 const live=async()=>(await f.pool.query('SELECT status,simulation FROM mare_game.weekly_boss_events WHERE id=$1',[id])).rows[0];
 async function attack(){
  for(const who of [a,b])await who.read();
  for(const who of [a,b])await f.pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{pending}',$2) WHERE character_id=$1",[who.id,JSON.stringify({targetId:mob.id,remaining:0})]);
  await f.pool.query("UPDATE mare_game.weekly_boss_events SET tick_at=clock_timestamp()-interval '160 milliseconds' WHERE id=$1",[id]);
  assert.equal(await tickWeeklyBosses(f.pool),1);
 }
 for(let i=0;i<12;i++){
  const {contributions}=(await live()).simulation;if(contributions[a.id]?.damage&&contributions[b.id]?.damage)break;await attack();
 }
 const after=await live();
 assert(after.simulation.contributions[a.id]?.damage>0);
 assert(after.simulation.contributions[b.id]?.damage>0);
 after.simulation.mobs[0].hp=1;
 await f.pool.query('UPDATE mare_game.weekly_boss_events SET simulation=$2 WHERE id=$1',[id,after.simulation]);
 for(let i=0;i<12&&(await live()).status==='active';i++)await attack();
 assert.equal((await live()).status,'won');
 const result=()=>f.pool.query('SELECT character_id,loot FROM mare_game.daily_sword_victories WHERE event_id=$1 ORDER BY character_id',[id]);
 const receipts=(await result()).rows;
 assert.deepEqual(receipts.map(r=>r.character_id),[a.id,b.id].sort());
 for(const who of [a,b]){
  const view=await who.read();
  assert.equal(view.world.mapId,'lobby');assert.equal(view.weeklyBoss.daily.status,'won');
  await assert.rejects(who.act('weeklyBoss.execute',{op:'join',eventId:id}),{code:'weekly_boss_event_unavailable'});
 }
 await tickWeeklyBosses(f.pool);
 assert.deepEqual((await result()).rows,receipts);
 const delivery=(await f.pool.query('SELECT character_id,attachments FROM mare_game.social_mail WHERE source_id=$1',[id])).rows;
 assert(delivery.length>=2);assert(delivery.every(row=>row.attachments.every((it:any)=>itemTradeRestriction(it)===null)));
}));

test('claiming fragments fills the sword counter with a full bag and activation preserves three tradable extras in mail',async()=>authDatabase(async f=>{
 const a=await actor(f),id=a.id;
 const mail=async(rewardId:string,n:number)=>{
  const c=await f.pool.connect();
  try{return await sendOfficialMail(c,id,{source:'system',sourceId:'fixture',rewardId,title:'Fragmentos',message:'Teste',makeAttachments:()=>swordAttachments({bamboo:n},'Teste')});}
  finally{c.release();}
 };
 const bag=(draft:any)=>(draft.originalInventory?.inventory??[]);
 const fillers=swordAttachments({nakiri:99999*120},'Teste');
 await f.pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[id,JSON.stringify(fillers)]);
 const letter=await mail('first',18);
 await a.act('mail.claim',{mailId:letter});
 const before=await a.read();
 assert.equal(before.state.swords.bamboo.fragments,18);assert.equal(bag(before).length,120);
 await assert.rejects(a.act('swords.activate',{swordId:'bamboo'}),{code:'sword_activation_unavailable'});
 await a.act('mail.claim',{mailId:await mail('second',5)});
 assert.equal((await a.read()).state.swords.bamboo.fragments,23);
 const cmd=await a.command('swords.activate',{swordId:'bamboo'});
 assert.deepEqual(await a.send(cmd),await a.send(cmd));
 const activated=await a.read();
 assert.deepEqual(activated.state.swords.bamboo,{active:true,fragments:0});assert.equal(bag(activated).length,120);
 const pending=(await f.pool.query("SELECT id,attachments FROM mare_game.social_mail WHERE character_id=$1 AND source_id='sword-activation:bamboo'",[id])).rows;
 assert.equal(pending.length,1);assert.equal(pending[0].attachments[0].qty,3);
 await a.act('mail.claim',{mailId:pending[0].id});
 assert.equal((await f.pool.query('SELECT claimed_at FROM mare_game.social_mail WHERE id=$1',[pending[0].id])).rows[0].claimed_at,null);
 await f.pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[id,JSON.stringify(fillers.slice(0,-1))]);
 await a.act('mail.claim',{mailId:pending[0].id});
 const last=await a.read(),surplus=bag(last).find((it:any)=>it.qty===3);
 assert(surplus);assert.equal(itemTradeRestriction(surplus),null);
}));
