import {partition,type SimulationPartition} from '../simulation-partition.js';
import {simulationBudget} from '../simulation-budget.js';
import type {Pool} from 'pg';
import {randomInt,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {presence,lockPeer,leavePartyActivity,refreshPartyLeader} from './party.js';
import {storeRoom} from './party-store.js';
import {readBattleRows,storeBattle} from './battle.js';
import {readCharacterState} from './state.js';
import {readWorlds,storeWorld} from './world.js';
import {readCombatInputs} from './combat-inputs.js';
import {awardWorldLoot} from '../gameplay/inventory.js';
import {completeDungeonVictory} from './dungeons.js';
import {advanceLevel} from './progression.js';
import {recordContractKills,recordDailyProgress,boostXp} from './contracts.js';
import {creditCrewActivities,crewHuntEvents,type CrewActivity} from './crew-activity.js';
import {crewCombatXp,crewMonsterBerry} from './crew-config.js';
import {creditProfessionKills} from './crew-professions.js';
import {observeServerAchievements} from './achievements.js';
import {digest} from '../auth/vault.js';
const require=createRequire(import.meta.url),P=require('../../../../party-rules.cjs'),S=require('../../../../party-battle.cjs'),E=require('../../../../world-battle.cjs'),maps=require('../../../../world-catalog.cjs').load;
const rng=()=>randomInt(0,0x100000000)/0x100000000;
/** One bounded transaction and one canonical monster timeline per instance. */
export async function tickPartyBattles(pool:Pool,assignment?:SimulationPartition,maxBatchMs=Infinity){
 const shard=partition(assignment),budget=simulationBudget(maxBatchMs);
 const candidates=(await pool.query("SELECT id,party_id FROM mare_game.party_instances WHERE mod(hashtextextended(id::text,34001)&2147483647,$2::bigint)=$1::bigint AND ended_at IS NULL AND tick_at<clock_timestamp()-interval '100 milliseconds' ORDER BY tick_at LIMIT 16",[shard.index,shard.count])).rows;
 let failed=0;
 for(const candidate of candidates){if(budget.exhausted())break;const c=await pool.connect();try{
  await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='5000ms'; SET LOCAL lock_timeout='100ms'");
  if(!(await c.query('SELECT id FROM mare_game.parties WHERE id=$1 FOR UPDATE SKIP LOCKED',[candidate.party_id])).rowCount){await c.query('ROLLBACK');continue;}
  const row=(await c.query('SELECT *,clock_timestamp() now FROM mare_game.party_instances WHERE id=$1 AND ended_at IS NULL FOR UPDATE SKIP LOCKED',[candidate.id])).rows[0];if(!row){await c.query('ROLLBACK');continue;}
  let roster=await presence(c,candidate.party_id);
  for(const m of roster.slice().sort((a,b)=>a.character_id.localeCompare(b.character_id)))await lockPeer(c,m);
  // Revalidate provider/session/epoch after acquiring every peer lock.
  roster=await presence(c,candidate.party_id);
  const room=row.simulation,now=row.now.getTime(),elapsed=(now-row.tick_at.getTime())/1000,actors:any[]=[];let attached=0;
   await refreshPartyLeader(c,candidate.party_id,roster,now);
  const ids=roster.map(m=>m.character_id),battles=await readBattleRows(c,ids);
  const connected=roster.filter(m=>m.connected&&battles.get(m.character_id)?.simulation.partyInstanceId===room.id).map(m=>m.character_id);
  const inputs=await readCombatInputs(c,connected),worlds=await readWorlds(c,connected,new Date(now-Math.min(elapsed,1)*1000));
  for(const m of roster){
   const personal=battles.get(m.character_id),b=personal?.simulation;if(!b||b.partyInstanceId!==room.id)continue;
   if(!m.connected){if(now-new Date(m.last_seen).getTime()>P.policy.reconnectMs)await leavePartyActivity(c,m.character_id);else{attached++;E.cancel(b);await storeBattle(c,m.character_id,b,false);}continue;}
   attached++;const input=inputs.get(m.character_id)!,{state}=input,f=input.fighter(b),w=worlds.get(m.character_id);
   if(f.rulesetId!=='original-character-v1'||!w||w.mapId!==room.mapId)throw Error('party_world_mismatch');
   b.hp=Math.min(b.hp,f.maxHp);b.energy=Math.min(b.energy,f.stats.maxEnergy);
    if(room.mobs.some((m:any)=>m.balanceVersion!==E.balanceVersion)){
     // The shared room, rather than a personal snapshot, owns current monster HP and clocks.
     E.upgradeBalance({mobs:room.mobs,area:room.area,rulesHash:E.previousBalanceHash});
    }
    if(b.rulesHash!==E.rulesHash)throw Error('party_rules_changed');
    if(elapsed>2){E.cancel(b);E.resetHaki(b);}
   const epoch=personal!.control_epoch;
   if(Number(epoch)!==Number(m.epoch)){E.cancel(b);E.resetHaki(b);}
   const inventory=input.inventory,build=input.talents.build;
   actors.push({id:m.character_id,connected:true,lastSeen:new Date(m.last_seen).getTime(),instanceId:room.id,b,state,f,w,hero:{...w.position,direction:w.direction},stats:f.stats,baseStats:f.baseStats,fruitId:f.fruitId,build,classId:f.classId,factionId:f.factionId,level:state.level,preferences:input.preferences,potions:inventory?.potions??0,crewBenefits:input.crewBenefits,potionHealingBonus:input.crewBenefits.doctor,manualPath:b.auto?[]:w.path.map((p:any)=>({...p})),manualSpeed:w.speed,manualStart:personal!.started_at.getTime(),epoch:Number(m.epoch)});
  }
  if(!attached){await c.query('UPDATE mare_game.party_instances SET ended_at=$2 WHERE id=$1',[room.id,row.now]);await c.query('COMMIT');budget.commit();continue;}
   // Never catch up offline time. Reconnection resumes the same wounded enemies.
  const results=S.step(room,actors,{nav:maps().navigation(room.mapId),now,dt:elapsed>2?0:Math.min(1,elapsed),rng});
  const rewards=new Map<string,number>(),victories:any[]=[];
  const crewActivities:CrewActivity[]=[];
  const activityTime=new Date(now);
  for(const result of results)for(const k of result.kills){
   const inserted=await c.query('INSERT INTO mare_game.party_deaths(instance_id,spawn_id,killer_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING spawn_id',[room.id,k.id,result.id]);
   if(!inserted.rowCount)throw Error('party_duplicate_death');
   room.seq++;
   if(room.kind==='dungeon')victories.push(k);
   else{
    crewActivities.push(...crewHuntEvents(result.id,[k],activityTime));
    const ids=P.eligible(actors.map(a=>({...a,hp:a.b.hp,x:a.hero.x,y:a.hero.y})),{instanceId:room.id,x:k.monster.x,y:k.monster.y},now).map((a:any)=>a.id);
    if(ids.length){
      const base=E.hunt.rewards(k.area,k.monster,k.monster.level??1,.5).xp,shares=P.shares(base,ids,room.seq%ids.length);
      for(const id of ids){const actor=actors.find(a=>a.id===id),personal=E.hunt.rewards(k.area,k.monster,actor.state.level,.5).xp,grant=crewCombatXp(base>0?Math.round(shares[id]*personal/base):0,actor.crewBenefits.command);
       rewards.set(id,(rewards.get(id)??0)+grant);
       await c.query('INSERT INTO mare_game.party_experience(instance_id,spawn_id,character_id,base_amount,amount,request_id) VALUES($1,$2,$3,$4,$5,$6)',[room.id,k.id,id,shares[id],(await boostXp(c,id,BigInt(grant))).toString(),actor.requestId??=randomUUID()]);
      }
     }
   }
  }
  for(const a of actors){
   const result=results.find((r:any)=>r.id===a.id),requestId=a.requestId??randomUUID(),kills=room.kind==='hunt'?result.kills:[];
   const victory=room.kind==='dungeon'&&a.b.hp>0&&victories[0];
   if(victory){
    const r=a.b.dungeon.record;
    await completeDungeonVictory(c,a.id,requestId,a.state,a.b,{...victory,runId:r.runId,encounterId:r.encounterId},activityTime);
    crewActivities.push({characterId:a.id,kind:'bosses',eventId:victory.id,occurredAt:activityTime});
    E.cancel(a.b);
   }
   if(kills.length||rewards.has(a.id)||victory||result.potionsUsed||result.talentSteals.length){
    const awarded=await awardWorldLoot(c,a.id,requestId,a.state,kills.map((k:any)=>({...k,reward:{...k.reward,xp:0}})),undefined,result.potionsUsed,{xpGrant:rewards.get(a.id)??0,monsterBerryBonus:a.crewBenefits.navigator,build:a.build,steals:result.talentSteals,...(room.kind==='dungeon'?{action:'dungeon.battle' as const}:{})});
    if(kills.length){
     await recordContractKills(c,a.id,kills);
     await creditProfessionKills(c,a.id,kills,activityTime);
     await recordDailyProgress(c,a.id,kills.map((k:any)=>({...k,berry:crewMonsterBerry(k.reward.gold,E.catalog.factions[a.factionId].gold,a.crewBenefits.navigator)})));
    }
    if(a.state.version>=Number.MAX_SAFE_INTEGER)throw Error('state_version_exhausted');
     await advanceLevel(c,a.id,requestId,a.state);await c.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[a.id]);
    const after=await readCharacterState(c,a.id);if(after.level>a.state.level){const next=(await readCombatInputs(c,[a.id])).get(a.id)!.fighter(a.b);a.b.hp=next.maxHp;if(next.rulesetId==='original-character-v1')a.b.energy=next.stats.maxEnergy;}await observeServerAchievements(c,a.id,a.state,after,{kills:kills.length});
    await c.query('INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) VALUES($1,$2,$3,$4)',[a.id,requestId,digest('server-party:'+requestId),JSON.stringify({requestId,action:'battle.reward',state:after})]);
    a.b.partyXpReceived=(a.b.partyXpReceived??0)+Number(awarded.xp);
   }
   await storeWorld(c,a.id,{...a.w,position:{x:a.hero.x,y:a.hero.y},direction:a.hero.direction,path:a.b.hp>0&&!a.b.auto?a.manualPath:[],speed:E.combatStats(a.b,a)[a.b.auto?'huntSpeed':'moveSpeed'],serverNow:new Date(now).toISOString(),motionUntil:new Date(Math.max(now,Date.parse(a.w.motionUntil))).toISOString()});
   a.b.mobs=room.mobs;await storeBattle(c,a.id,a.b,false);await c.query('UPDATE mare_game.character_battles SET tick_at=$2,control_epoch=$3 WHERE character_id=$1',[a.id,row.now,a.epoch]);
  }
  await creditCrewActivities(c,crewActivities);
  await storeRoom(c,room);await c.query('UPDATE mare_game.party_instances SET tick_at=$2 WHERE id=$1',[room.id,row.now]);await c.query('COMMIT');budget.commit();
 }catch(error){await c.query('ROLLBACK');if((error as any).code!=='party_member_busy')failed++;}finally{c.release();}}
 if(failed)throw Error('party_tick_failed');return candidates.length;
}
