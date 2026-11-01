import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { combatSnapshotSchema, type CharacterState } from "@mare/shared";
import { advanceLevel } from "./progression.js";
import { AuthFault } from "../auth/errors.js";
import { resolveCombatRound } from "./combat-rules.js";

export async function readCombat(client: PoolClient,id:string) {
  const row=(await client.query<{
    eligible:boolean;phase:string|null;player_hp:number|null;enemy_hp:number|null;turn:number|null;
    ready:boolean;next_attack_at:Date|null;last_request_id:string|null;player_damage:number|null;enemy_damage:number|null;
    encounter_id:string|null;ordinal:number|null;total:number;recent:number;rest_ready:boolean;next_encounter_at:Date|null;
  }>(`WITH budget AS (
      SELECT count(*)::int AS total,count(*) FILTER(WHERE started_at>clock_timestamp()-interval '24 hours')::int AS recent,
        min(started_at) FILTER(WHERE started_at>clock_timestamp()-interval '24 hours') AS oldest_recent
      FROM mare_game.combat_encounters WHERE character_id=$1
    ), latest AS (SELECT * FROM mare_game.combat_encounters WHERE character_id=$1 ORDER BY ordinal DESC LIMIT 1)
    SELECT EXISTS(SELECT 1 FROM mare_game.character_hunt_rewards WHERE character_id=$1) AS eligible,
    b.phase,b.player_hp,b.enemy_hp,b.turn,b.last_request_id,b.next_attack_at,b.encounter_id,b.ordinal,q.total,q.recent,
    coalesce(b.closed_at+interval '60 seconds'<=clock_timestamp(),false) AS rest_ready,
    greatest(b.closed_at+interval '60 seconds',CASE WHEN q.recent>=10 THEN q.oldest_recent+interval '24 hours' END) AS next_encounter_at,
    coalesce(b.phase='active' AND b.next_attack_at<=clock_timestamp(),false) AS ready,
    r.player_damage,r.enemy_damage FROM budget q LEFT JOIN latest b ON true
    LEFT JOIN mare_game.combat_rounds r ON r.character_id=$1 AND r.encounter_id=b.encounter_id AND r.turn=b.turn`,[id])).rows[0]!;
  return combatSnapshotSchema.parse({catalogId:"dock-raider-v1",enemyName:"Saqueador do cais",
    status:row.phase ?? (row.eligible?"available":"locked"),playerHp:row.player_hp??30,playerMaxHp:30,
    enemyHp:row.enemy_hp??36,enemyMaxHp:36,turn:row.turn??0,attackReady:row.ready,
    nextAttackAt:row.next_attack_at?.toISOString()??null,lastRequestId:row.last_request_id,
    lastAttack:row.player_damage===null?null:{playerDamage:row.player_damage,enemyDamage:row.enemy_damage},experience:"30",gold:"12",
    encounterId:row.encounter_id,encounterNumber:row.ordinal??0,
    canBegin:row.eligible&&row.total<100&&row.recent<10&&(row.phase===null||(["lost","claimed"].includes(row.phase)&&row.rest_ready)),
    nextEncounterAt:row.next_encounter_at?.toISOString()??null,startsRemaining:Math.max(0,10-row.recent),historyFull:row.total>=100});
}

// Called only inside the command transaction after ownership/controller checks and locks.
export async function mutateCombat(client:PoolClient,id:string,requestId:string,
  action:"combat.begin"|"combat.attack"|"combat.claim",state:CharacterState) {
  const combat=await readCombat(client,id);
  if(action==="combat.begin") {
    if(combat.status==="locked") throw new AuthFault(409,"hunt_required");
    if(combat.status==="active") throw new AuthFault(409,"combat_already_started");
    if(combat.status==="won") throw new AuthFault(409,"combat_reward_pending");
    if(combat.historyFull) throw new AuthFault(503,"combat_history_full");
    if(combat.startsRemaining===0) throw new AuthFault(429,"combat_daily_limit");
    if(!combat.canBegin) throw new AuthFault(409,"combat_rest");
  } else {
    if(combat.status==="locked"||combat.status==="available") throw new AuthFault(409,"combat_not_started");
    if(action==="combat.attack") {
      if(combat.status!=="active") throw new AuthFault(409,"combat_finished");
      if(!combat.attackReady) throw new AuthFault(409,"combat_cooldown");
    } else {
      if(combat.status==="claimed") throw new AuthFault(409,"combat_already_claimed");
      if(combat.status!=="won") throw new AuthFault(409,"combat_not_won");
      if(BigInt(state.experience)>9223372036854775777n||BigInt(state.gold)>9223372036854775795n)
        throw new AuthFault(503,"progression_limit");
    }
  }
  if(state.version>=Number.MAX_SAFE_INTEGER) throw new AuthFault(503,"state_version_exhausted");
  const updated=await client.query("UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1 AND state_version=$2 RETURNING id",[id,state.version]);
  if(!updated.rowCount) throw new AuthFault(409,"state_version_conflict");
  if(action==="combat.begin") {
    await client.query("INSERT INTO mare_game.combat_encounters(character_id,begin_request_id,last_request_id,ordinal) VALUES($1,$2,$2,$3)",[id,requestId,(combat.encounterNumber??0)+1]);
  } else if(action==="combat.attack") {
    // RNG is generated after replay/authorization/version/cooldown checks; never supplied by clients.
    const round=resolveCombatRound(combat.playerHp,combat.enemyHp,randomInt(10,15),randomInt(7,12));
    await client.query(`INSERT INTO mare_game.combat_rounds
      (character_id,request_id,turn,version_before,player_before,enemy_before,player_damage,enemy_damage,encounter_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,requestId,combat.turn+1,state.version,combat.playerHp,combat.enemyHp,round.playerDamage,round.enemyDamage,combat.encounterId]);
    await client.query(`UPDATE mare_game.combat_encounters SET player_hp=$2,enemy_hp=$3,phase=$4,turn=turn+1,
      next_attack_at=clock_timestamp()+interval '2 seconds',last_request_id=$5,closed_at=CASE WHEN $4='lost' THEN clock_timestamp() END
      WHERE character_id=$1 AND encounter_id=$6`,[id,round.playerHp,round.enemyHp,round.status,requestId,combat.encounterId]);
  } else {
    await client.query(`INSERT INTO mare_game.combat_rewards(character_id,request_id,version_before,experience_before,gold_before,encounter_id)
      VALUES($1,$2,$3,$4,$5,$6)`,[id,requestId,state.version,state.experience,state.gold,combat.encounterId]);
    const credited=await client.query(`UPDATE mare_game.character_progression SET experience=experience+30,gold=gold+12
      WHERE character_id=$1 AND experience=$2 AND gold=$3 RETURNING character_id`,[id,state.experience,state.gold]);
    if(!credited.rowCount) throw new AuthFault(409,"state_version_conflict");
    await advanceLevel(client,id,requestId,state);
    await client.query("UPDATE mare_game.combat_encounters SET phase='claimed',last_request_id=$2,closed_at=clock_timestamp() WHERE character_id=$1 AND encounter_id=$3",[id,requestId,combat.encounterId]);
  }
  return readCombat(client,id);
}
