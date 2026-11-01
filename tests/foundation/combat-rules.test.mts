import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveCombatRound } from "../../apps/game-server/src/characters/combat-rules.js";
import { characterCommandResultSchema } from "../../packages/shared/src/schemas/character-command.js";

test("combat rounds never heal or underflow, and a defeated enemy never counterattacks",()=>{
  for(const hp of [1,10,30]) for(const enemy of [1,14,36]) for(let playerRoll=10;playerRoll<=14;playerRoll++) for(let enemyRoll=7;enemyRoll<=11;enemyRoll++) {
    const result=resolveCombatRound(hp,enemy,playerRoll,enemyRoll);
    assert.ok(result.playerHp>=0&&result.playerHp<=hp);assert.ok(result.enemyHp>=0&&result.enemyHp<enemy);
    assert.equal(result.playerHp+result.enemyDamage,hp);assert.equal(result.enemyHp+result.playerDamage,enemy);
    if(result.enemyHp===0) {assert.equal(result.status,"won");assert.equal(result.enemyDamage,0);assert.equal(result.playerHp,hp);}
    else if(result.playerHp===0) assert.equal(result.status,"lost");else assert.equal(result.status,"active");
  }
});

test("combat rule boundaries reject invalid health and out-of-catalog rolls",()=>{
  for(const args of [[0,36,10,7],[31,36,10,7],[30,0,10,7],[30,37,10,7],[30,36,9,7],[30,36,15,7],[30,36,10,6],[30,36,10,12],[30,36,10.5,7]])
    assert.throws(()=>resolveCombatRound(args[0]!,args[1]!,args[2]!,args[3]!),RangeError);
});

test("combat rules terminate within four accepted turns with either victory or defeat",()=>{
  for(let playerRoll=10;playerRoll<=14;playerRoll++) for(let enemyRoll=7;enemyRoll<=11;enemyRoll++) {
    let playerHp=30,enemyHp=36,terminal=false;
    for(let turn=1;turn<=4;turn++) {
      const result=resolveCombatRound(playerHp,enemyHp,playerRoll,enemyRoll);
      playerHp=result.playerHp;enemyHp=result.enemyHp;
      if(result.status!=="active") {terminal=true;break;}
    }
    assert.equal(terminal,true);
  }
});

test("old immutable command receipts remain readable without a combat field",()=>{
  const receipt={requestId:"11111111-1111-4111-8111-111111111111",action:"state.sync",state:{characterId:"22222222-2222-4222-8222-222222222222",version:0,level:1,experience:"0",gold:"0"}};
  assert.deepEqual(characterCommandResultSchema.parse(receipt),receipt);
});
