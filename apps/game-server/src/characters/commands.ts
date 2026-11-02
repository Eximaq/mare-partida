import {isHakiAction,mutateHaki} from './haki.js';
import {isDungeonAction,mutateDungeon} from './dungeons.js';
import {isPrisonAction,mutatePrison} from './prison.js';
import {claimAchievement,observeServerAchievements,permanentAchievementPower} from './achievements.js';
import {mutateTalents} from './talents.js';
import {isWorldAction,mutateWorld} from './world.js';
import {claimContract} from './contracts.js';
import {isBattleAction,mutateBattle,readBattle} from './battle.js';
import {isOriginalAction,mutateOriginalInventory} from '../gameplay/inventory.js';
import {mutateInventory,readInventory} from "./inventory.js";
import type { PoolClient } from "pg";
import { attributeKeys, characterCommandResultSchema, type CharacterCommand, type CharacterCommandResult } from "@mare/shared";
import { AuthFault } from "../auth/errors.js";
import { digest } from "../auth/vault.js";
import { readCharacterState } from "./state.js";
import { beginJourney } from "./journey.js";
import { mutateHunt } from "./hunt.js";
import { mutateCombat } from "./combat.js";

import {allocateAttributes} from "./attributes.js";

// Caller holds the account and character locks after authenticating and checking ownership.
export async function executeCharacterCommand(
  client: PoolClient, characterId: string, sessionId: string, input: CharacterCommand,
): Promise<CharacterCommandResult> {
  const controller = await client.query(
    `SELECT character_id FROM mare_game.character_control WHERE character_id=$1 AND session_id=$2
      AND token_hash=$3 AND epoch=$4 AND expires_at>clock_timestamp()`,
    [characterId, sessionId, digest(input.control.token), input.control.epoch],
  );
  if (!controller.rowCount) throw new AuthFault(409, "control_conflict");
  // Authority is checked on every replay. Credentials are deliberately excluded from storage
  // and identity, so a newly authorized controller can reconcile a lost response.
  const intent = input.action === "attributes.allocate" ? attributeKeys.map(k=>input.payload.allocation[k]) :
    input.action === "inventory.buy" || input.action === "inventory.sell" ? [input.payload.itemId,input.payload.quantity] : input.payload;
  const hash = digest(JSON.stringify([input.action, input.expectedVersion, intent]));
  const previous = (await client.query<{ request_hash: string; result: unknown }>(
    "SELECT request_hash,result FROM mare_game.character_commands WHERE character_id=$1 AND request_id=$2",
    [characterId, input.requestId],
  )).rows[0];
  if (previous) {
    if (previous.request_hash !== hash) throw new AuthFault(409, "idempotency_conflict");
    return characterCommandResultSchema.parse(previous.result);
  }
  let state = await readCharacterState(client, characterId);
  if (state.version !== input.expectedVersion) throw new AuthFault(409, "state_version_conflict");
  // Keep immutable receipts for replay; bound request rate, not a player's lifetime.
  const budget = (await client.query<{recent:number}>(
    "SELECT count(*)::int AS recent FROM mare_game.character_commands WHERE character_id=$1 AND created_at>clock_timestamp()-interval '60 seconds' AND result->>'action'<>'battle.reward'",[characterId]
  )).rows[0]!;
  if (budget.recent >= 60) throw new AuthFault(429, "command_rate_limited");
  const before=state,powerBefore=input.action==='state.sync'?0:await permanentAchievementPower(client,characterId,state);
  if(isHakiAction(input.action)){await mutateHaki(client,characterId,input,state);state=await readCharacterState(client,characterId);}
  else if(isDungeonAction(input.action)){await mutateDungeon(client,characterId,input,state);state=await readCharacterState(client,characterId);}
  if(isPrisonAction(input.action)){await mutatePrison(client,characterId,input,state);state=await readCharacterState(client,characterId);}
  if(input.action==='achievement.claim'){await claimAchievement(client,characterId,input.requestId,state,input.payload.achievementId);state=await readCharacterState(client,characterId);}
  if(input.action==='talents.commit'||input.action==='talents.reset'){await mutateTalents(client,characterId,input,state);state=await readCharacterState(client,characterId);}
  if(isBattleAction(input.action)){await mutateBattle(client,characterId,input,state);state=await readCharacterState(client,characterId);}
  if(input.action==='contract.claim'){await claimContract(client,characterId,input.requestId,state,input.payload.contractId);state=await readCharacterState(client,characterId);}
  if(['journey.begin','hunt.begin','hunt.claim','combat.begin','combat.attack','combat.claim'].includes(input.action)&&await readBattle(client,characterId))throw new AuthFault(409,'battle_original_active');
  if (input.action === "journey.begin") {
    await beginJourney(client, characterId, input.requestId, state.version);
    state = await readCharacterState(client, characterId);
  }
  if (input.action === "hunt.begin" || input.action === "hunt.claim") {
    await mutateHunt(client, characterId, input.requestId, input.action, state);
    state = await readCharacterState(client, characterId);
  }
  if(isOriginalAction(input.action)){await mutateOriginalInventory(client,characterId,input,state);state=await readCharacterState(client,characterId);}
  let world;
  if(isWorldAction(input.action)){world=await mutateWorld(client,characterId,input,state);state=await readCharacterState(client,characterId);}
  let combat;
  if (input.action === "combat.begin" || input.action === "combat.attack" || input.action === "combat.claim") {
    combat = await mutateCombat(client, characterId, input.requestId, input.action, state);
    state = await readCharacterState(client, characterId);
  }
  let attributes;
  if(input.action === "attributes.allocate") {
    attributes=await allocateAttributes(client,characterId,input.requestId,state,input.payload.allocation);
    state=await readCharacterState(client,characterId);
  }
  let inventory;
  if(input.action==="inventory.buy"||input.action==="inventory.sell"||input.action==="equipment.equip"||input.action==="equipment.unequip") {inventory=await mutateInventory(client,characterId,input,state);state=await readCharacterState(client,characterId);}
  if(input.action==="combat.claim") inventory=await readInventory(client,characterId);
  if(input.action!=='state.sync')await observeServerAchievements(client,characterId,before,state,{powerBefore,...(input.action==='world.travel'?{island:input.payload.islandId}:{}),...(input.action==='combat.claim'?{kills:1}:{})});
  const result = characterCommandResultSchema.parse({ requestId: input.requestId, action: input.action, state, ...(world ? {world} : {}), ...(combat ? {combat} : {}), ...(attributes ? {attributes} : {}), ...(inventory ? {inventory} : {}) });
  await client.query(
    "INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) VALUES($1,$2,$3,$4::jsonb)",
    [characterId, input.requestId, hash, JSON.stringify(result)],
  );
  return result;
}
