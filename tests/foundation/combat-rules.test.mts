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

// Each expected baseline is hand-derived from the versioned primary/secondary rules.
test("seven online classes derive bounded stats and allocated points affect only their intended formulas",async()=>{
 const {deriveFighter}=await import("../../apps/game-server/src/characters/fighter.js");
 const empty={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
 const state={characterId:"11111111-1111-4111-8111-111111111111",version:0,level:2,experience:"80",gold:"0"};
 for(const [classId,hp,min,armor,cooldown,type] of [
  ["sword",38,13,0,1860,"physical"],["brawler",46,12,1,1910,"physical"],["gunner",36,12,0,1850,"physical"],
  ["rogue",38,12,0,1840,"physical"],["cyborg",54,13,1,1940,"physical"],["strategist",36,13,0,1920,"elemental"],["healer",40,13,0,1920,"elemental"]] as const) {
   const f=deriveFighter(classId,state,empty);assert.equal(f.maxHp,hp);assert.equal(f.attackMin,min);assert.equal(f.attackMax,min+4);assert.equal(f.armor,armor);assert.equal(f.cooldownMs,cooldown);assert.equal(f.damageType,type);
 }
 const boosted=deriveFighter("sword",state,{...empty,strength:3,vitality:2});assert.equal(boosted.maxHp,42);assert.equal(boosted.attackMin,14);
 const tank=deriveFighter("cyborg",{...state,level:20,experience:"18209"},{...empty,vitality:95});assert.equal(tank.maxHp,244);assert.equal(tank.armor,6);assert.equal(tank.attackMin,45);
 const round=resolveCombatRound(244,36,45,11,tank);assert.deepEqual(round,{playerHp:244,enemyHp:0,playerDamage:36,enemyDamage:0,status:"won"});
 const defended=resolveCombatRound(244,36,10,7,{...tank,attackMin:10,attackMax:14});assert.equal(defended.enemyDamage,1);assert.equal(defended.playerHp,243);
 assert.throws(()=>deriveFighter("sword",state,{...empty,vitality:-1}));
});
