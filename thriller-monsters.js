'use strict';
// Approved Thriller profiles: four world encounters and the existing Moria dungeon.
((root)=>{
 const entries=[
  ['absalom','Absalom',114,143927,4929,1498,238,26000],
  ['perona','Perona',118,163246,5486,1652,257,28000],
  ['ryuma','Ryuma',122,185158,6106,1822,278,30000],
  ['oars','Oars',127,216729,6981,2058,307,32600],
 ];
 const common=entries.map(([id,name,level,maxHP,attack,defense,magicDefense,nominalXP])=>({
  id,name,level,nominalXP,profileKind:'common',calibratedAgainst:'kaku-level-110',
  normalCombat:Object.freeze({level,maxHP,attack,defense,magicDefense,attackSec:2.1})
 }));
 const moria={id:'gecko-moria',name:'Gecko Moria',level:110,profileKind:'boss-dungeon',calibratedAgainst:'crocodile-level-90-and-lucci-level-100',
  normalCombat:Object.freeze({level:110,maxHP:12077,attack:248,defense:129,speed:50,reach:51,attackSec:2.1,aggro:300,xp:674,gold:Object.freeze([224,338])})
 };
 const catalog=Object.freeze(Object.fromEntries([...common,moria].map(x=>[x.id,Object.freeze({...x,
  availability:x.id==='gecko-moria'?'boss-dungeon':'world',sprite:x.id,rewardConfigured:false
 })])));
 function combatProfile(id,characters=root.MareCharacters){
  if(!Object.hasOwn(catalog,id))return null;
  if(!characters&&typeof module!=='undefined')characters=require('./character-system.js');
  const e=catalog[id],boss=e.profileKind==='boss-dungeon';
  const stats=characters.monsterProfile(e.normalCombat,boss?{bossMultiplier:characters.monsterBalance.dungeonAttributes}:undefined);
  return {...stats,xp:0,gold:[0,0],...(boss?{}:{nominalXP:e.nominalXP})};
 }
 const api=Object.freeze({catalog,combatProfile});
 root.MareThrillerMonsters=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
