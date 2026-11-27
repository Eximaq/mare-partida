'use strict';
// Approved Marineford profiles assigned to the six archipelago encounters.
((root)=>{
 const entries=[
  ['squard','Squard',151,461443,13274,3698,491,46900],
  ['onigumo','Onigumo',156,540124,15176,4179,541,50200],
  ['little-oars-jr','Little Oars Jr.',161,632221,17350,4721,597,53600],
  ['izo','Izo',166,740021,19836,5335,659,57200],
  ['vista','Vista',171,866202,22678,6027,726,60900],
  ['jozu','Jozu',176,1013899,25927,6810,801,64700]
 ];
 const catalog=Object.freeze(Object.fromEntries(entries.map(([id,name,level,maxHP,attack,defense,magicDefense,nominalXP])=>[
  id,Object.freeze({id,name,level,nominalXP,availability:'world',sprite:id,profileKind:'common',
   calibratedAgainst:'x-drake-level-146',rewardConfigured:false,
   normalCombat:Object.freeze({level,maxHP,attack,defense,magicDefense,attackSec:2.1})})
 ])));
 function combatProfile(id,characters=root.MareCharacters){
  if(!Object.hasOwn(catalog,id))return null;
  if(!characters&&typeof module!=='undefined')characters=require('./character-system.js');
  const entry=catalog[id];
  return {...characters.monsterProfile(entry.normalCombat),xp:0,gold:[0,0],nominalXP:entry.nominalXP};
 }
 const api=Object.freeze({catalog,combatProfile});
 root.MareMarinefordMonsters=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
