import type { PoolClient } from "pg";
import { characterCommandResultSchema, type CharacterCommand, type CharacterCommandResult } from "@mare/shared";
import { AuthFault } from "../auth/errors.js";
import { digest } from "../auth/vault.js";
import { readCharacterState } from "./state.js";
import { beginJourney } from "./journey.js";
import { mutateHunt } from "./hunt.js";
import { mutateCombat } from "./combat.js";

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
  const hash = digest(JSON.stringify([input.action, input.expectedVersion, input.payload]));
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
  // Closed local protocol trial: keep receipts rather than silently re-enable old IDs.
  // Count under the same character lock; replicas cannot overshoot the budgets.
  const budget = (await client.query<{ total: number; recent: number }>(
    `SELECT count(*)::int AS total,
      count(*) FILTER (WHERE created_at>clock_timestamp()-interval '60 seconds')::int AS recent
      FROM mare_game.character_commands WHERE character_id=$1`, [characterId],
  )).rows[0]!;
  if (budget.total >= 10000) throw new AuthFault(503, "command_history_full");
  if (budget.recent >= 60) throw new AuthFault(429, "command_rate_limited");
  if (input.action === "journey.begin") {
    await beginJourney(client, characterId, input.requestId, state.version);
    state = await readCharacterState(client, characterId);
  }
  if (input.action === "hunt.begin" || input.action === "hunt.claim") {
    await mutateHunt(client, characterId, input.requestId, input.action, state);
    state = await readCharacterState(client, characterId);
  }
  let combat;
  if (input.action === "combat.begin" || input.action === "combat.attack" || input.action === "combat.claim") {
    combat = await mutateCombat(client, characterId, input.requestId, input.action, state);
    state = await readCharacterState(client, characterId);
  }
  const result = characterCommandResultSchema.parse({ requestId: input.requestId, action: input.action, state, ...(combat ? {combat} : {}) });
  await client.query(
    "INSERT INTO mare_game.character_commands(character_id,request_id,request_hash,result) VALUES($1,$2,$3,$4::jsonb)",
    [characterId, input.requestId, hash, JSON.stringify(result)],
  );
  return result;
}
