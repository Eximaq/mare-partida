import type {Fighter} from "@mare/shared";
// Pilot ruleset, independent of demo classes/equipment. Inputs are server-owned.
export function resolveCombatRound(playerHp: number, enemyHp: number, playerRoll: number, enemyRoll: number, fighter?:Fighter|null) {
  const maxHp=fighter?.maxHp??30,min=fighter?.attackMin??10,max=fighter?.attackMax??14,armor=fighter?.armor??0;
  if (![playerHp,enemyHp,playerRoll,enemyRoll].every(Number.isInteger) ||
      playerHp<1 || playerHp>maxHp || enemyHp<1 || enemyHp>36 || playerRoll<min || playerRoll>max || enemyRoll<7 || enemyRoll>11)
    throw new RangeError("Invalid combat ruleset input");
  const playerDamage=Math.min(enemyHp,playerRoll);
  const enemyAfter=enemyHp-playerDamage;
  const enemyDamage=enemyAfter===0 ? 0 : Math.min(playerHp,Math.max(1,enemyRoll-armor));
  const playerAfter=playerHp-enemyDamage;
  return {playerHp:playerAfter,enemyHp:enemyAfter,playerDamage,enemyDamage,
    status: enemyAfter===0 ? "won" as const : playerAfter===0 ? "lost" as const : "active" as const};
}
