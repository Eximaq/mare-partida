import {partition,type SimulationPartition} from '../simulation-partition.js';
import {partyRoom,storeRoom} from './party-store.js';
import {readCombatInputs} from './combat-inputs.js';
import {completeDungeonVictory} from './dungeons.js';
import {completePrisonFloor,advancePrison} from './prison.js';
import {observeServerAchievements} from './achievements.js';
import {readTalents} from './talents.js';
import {createRequire} from 'node:module';
import {randomInt,randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {battleActions,type CharacterCommand,type CharacterState} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readWorld,storeWorld} from './world.js';
import {readFighter} from './fighter.js';
import {readCharacterState} from './state.js';
import {advanceLevel} from './progression.js';
import {awardWorldLoot} from '../gameplay/inventory.js';
import {digest} from '../auth/vault.js';
import {recordContractKills} from './contracts.js';
const require=createRequire(import.meta.url),engine=require('../../../../world-battle.cjs'),maps=require('../../../../world-catalog.cjs').load;
const rng=()=>randomInt(0,0x100000000)/0x100000000;
export const isBattleAction=(action:string)=>(battleActions as readonly string[]).includes(action);
export async function readBattle(client:PoolClient,id:string){
 if(!(await client.query("SELECT to_regclass('mare_game.character_battles') present")).rows[0].present)return null;
 const row=(await client.query('SELECT simulation FROM mare_game.character_battles WHERE character_id=$1',[id])).rows[0];
 const b=row?.simulation??null;
 if(b?.partyInstanceId){const r=await partyRoom(client,b.partyInstanceId);if(r)b.mobs=r.simulation.mobs;}
 return b;
}
/** Batched current-schema personal state with the one canonical room projection.
 * Internal only: membership/ownership/locks must already have been established. */
export async function readBattleRows(client:PoolClient,ids:readonly string[]){
 const rows=(await client.query(`SELECT b.character_id,b.simulation,b.control_epoch,w.started_at,r.simulation->'mobs' shared_mobs
 FROM mare_game.character_battles b LEFT JOIN mare_game.character_world w ON w.character_id=b.character_id
 LEFT JOIN mare_game.party_instances r ON r.id=(b.simulation->>'partyInstanceId')::uuid AND r.ended_at IS NULL
 WHERE b.character_id=ANY($1::uuid[])`,[ids])).rows;
 for(const row of rows)if(row.shared_mobs)row.simulation.mobs=row.shared_mobs;
 return new Map(rows.map(row=>[row.character_id,row]));
}
export async function storeBattle(client:PoolClient,id:string,b:any,canonical=true){
 if(canonical&&b.partyInstanceId){const r=await partyRoom(client,b.partyInstanceId);if(r){r.simulation.mobs=b.mobs;await storeRoom(client,r.simulation);}}
 await client.query('UPDATE mare_game.character_battles SET simulation=$2::jsonb WHERE character_id=$1',[id,JSON.stringify(b)]);
}
export async function pauseBattle(client:PoolClient,id:string){
 // Older migration fixtures acquire leases before the opt-in domain exists.
 if(!(await client.query("SELECT to_regclass('mare_game.character_battles') present")).rows[0].present)return;
 const b=await readBattle(client,id);if(!b)return;engine.cancel(b);engine.resetHaki(b);b.talents=null;await storeBattle(client,id,b,false);
 await client.query('UPDATE mare_game.character_battles SET tick_at=clock_timestamp() WHERE character_id=$1',[id]);
}
export async function syncBattleWorld(client:PoolClient,id:string,area:string|null,now:number){
 const b=await readBattle(client,id);if(!b)return;
 if(b.area!==area)engine.changeArea(b,area,now,rng);else engine.cancel(b);
 // Manual movement cancels player intent, never rewinds the monsters' clock.
 await storeBattle(client,id,b);
}
export async function mutateBattle(client:PoolClient,id:string,input:CharacterCommand,state:CharacterState){
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const w=await readWorld(client,id);if(!w)throw new AuthFault(409,'world_not_started');
 const fighter=await readFighter(client,id,state);if(fighter.rulesetId!=='original-character-v1')throw new AuthFault(409,'original_inventory_required');
 let b=await readBattle(client,id);
 if(input.action==='battle.start'){
  if(b)return;
  const phase=(await client.query('SELECT phase FROM mare_game.combat_encounters WHERE character_id=$1 ORDER BY ordinal DESC LIMIT 1',[id])).rows[0]?.phase;
  if(['active','won'].includes(phase))throw new AuthFault(409,'world_combat_pending');
  b=engine.create(w.area,fighter.stats,Date.parse(w.serverNow),rng);
  await client.query('INSERT INTO mare_game.character_battles(character_id,simulation,control_epoch) VALUES($1,$2::jsonb,$3)',[id,JSON.stringify(b),input.control.epoch]);
 }else{
  if(!b)throw new AuthFault(409,'battle_not_started');
  if(b.rulesHash!==engine.rulesHash)throw new AuthFault(503,'battle_rules_changed');
  if(input.action==='battle.auto'){
   if(input.payload.enabled&&(!b.area||b.hp<=0))throw new AuthFault(409,'battle_unavailable');
   if(!input.payload.enabled)engine.cancel(b);else b.auto=true;
  }else if(input.action==='battle.target'){
   const target=b.mobs.find((m:any)=>m.id===input.payload.targetId&&m.alive&&!m.returning);
   if(input.payload.targetId&&!target)throw new AuthFault(404,'battle_target_missing');
   engine.cancel(b);b.targetId=target?.id??null;b.auto=!!target;
  }else if(input.action==='battle.skill'){
   if(!engine.skill(b,input.payload.index,{hero:w.position,nav:maps().navigation(w.mapId),stats:fighter.stats,baseStats:fighter.baseStats,fruitId:fighter.fruitId,build:(await readTalents(client,id,state))?.build,classId:fighter.classId,factionId:fighter.factionId}))throw new AuthFault(409,'battle_skill_unavailable');
  }else if(input.action==='battle.first'){
   const area=b.hunts.areas[b.area],region=engine.hunt.get(b.area);
   if(!area?.bosses||area.firstRewardClaimed||!region?.firstRarity)throw new AuthFault(409,'battle_first_unavailable');
   await awardWorldLoot(client,id,input.requestId,state,[],{area:b.area,rarity:region.firstRarity,gold:region.firstGold,level:Math.max(1,Math.ceil(region.bossLevel/5)),classId:fighter.classId});area.firstRewardClaimed=true;
  }
  await storeBattle(client,id,b);
  await client.query('UPDATE mare_game.character_battles SET control_epoch=$2 WHERE character_id=$1',[id,input.control.epoch]);
 }
 // Every accepted intent shares the ordinary command receipt/version boundary.
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}

