'use strict';
// Unassigned bestiary entries. Do not put this catalog in world, prison,
// dungeon, contract or reward pools without a separate encounter assignment.
((root)=>{
 const lucciNormal=Object.freeze({level:100,maxHP:10215,attack:226,defense:117,speed:50,reach:51,
   attackSec:2.1,aggro:300,xp:614,gold:Object.freeze([204,308])});
 // Bases from Ohm (Lv. 95); keep nominal XP separate from active rewards.
 const common=Object.freeze({
  fukurou:[84268,3126,989,171,19100],kalifa:[95579,3479,1091,184,20800],
  jabra:[105048,3770,1174,196,21900],blueno:[115455,4086,1263,207,23000],
  kaku:[126894,4428,1359,220,24100]
 });
 function commonCombat(id,level){
  const [maxHP,attack,defense,magicDefense]=common[id];
  return Object.freeze({level,maxHP,attack,defense,magicDefense,attackSec:2.1});
 }
 const catalog=Object.freeze(Object.fromEntries([
  ['fukurou','Fukurou',97],['rob-lucci','Rob Lucci',100,'rob-lucci-zoan'],
  ['kalifa','Kalifa',101],['jabra','Jabra',104,'jabra-zoan'],
  ['blueno','Blueno',107],['kaku','Kaku',110,'kaku-zoan']
 ].map(([id,name,level,hybrid])=>[id,Object.freeze({id,name,level,availability:'unassigned',
   sprite:id,...(hybrid?{hybridSprite:hybrid,transformTrigger:'first-positive-hit'}:{}),
   rewardConfigured:false,...(id==='rob-lucci'?{profileKind:'boss-dungeon',calibratedAgainst:'crocodile',normalCombat:lucciNormal}:
     {profileKind:'common',calibratedAgainst:'ohm',normalCombat:commonCombat(id,level),nominalXP:common[id][4]})
 })])));
 function combatProfile(id,characters=root.MareCharacters){
  const monster=Object.hasOwn(catalog,id)?catalog[id]:null;
  const base=monster?.normalCombat;
  if(!base)return null;
  if(!characters&&typeof module!=='undefined')characters=require('./character-system.js');
  const boss=monster.profileKind==='boss-dungeon';
  const stats=characters.monsterProfile(base,boss?{bossMultiplier:characters.monsterBalance.dungeonAttributes}:undefined);
  return {...stats,xp:0,gold:[0,0],...(boss?{}:{nominalXP:monster.nominalXP})};
 }
 const contacts=new WeakMap();
 const isMonster=id=>Object.hasOwn(catalog,id);
 function reset(actor){return contacts.delete(actor);}
 function recordHit(actor,now){
  if(!isMonster(actor?.type)||!catalog[actor.type].hybridSprite||actor.alive===false||
     actor.hp<=0||actor.returning||!Number.isFinite(now)||contacts.has(actor))return false;
  contacts.set(actor,now);return true;
 }
 function form(actor,now,humanHurtSeconds){
  const profile=isMonster(actor?.type)?catalog[actor.type]:null;
  if(!profile)return null;
  if(actor.alive===false||actor.hp<=0||actor.engaged===false||actor.returning)reset(actor);
  const first=contacts.get(actor);
  return first!==undefined&&now-first>=humanHurtSeconds?profile.hybridSprite:profile.sprite;
 }
 const api=Object.freeze({catalog,isMonster,combatProfile,recordHit,form,reset});
 root.MareCp9Monsters=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
