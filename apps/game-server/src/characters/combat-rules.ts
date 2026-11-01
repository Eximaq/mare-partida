// Pilot ruleset, independent of demo classes/equipment. Inputs are server-owned.
export function resolveCombatRound(playerHp: number, enemyHp: number, playerRoll: number, enemyRoll: number) {
  if (![playerHp,enemyHp,playerRoll,enemyRoll].every(Number.isInteger) ||
      playerHp<1 || playerHp>30 || enemyHp<1 || enemyHp>36 || playerRoll<10 || playerRoll>14 || enemyRoll<7 || enemyRoll>11)
    throw new RangeError("Invalid combat ruleset input");
  const playerDamage=Math.min(enemyHp,playerRoll);
  const enemyAfter=enemyHp-playerDamage;
  const enemyDamage=enemyAfter===0 ? 0 : Math.min(playerHp,enemyRoll);
  const playerAfter=playerHp-enemyDamage;
  return {playerHp:playerAfter,enemyHp:enemyAfter,playerDamage,enemyDamage,
    status: enemyAfter===0 ? "won" as const : playerAfter===0 ? "lost" as const : "active" as const};
}
