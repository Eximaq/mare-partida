import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { combatSnapshotSchema, type CharacterState } from "@mare/shared";
import { AuthFault } from "../auth/errors.js";
import { resolveCombatRound } from "./combat-rules.js";

export async function readCombat(client: PoolClient,id:string) {
  const row=(await client.query<{
    eligible:boolean;phase:string|null;player_hp:number|null;enemy_hp:number|null;turn:number|null;
    ready:boolean;next_attack_at:Date|null;last_request_id:string|null;player_damage:number|null;enemy_damage:number|null;
  }>(`SELECT EXISTS(SELECT 1 FROM mare_game.character_hunt_rewards WHERE character_id=$1) AS eligible,
    b.phase,b.player_hp,b.enemy_hp,b.turn,b.last_request_id,b.next_attack_at,
    coalesce(b.phase='active' AND b.next_attack_at<=clock_timestamp(),false) AS ready,
    r.player_damage,r.enemy_damage FROM (SELECT $1::uuid AS id) c
    LEFT JOIN mare_game.character_combats b ON b.character_id=c.id
    LEFT JOIN mare_game.character_combat_rounds r ON r.character_id=c.id AND r.turn=b.turn`,[id])).rows[0]!;
  return combatSnapshotSchema.parse({catalogId:"dock-raider-v1",enemyName:"Saqueador do cais",
    status:row.phase ?? (row.eligible?"available":"locked"),playerHp:row.player_hp??30,playerMaxHp:30,
    enemyHp:row.enemy_hp??36,enemyMaxHp:36,turn:row.turn??0,attackReady:row.ready,
    nextAttackAt:row.next_attack_at?.toISOString()??null,lastRequestId:row.last_request_id,
    lastAttack:row.player_damage===null?null:{playerDamage:row.player_damage,enemyDamage:row.enemy_damage},experience:"30",gold:"12"});
}

// Called only inside the command transaction after ownership/controller checks and locks.
export async function mutateCombat(client:PoolClient,id:string,requestId:string,
  action:"combat.begin"|"combat.attack"|"combat.claim",state:CharacterState) {
  const combat=await readCombat(client,id);
  if(action==="combat.begin") {
    if(combat.status==="locked") throw new AuthFault(409,"hunt_required");
    if(combat.status!=="available") throw new AuthFault(409,"combat_already_started");
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
    await client.query("INSERT INTO mare_game.character_combats(character_id,begin_request_id,last_request_id) VALUES($1,$2,$2)",[id,requestId]);
  } else if(action==="combat.attack") {
    // RNG is generated after replay/authorization/version/cooldown checks; never supplied by clients.
    const round=resolveCombatRound(combat.playerHp,combat.enemyHp,randomInt(10,15),randomInt(7,12));
    await client.query(`INSERT INTO mare_game.character_combat_rounds
      (character_id,request_id,turn,version_before,player_before,enemy_before,player_damage,enemy_damage)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,requestId,combat.turn+1,state.version,combat.playerHp,combat.enemyHp,round.playerDamage,round.enemyDamage]);
    await client.query(`UPDATE mare_game.character_combats SET player_hp=$2,enemy_hp=$3,phase=$4,turn=turn+1,
      next_attack_at=clock_timestamp()+interval '2 seconds',last_request_id=$5 WHERE character_id=$1`,[id,round.playerHp,round.enemyHp,round.status,requestId]);
  } else {
    await client.query(`INSERT INTO mare_game.character_combat_rewards(character_id,request_id,version_before,experience_before,gold_before)
      VALUES($1,$2,$3,$4,$5)`,[id,requestId,state.version,state.experience,state.gold]);
    const credited=await client.query(`UPDATE mare_game.character_progression SET experience=experience+30,gold=gold+12
      WHERE character_id=$1 AND experience=$2 AND gold=$3 RETURNING character_id`,[id,state.experience,state.gold]);
    if(!credited.rowCount) throw new AuthFault(409,"state_version_conflict");
    await client.query("UPDATE mare_game.character_combats SET phase='claimed',last_request_id=$2 WHERE character_id=$1",[id,requestId]);
  }
  return readCombat(client,id);
}