// Bounded worker; no tokens, provider calls or session keep-alive. Lock order is
// session -> account -> character, identical to authenticated commands/logout.
export async function tickWorldBattles(pool:Pool,assignment?:SimulationPartition){
 const shard=partition(assignment);let failed=0;
 const candidates=(await pool.query(`SELECT b.character_id,c.session_id FROM mare_game.character_battles b
  JOIN mare_game.character_control c ON c.character_id=b.character_id JOIN mare_game.app_sessions s ON s.id=c.session_id
  JOIN mare_game.accounts a ON a.id=s.account_id WHERE c.expires_at>clock_timestamp() AND s.kind='play' AND s.revoked_at IS NULL
  AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp() AND s.provider_valid_until>clock_timestamp()
  AND mod(hashtextextended(b.character_id::text,34001)&2147483647,$2::bigint)=$1::bigint AND NOT (b.simulation ? 'partyInstanceId') AND s.account_epoch=a.auth_epoch AND b.tick_at<clock_timestamp()-interval '100 milliseconds' ORDER BY b.tick_at LIMIT 32`,[shard.index,shard.count])).rows;
 for(const candidate of candidates){const client=await pool.connect();try{
  await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='3000ms'; SET LOCAL lock_timeout='100ms'; SET LOCAL idle_in_transaction_session_timeout='5s'");
  const session=(await client.query('SELECT id,account_id FROM mare_game.app_sessions WHERE id=$1 FOR UPDATE SKIP LOCKED',[candidate.session_id])).rows[0];
  if(!session){await client.query('ROLLBACK');continue;}
  const account=await client.query('SELECT id FROM mare_game.accounts WHERE id=$1 FOR UPDATE SKIP LOCKED',[session.account_id]);
  if(!account.rowCount||!(await client.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,1296126533)) locked',[candidate.character_id])).rows[0].locked){await client.query('ROLLBACK');continue;}
  const row=(await client.query(`SELECT b.simulation,b.tick_at,b.control_epoch,c.epoch,clock_timestamp() now FROM mare_game.character_battles b
   JOIN mare_game.character_control c ON c.character_id=b.character_id JOIN mare_game.app_sessions s ON s.id=c.session_id
   JOIN mare_game.accounts a ON a.id=s.account_id JOIN mare_game.characters ch ON ch.id=b.character_id AND ch.account_id=a.id
   WHERE b.character_id=$1 AND s.id=$2 AND c.expires_at>clock_timestamp() AND s.kind='play' AND s.revoked_at IS NULL
   AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp() AND s.provider_valid_until>clock_timestamp() AND s.account_epoch=a.auth_epoch`,[candidate.character_id,session.id])).rows[0];
  if(!row){await client.query('ROLLBACK');continue;}
  const id=candidate.character_id,b=row.simulation,now:Date=row.now,elapsed=(now.getTime()-row.tick_at.getTime())/1000;
  if(b.partyInstanceId){await client.query('ROLLBACK');continue;}
   if(elapsed<.1){await client.query('ROLLBACK');continue;}
  if(b.rulesHash!==engine.rulesHash)throw new AuthFault(503,'battle_rules_changed');
  if(elapsed>2||row.control_epoch!==row.epoch){engine.cancel(b);engine.resetHaki(b);b.talents=null;await storeBattle(client,id,b);
   await client.query('UPDATE mare_game.character_battles SET tick_at=$2,control_epoch=$3 WHERE character_id=$1',[id,now,row.epoch]);await client.query('COMMIT');continue;}
  const dt=Math.min(1,elapsed),start=new Date(now.getTime()-dt*1000),w=await readWorld(client,id,start);
  if(!w||w.area!==b.area)throw new AuthFault(503,'battle_world_mismatch');
  const inputs=(await readCombatInputs(client,[id])).get(id)!,{state}=inputs,fighter=inputs.fighter(b);
  if(fighter.rulesetId!=='original-character-v1')throw new AuthFault(503,'original_inventory_required');
  if(await advancePrison(client,id,state,b,w,now)){
   if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
   const requestId=randomUUID();await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);await client.query('INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) VALUES($1,$2,$3,$4)',[id,requestId,digest('server-prison:'+requestId),JSON.stringify({requestId,action:'battle.reward',state:await readCharacterState(client,id)})]);await client.query('UPDATE mare_game.character_battles SET tick_at=$2 WHERE character_id=$1',[id,now]);await client.query('COMMIT');continue;
  }
  b.hp=Math.min(b.hp,fighter.maxHp);b.energy=Math.min(b.energy,fighter.stats.maxEnergy);
  const path=b.auto?[]:w.path.map(p=>({...p})),hero={...w.position,direction:w.direction};
  const started=(await client.query('SELECT started_at FROM mare_game.character_world WHERE character_id=$1',[id])).rows[0].started_at.getTime();
  const stock=inputs.inventory;
  const result=engine.step(b,{preferences:inputs.preferences,hero,nav:maps().navigation(w.mapId),stats:fighter.stats,baseStats:fighter.baseStats,fruitId:fighter.fruitId,build:inputs.talents.build,classId:fighter.classId,factionId:fighter.factionId,level:state.level,now:now.getTime(),dt,rng,manualPath:path,manualSpeed:w.speed,manualStart:started,potions:stock?.potions??0});
  if(result.kills.length||result.potionsUsed||result.talentSteals.length){
   if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
   const requestId=randomUUID();
   if(b.dungeon){
    if(result.kills.length>1)throw new AuthFault(503,'dungeon_victory_invalid');
    if(result.kills.length)await completeDungeonVictory(client,id,requestId,state,b,result.kills[0],now);
    await awardWorldLoot(client,id,requestId,state,[],undefined,result.potionsUsed,{build:inputs.talents.build,steals:result.talentSteals,action:'dungeon.battle'});
   }else if(b.prison){
    if(result.kills.length>1)throw new AuthFault(503,'prison_victory_invalid');
    const grant=result.kills.length?await completePrisonFloor(client,id,requestId,b,result.kills[0],now):undefined;
    await awardWorldLoot(client,id,requestId,state,[],undefined,result.potionsUsed,{build:inputs.talents.build,steals:result.talentSteals,grant,action:'prison.reward'});
   }else await awardWorldLoot(client,id,requestId,state,result.kills,undefined,result.potionsUsed,{build:inputs.talents.build,steals:result.talentSteals});
   if(!b.prison&&!b.dungeon)for(const k of result.kills)await client.query(`INSERT INTO mare_game.world_battle_rewards(character_id,spawn_id,request_id,area,monster,experience_delta,gold_delta,rules_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,k.id,requestId,k.area,k.monster.type,k.reward.xp,Math.round(k.reward.gold*engine.catalog.factions[fighter.factionId].gold),engine.rulesHash]);
   if(!b.prison&&!b.dungeon)await recordContractKills(client,id,result.kills);
   await advanceLevel(client,id,requestId,state);await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
   const after=await readCharacterState(client,id);
   await observeServerAchievements(client,id,state,after,{kills:b.dungeon?0:result.kills.length});
   if(after.level>state.level){await storeBattle(client,id,b);const next=await readFighter(client,id,after);b.hp=next.maxHp;if(next.rulesetId==='original-character-v1')b.energy=next.stats.maxEnergy;}
   await client.query('INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) VALUES($1,$2,$3,$4::jsonb)',[id,requestId,digest('server-battle:'+requestId),JSON.stringify({requestId,action:'battle.reward',state:after})]);
  }
  const remaining=!b.auto&&b.hp>0?path:[];
  await storeWorld(client,id,{...w,position:{x:hero.x,y:hero.y},direction:hero.direction,path:remaining,serverNow:now.toISOString(),speed:engine.combatStats(b,{stats:fighter.stats,baseStats:fighter.baseStats,fruitId:fighter.fruitId,build:inputs.talents.build,classId:fighter.classId})[b.auto?'huntSpeed':'moveSpeed'],motionUntil:remaining.length?new Date(Math.max(now.getTime(),Date.parse(w.motionUntil))).toISOString():now.toISOString()});
  await storeBattle(client,id,b);await client.query('UPDATE mare_game.character_battles SET tick_at=$2 WHERE character_id=$1',[id,now]);
  await client.query('COMMIT');
 }catch{await client.query('ROLLBACK');failed++;}finally{client.release();}}
 // Report an unhealthy batch after independent transactions have had their turn.
 if(failed)throw new AuthFault(503,'battle_tick_failed');
 return candidates.length;
}
