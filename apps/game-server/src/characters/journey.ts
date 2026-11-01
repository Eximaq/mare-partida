import type { PoolClient } from "pg";
import { AuthFault } from "../auth/errors.js";

// Requires the command transaction's account/character locks and current controller.
export async function beginJourney(client: PoolClient, characterId: string, requestId: string, version: number) {
  const existing = await client.query(
    "SELECT character_id FROM mare_game.character_journey_ledger WHERE character_id=$1", [characterId],
  );
  if (existing.rowCount) throw new AuthFault(409, "journey_already_started");
  if (version >= Number.MAX_SAFE_INTEGER) throw new AuthFault(503, "state_version_exhausted");
  const updated = await client.query(
    `UPDATE mare_game.characters SET state_version=state_version+1
      WHERE id=$1 AND state_version=$2 RETURNING id`, [characterId, version],
  );
  if (!updated.rowCount) throw new AuthFault(409, "state_version_conflict");
  await client.query(
    "INSERT INTO mare_game.character_journey_ledger(character_id,request_id,version_before) VALUES($1,$2,$3)",
    [characterId, requestId, version],
  );
}
