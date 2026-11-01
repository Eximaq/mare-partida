import type { PoolClient } from "pg";
import { characterStateSchema, type CharacterState } from "@mare/shared";
import { AuthFault } from "../auth/errors.js";

// Call only inside the same transaction that authorizes/creates the character.
export async function initializeCharacterState(client: PoolClient, characterId: string) {
  await client.query(
    "INSERT INTO mare_game.character_progression(character_id) VALUES($1) ON CONFLICT(character_id) DO NOTHING",
    [characterId],
  );
}

export async function readCharacterState(client: PoolClient, characterId: string): Promise<CharacterState> {
  const result = await client.query(
    `SELECT p.character_id AS "characterId", c.state_version::float8 AS version,
      p.level, p.experience::text, p.gold::text
     FROM mare_game.character_progression p JOIN mare_game.characters c ON c.id=p.character_id
     WHERE p.character_id=$1`, [characterId],
  );
  if (!result.rowCount) throw new AuthFault(503, "character_state_unavailable");
  return characterStateSchema.parse(result.rows[0]);
}
