import {recordDailyProgress} from './contracts.js';
import {grantWeeklyBossLoot} from './weekly-boss-loot.js';
import type {Pool} from 'pg';
import {randomInt,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {partition,type SimulationPartition} from '../simulation-partition.js';
import {simulationBudget} from '../simulation-budget.js';
import {lockPeer} from './party.js';
import {readBattleRows,storeBattle} from './battle.js';
import {readWorlds,storeWorld} from './world.js';
import {readCharacterState} from './state.js';
import {awardWorldLoot} from '../gameplay/inventory.js';
import {digest} from '../auth/vault.js';
import {weeklyRoster,storeWeeklyRoom,weeklyAudit} from './weekly-boss-store.js';
import {leaveWeeklyBoss,weeklyInputs} from './weekly-boss.js';
const require=createRequire(import.meta.url),S=require('../../../../weekly-boss-battle.cjs'),R=require('../../../../weekly-boss-rules.cjs'),A=require('../../../../akainu-combat.js'),E=require('../../../../world-battle.cjs'),maps=require('../../../../world-catalog.cjs').load;
const rng=()=>randomInt(0,0x100000000)/0x100000000;
/** Only the shared lane updates this encounter. All rewards are durable rights,
 * not economic grants; a reward catalog has deliberately not been invented. */
export async function tickWeeklyBosses(pool:Pool,assignment?:SimulationPartition,maxBatchMs=Infinity){
 const shard=partition(assignment),budget=simulationBudget(maxBatchMs);
 if(!(await pool.query("SELECT to_regclass('mare_game.weekly_boss_events') present")).rows[0].present)return 0;
 const rows=(await pool.query(`SELECT id FROM mare_game.weekly_boss_events e WHERE mod(hashtextextended(id::text,34001)&2147483647,$2::bigint)=$1::bigint AND
 ((status='active' AND tick_at<clock_timestamp()-interval '100 milliseconds') OR (status<>'active' AND ended_at<clock_timestamp()-interval '1200 milliseconds' AND EXISTS(SELECT 1 FROM mare_game.weekly_boss_members WHERE event_id=e.id))) ORDER BY tick_at LIMIT 4`,[shard.index,shard.count])).rows;
 let failed=0;
 for(const candidate of rows){if(budget.exhausted())break;const c=await pool.connect();try{
  await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='5000ms'; SET LOCAL lock_timeout='100ms'");
  const row=(await c.query('SELECT *,clock_timestamp() now FROM mare_game.weekly_boss_events WHERE id=$1 FOR UPDATE SKIP LOCKED',[candidate.id])).rows[0];
  if(!row){await c.query('ROLLBACK');continue;}
  let roster=await weeklyRoster(c,row.id);for(const m of roster)await lockPeer(c,m);roster=await weeklyRoster(c,row.id);
  const now=row.now.getTime(),room=row.simulation,boss=room.mobs[0],elapsed=Math.max(0,(now-row.tick_at.getTime())/1000);
  if(row.status!=='active'){
   for(const m of roster)await leaveWeeklyBoss(c,m.character_id);await c.query('COMMIT');budget.commit();continue;
  }
  if(row.closes_at<=row.now){
   A.pause(boss,now);await storeWeeklyRoom(c,room);await c.query("UPDATE mare_game.weekly_boss_events SET status='expired',ended_at=$2,version=version+1 WHERE id=$1",[row.id,row.now]);
   await weeklyAudit(c,'expired',null,row.id);for(const m of roster)await leaveWeeklyBoss(c,m.character_id);await c.query('COMMIT');budget.commit();continue;
  }
  const ids=roster.map(m=>m.character_id),battles=await readBattleRows(c,ids),connected=roster.filter(m=>m.connected&&battles.get(m.character_id)?.simulation.weeklyBossInstanceId===room.id).map(m=>m.character_id);
  const inputs=await weeklyInputs(c,connected),worlds=await readWorlds(c,connected,new Date(now-Math.min(1,elapsed)*1000)),actors:any[]=[];
  for(const m of roster){
   const b=battles.get(m.character_id)?.simulation;if(!b||b.weeklyBossInstanceId!==room.id)throw Error('weekly_membership_mismatch');
   if(!m.connected||(row.mode==='test'&&!(await c.query('SELECT 1 FROM mare_game.weekly_boss_operators WHERE account_id=$1',[m.account_id])).rowCount)){
    if(now-new Date(m.last_seen).getTime()>R.policy.reconnectMs||m.connected)await leaveWeeklyBoss(c,m.character_id);else{E.cancel(b);await storeBattle(c,m.character_id,b,false);}continue;
   }
   const input=inputs.get(m.character_id),w=worlds.get(m.character_id),f=input.fighter(b),state=input.state;
   if(!w||w.mapId!==row.map_id||f.rulesetId!=='original-character-v1'||b.rulesHash!==E.rulesHash)throw Error('weekly_world_mismatch');
   b.mobs=room.mobs;b.hp=Math.min(b.hp,f.maxHp);b.energy=Math.min(b.energy,f.stats.maxEnergy);
   if(elapsed>2||Number(m.control_epoch)!==Number(m.epoch)){E.cancel(b);E.resetHaki(b);A.pause(boss,now);}
   actors.push({id:m.character_id,connected:true,lastSeen:new Date(m.last_seen).getTime(),instanceId:row.id,b,state,f,w,hero:{...w.position,direction:w.direction},stats:f.stats,baseStats:f.baseStats,fruitId:f.fruitId,build:input.talents.build,classId:f.classId,factionId:f.factionId,level:state.level,preferences:input.preferences,potions:row.mode==='test'?0:input.inventory?.potions??0,potionHealingBonus:input.crewBenefits.doctor,manualPath:b.auto?[]:w.path.map((p:any)=>({...p})),manualSpeed:w.speed,manualStart:battles.get(m.character_id)!.started_at.getTime(),epoch:Number(m.epoch)});
  }
  if(!actors.length||elapsed>2)A.pause(boss,now);
  const results=S.step(room,actors,{nav:maps().navigation(row.map_id),now,dt:elapsed>2?0:Math.min(1,elapsed),rng});
  for(const a of actors){
   const result=results.find((r:any)=>r.id===a.id);
   // Only an actually consumed production potion mutates inventory. No kill loot,
   // steal money, XP, contract or profession credit comes from this adapter.
   if(row.mode==='official'&&result.potionsUsed){
    const requestId=randomUUID();await awardWorldLoot(c,a.id,requestId,a.state,[],undefined,result.potionsUsed,{xpGrant:0});
    await c.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[a.id]);
    const after=await readCharacterState(c,a.id);await c.query('INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) VALUES($1,$2,$3,$4)',[a.id,requestId,digest('server-weekly:'+requestId),JSON.stringify({requestId,action:'battle.reward',state:after})]);
   }
   await storeWorld(c,a.id,{...a.w,position:{x:a.hero.x,y:a.hero.y},direction:a.hero.direction,path:a.b.hp>0&&!a.b.auto?a.manualPath:[],speed:E.combatStats(a.b,a)[a.b.auto?'huntSpeed':'moveSpeed'],serverNow:row.now.toISOString(),motionUntil:new Date(Math.max(now,Date.parse(a.w.motionUntil))).toISOString()});
   await storeBattle(c,a.id,a.b,false);await c.query('UPDATE mare_game.character_battles SET tick_at=$2,control_epoch=$3 WHERE character_id=$1',[a.id,row.now,a.epoch]);await c.query('UPDATE mare_game.weekly_boss_members SET control_epoch=$2 WHERE character_id=$1',[a.id,a.epoch]);
  }
  if(!boss.alive){
   const eligible:string[]=[];
   if(row.mode==='official')for(const a of actors){const contribution=room.contributions[a.id];if(!contribution||!R.eligible({...contribution,connected:a.connected,hp:a.b.hp,lastSeen:a.lastSeen},boss.maxHP,a.f.maxHp,now))continue;
    await c.query('INSERT INTO mare_game.weekly_boss_victories(event_id,character_id,damage,healing,combat_ms) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[row.id,a.id,contribution.damage,contribution.healing,contribution.combatMs]);
    eligible.push(a.id);
    await recordDailyProgress(c,a.id,[{id:boss.id,monster:boss}]);
    await c.query('INSERT INTO mare_game.weekly_boss_entitlements(character_id,cycle_key,event_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[a.id,row.cycle_key,row.id]);
   }
   if(eligible.length)await grantWeeklyBossLoot(c,row.id,eligible);
   boss.defeatedAt=now;await c.query("UPDATE mare_game.weekly_boss_events SET status='won',ended_at=$2,version=version+1 WHERE id=$1",[row.id,row.now]);await weeklyAudit(c,'won',null,row.id,{mode:row.mode});
  }
  await storeWeeklyRoom(c,room);await c.query('UPDATE mare_game.weekly_boss_events SET tick_at=$2 WHERE id=$1',[row.id,row.now]);await c.query('COMMIT');budget.commit();
 }catch(error){await c.query('ROLLBACK');if((error as any).code!=='party_member_busy')failed++;}finally{c.release();}}
 if(failed)throw Error('weekly_boss_tick_failed');return rows.length;
}
