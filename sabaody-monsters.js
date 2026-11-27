'use strict';
// Approved Sabaody profiles shared by world encounters and Kuma/Kizaru dungeons.
((root)=>{
 const common=[
  ['pacifista','Pacifista',131,245820,7770,2269,332,34800],
  ['urouge','Urouge',136,287735,8883,2564,366,37600,'urouge-ampliado','prepared'],
  ['hawkins','Basil Hawkins',141,336797,10156,2897,404,40600,'hawkins-palha','prepared'],
  ['x-drake','X Drake',146,394224,11611,3273,445,43700,'x-drake-zoan','first-positive-hit']
 ].map(([id,name,level,maxHP,attack,defense,magicDefense,nominalXP,alternateSprite,activation])=>({
  id,name,level,profileKind:'common',calibratedAgainst:'oars-level-127',nominalXP,
  ...(alternateSprite?{alternateSprite,activation}:{}),
  normalCombat:Object.freeze({level,maxHP,attack,defense,magicDefense,attackSec:2.1})
 }));
 const bosses=[
  ['kuma','Bartholomew Kuma',120,14092,270,140],
  ['kizaru','Kizaru',130,16262,292,152]
 ].map(([id,name,level,maxHP,attack,defense])=>({id,name,level,profileKind:'boss-dungeon',
  calibratedAgainst:'crocodile-90-lucci-100-moria-110',
  normalCombat:Object.freeze({level,maxHP,attack,defense,speed:50,reach:51,attackSec:2.1,aggro:300})
 }));
 const catalog=Object.freeze(Object.fromEntries([...bosses,...common].map(p=>[p.id,Object.freeze({...p,sprite:p.id,
  availability:p.profileKind==='boss-dungeon'?'boss-dungeon':'world',rewardConfigured:false})])));
 const get=id=>Object.hasOwn(catalog,id)?catalog[id]:null;
 function combatProfile(id,characters=root.MareCharacters){
  const p=get(id);if(!p)return null;
  if(!characters&&typeof module!=='undefined')characters=require('./character-system.js');
  const boss=p.profileKind==='boss-dungeon';
  return {...characters.monsterProfile(p.normalCombat,boss?{bossMultiplier:characters.monsterBalance.dungeonAttributes}:undefined),
   xp:0,gold:[0,0],...(boss?{}:{nominalXP:p.nominalXP})};
 }
 const firstHits=new WeakMap(),prepared=new WeakSet();
 const ended=a=>a.alive===false||a.hp<=0||a.returning||a.engaged===false;
 function reset(actor){delete actor.sabaodyTransformed;firstHits.delete(actor);prepared.delete(actor);}
 function recordHit(actor,damage,now){
  if(get(actor?.type)?.activation!=='first-positive-hit'||ended(actor)||
    !Number.isFinite(damage)||damage<=0||!Number.isFinite(now)||actor.sabaodyTransformed)return false;
  actor.sabaodyTransformed=true;firstHits.set(actor,now);return true;
 }
 function setPreparedForm(actor,enabled){
  if(get(actor?.type)?.activation!=='prepared')return false;
  if(!enabled){prepared.delete(actor);return true;}
  if(ended(actor))return false;
  prepared.add(actor);return true;
 }
 function form(actor,now,reactionSeconds){
  const p=get(actor?.type);if(!p)return null;
  if(ended(actor)){reset(actor);return p.sprite;}
  const hit=firstHits.get(actor);
  return prepared.has(actor)||(actor.sabaodyTransformed&&(hit===undefined||now-hit>=reactionSeconds))?p.alternateSprite:p.sprite;
 }
 const api=Object.freeze({catalog,combatProfile,recordHit,setPreparedForm,form,reset,ended});
 root.MareSabaodyMonsters=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
