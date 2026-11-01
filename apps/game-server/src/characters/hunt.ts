import type { PoolClient } from "pg";
import type { CharacterState } from "@mare/shared";
import { AuthFault } from "../auth/errors.js";

// Versioned introductory contract: changing rewards requires a new hunt/migration.
const catalog = Object.freeze({ catalogId: "dock-patrol-v1", name: "Ronda do cais", durationSeconds: 30,
  experience: "20", gold: "8" });

export async function readHunt(client: PoolClient, id: string) {
  const row = (await client.query<{ journey: boolean; started_at: Date | null; ready_at: Date | null;
    ready: boolean; claimed: boolean; server_now: Date }>(
    `SELECT EXISTS(SELECT 1 FROM mare_game.character_journey_ledger WHERE character_id=$1) AS journey,
      h.begun_at AS started_at,h.begun_at+interval '30 seconds' AS ready_at,
      coalesce(h.begun_at+interval '30 seconds'<=clock_timestamp(),false) AS ready,
      EXISTS(SELECT 1 FROM mare_game.character_hunt_rewards WHERE character_id=$1) AS claimed,
      clock_timestamp() AS server_now
      FROM (SELECT $1::uuid AS id) c LEFT JOIN mare_game.character_hunts h ON h.character_id=c.id`, [id],
  )).rows[0]!;
  return { ...catalog, status: row.claimed ? "claimed" : row.started_at ? (row.ready ? "ready" : "active") : row.journey ? "available" : "locked",
    startedAt: row.started_at?.toISOString() ?? null, readyAt: row.ready_at?.toISOString() ?? null,
    serverNow: row.server_now.toISOString() };
}

// Caller authenticates ownership/control and holds account + character locks in a transaction.
export async function mutateHunt(client: PoolClient, id: string, requestId: string, action: "hunt.begin" | "hunt.claim", state: CharacterState) {
  const hunt = await readHunt(client,id);
  if (action === "hunt.begin") {
    if (hunt.status === "locked") throw new AuthFault(409,"journey_required");
    if (hunt.status !== "available") throw new AuthFault(409,"hunt_already_started");
  } else {
    if (hunt.status === "locked" || hunt.status === "available") throw new AuthFault(409,"hunt_not_started");
    if (hunt.status === "claimed") throw new AuthFault(409,"hunt_already_claimed");
    if (hunt.status !== "ready") throw new AuthFault(409,"hunt_not_ready");
    if (BigInt(state.experience)>9223372036854775787n || BigInt(state.gold)>9223372036854775799n)
      throw new AuthFault(503,"progression_limit");
  }
  if (state.version >= Number.MAX_SAFE_INTEGER) throw new AuthFault(503,"state_version_exhausted");
  const updated=await client.query(
    "UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1 AND state_version=$2 RETURNING id",[id,state.version]);
  if (!updated.rowCount) throw new AuthFault(409,"state_version_conflict");
  if (action === "hunt.begin") {
    await client.query("INSERT INTO mare_game.character_hunts(character_id,request_id,version_before) VALUES($1,$2,$3)",[id,requestId,state.version]);
  } else {
    // Fixed rewards, immutable audit and guarded balances; never take amounts from the caller.
    await client.query(`INSERT INTO mare_game.character_hunt_rewards(character_id,request_id,version_before,experience_before,gold_before)
      VALUES($1,$2,$3,$4,$5)`,[id,requestId,state.version,state.experience,state.gold]);
    const credited=await client.query(`UPDATE mare_game.character_progression SET experience=experience+20,gold=gold+8
      WHERE character_id=$1 AND experience=$2 AND gold=$3 RETURNING character_id`,[id,state.experience,state.gold]);
    if (!credited.rowCount) throw new AuthFault(409,"state_version_conflict");
  }
}
