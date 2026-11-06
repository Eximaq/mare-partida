import type { PoolClient } from "pg";

// Old schema prefixes are intentionally supported in migration tests and upgrades.
// A detected migration is permanent for the lifetime of a pooled connection.
const supported = new WeakSet<PoolClient>();
export async function rewardWalletBaseline(client: PoolClient, characterId: string, available: string): Promise<string> {
  if (!supported.has(client)) {
    const { present } = (await client.query<{ present: boolean }>(
      "SELECT to_regprocedure('mare_game.market_reward_wallet_offset(uuid)') IS NOT NULL AS present",
    )).rows[0]!;
    if (!present) return available;
    supported.add(client);
  }
  return (await client.query<{ baseline: string }>(
    "SELECT greatest(0,$2::numeric+mare_game.market_reward_wallet_offset($1))::text AS baseline",
    [characterId, available],
  )).rows[0]!.baseline;
}
