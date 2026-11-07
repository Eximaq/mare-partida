import type { PoolClient } from "pg";

// Old schema prefixes are intentionally supported in migration tests and upgrades.
// A detected migration is permanent for the lifetime of a pooled connection.
const supported = new WeakSet<PoolClient>();
// Only these constant SQL expressions are emitted; no caller-supplied SQL.
export async function rewardWalletOffsetSql(client: PoolClient): Promise<'0'|'mare_game.market_reward_wallet_offset($1)'> {
  if (!supported.has(client)) {
    const { present } = (await client.query<{ present: boolean }>(
      "SELECT to_regprocedure('mare_game.market_reward_wallet_offset(uuid)') IS NOT NULL AS present",
    )).rows[0]!;
    if (!present) return '0';
    supported.add(client);
  }
  return 'mare_game.market_reward_wallet_offset($1)';
}
export async function rewardWalletBaseline(client: PoolClient, characterId: string, available: string): Promise<string> {
  const offset = await rewardWalletOffsetSql(client);
  if (offset === '0') return available;
  return (await client.query<{ baseline: string }>(
    `SELECT greatest(0,$2::numeric+${offset})::text AS baseline`,
    [characterId, available],
  )).rows[0]!.baseline;
}
