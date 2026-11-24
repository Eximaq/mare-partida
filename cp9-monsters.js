'use strict';
// Unassigned bestiary entries. Do not put this catalog in world, prison,
// dungeon, contract or reward pools without a separate encounter assignment.
((root)=>{
 const lucciNormal=Object.freeze({level:100,maxHP:10215,attack:226,defense:117,speed:50,reach:51,
   attackSec:2.1,aggro:300,xp:614,gold:Object.freeze([204,308])});
 const catalog=Object.freeze(Object.fromEntries([
  ['fukurou','Fukurou',97],['rob-lucci','Rob Lucci',100,'rob-lucci-zoan'],
  ['kalifa','Kalifa',101],['jabra','Jabra',104,'jabra-zoan'],
  ['blueno','Blueno',107],['kaku','Kaku',110,'kaku-zoan']
 ].map(([id,name,level,hybrid])=>[id,Object.freeze({id,name,level,availability:'unassigned',
   sprite:id,...(hybrid?{hybridSprite:hybrid,transformTrigger:'first-positive-hit'}:{}),
   ...(id==='rob-lucci'?{profileKind:'boss-dungeon',calibratedAgainst:'crocodile',normalCombat:lucciNormal,rewardConfigured:false}:{})
 })])));
 function combatProfile(id,characters=root.MareCharacters){
  const base=catalog[id]?.normalCombat;
  if(!base)return null;
  if(!characters&&typeof module!=='undefined')characters=require('./character-system.js');
  return {...characters.monsterProfile(base,{bossMultiplier:characters.monsterBalance.dungeonAttributes}),xp:0,gold:[0,0]};
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
