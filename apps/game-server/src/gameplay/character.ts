import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fighterSchema,type CharacterState,type AttributeValues,type OriginalInventory,type Fighter,type TalentBuild} from '@mare/shared';
import {getGameCatalog} from './catalog.js';
const require=createRequire(import.meta.url),characters=require('../../../../character-system.js');
const rules=require('../../../../character-catalog.js'),forge=require('../../../../forge-system.js');
const catalog=rules.create({characters});
const rulesHash=createHash('sha256').update(JSON.stringify(catalog)).update(getGameCatalog().rulesHash)
  .update(readFileSync(new URL('../../../../character-system.js',import.meta.url),'utf8').replaceAll('\r\n','\n')).digest('hex');
export const xpNeeded:(level:number)=>number=rules.xpNeeded;
export const advanceOriginalLevel:(value:{level:number;start:bigint;experience:bigint})=>{level:number;start:bigint;levels:{level:number;start:bigint}[]}=rules.advance;
export function deriveOriginalFighter(classId:string,factionId:string,state:CharacterState,allocated:AttributeValues,inventory:OriginalInventory,build?:TalentBuild,runtime?:any,haki?:any,fruits?:{registered:string[]} | null,battle?:any):Fighter {
  const A=require('../../../../akuma-system.js'),P=require('../../../../akuma-passives.js'),fruitId=A.itemData(inventory.equipment.akuma_no_mi,getGameCatalog().items)?.id;
  const gear=A.applyGear(forge.aggregate(inventory.equipment,getGameCatalog().items),inventory.equipment.akuma_no_mi,getGameCatalog().items);gear.akumaRegistered=fruits?.registered.length||0;
  const baseStats=characters.derive({classId,level:state.level,attributes:allocated},catalog.classes[classId],catalog.factions[factionId],gear);
  const T=require('../../../../talent-system.js');
  const talentStats=build&&T.spent(build)>0?T.applyStats(baseStats,{classId,talentBuilds:{[classId]:build}},runtime):baseStats;
  const hakiStats=haki?require('../../../../haki-system.js').stats(talentStats,{has_haki_unlocked:haki.state.unlocked,haki:haki.state},haki.runtime):talentStats;
  const stats=battle?require('../../../../fruit-runtime.cjs').stats(structuredClone(battle),{fruitId,classId,now:Date.now()},hakiStats):P.apply(hakiStats,fruitId,{magic:!!characters.roles[classId].magic,healer:classId==='healer'});
  const damageType=characters.roles[classId].magic?'elemental':'physical';
  return fighterSchema.parse({rulesetId:'original-character-v1',rulesHash,classId,factionId,level:state.level,sourceVersion:state.version,
    allocated,total:stats.attributes,...(fruitId?{fruitId}:{}),stats,...(build&&T.spent(build)>0||haki?.state.unlocked||fruitId?{baseStats}:{}),equipped:{weapon:null,armor:null},damageType,maxHp:stats.maxHP,
    attackMin:characters.damage(stats,0,{type:damageType,variance:.9}),attackMax:characters.damage(stats,0,{type:damageType,variance:1.12,critical:true}),
    armor:stats.defense,cooldownMs:Math.ceil(1000/stats.speed)});
}
// The encounter remains the dock pilot. Only the player's original formulas are migrated here.
export function resolveOriginalRound(playerHp:number,enemyHp:number,fighter:Extract<Fighter,{rulesetId:'original-character-v1'}>,rng:()=>number){
  const roll=()=>{const v=rng();if(!Number.isFinite(v)||v<0||v>=1)throw new RangeError('Invalid RNG');return v;};
  if(!Number.isInteger(playerHp)||playerHp<1||playerHp>fighter.maxHp||!Number.isInteger(enemyHp)||enemyHp<1||enemyHp>36)throw new RangeError('Invalid round');
  const playerDamage=Math.min(enemyHp,characters.damage(fighter.stats,0,{type:fighter.damageType,variance:.9+roll()*.22,critical:roll()<fighter.stats.crit}));
  const enemyAfter=enemyHp-playerDamage;
  const enemyDamage=enemyAfter===0?0:Math.min(playerHp,characters.incoming(fighter.stats,7+Math.floor(roll()*5),false,.85+roll()*.25));
  const playerAfter=playerHp-enemyDamage;
  return {playerHp:playerAfter,enemyHp:enemyAfter,playerDamage,enemyDamage,status:enemyAfter===0?'won' as const:playerAfter===0?'lost' as const:'active' as const};
}
