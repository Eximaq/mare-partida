'use strict';
// Reference profiles and art bindings only; not part of any active dungeon, loot or timing catalog.
((root)=>{
 const rows=[
  ['hancock','Boa Hancock',130,16262,292,152,'Perfume Femur','Mero Mero Mellow','mero-mero-mellow','front-cone',['area']],
  ['magellan','Magellan',140,18585,314,163,'Golpe de Veneno','Hydra','hydra','projectile-ground',['projectile','area']],
  ['ace','Portgas D. Ace',150,21063,336,175,'Hiken','Entei','entei','projectile-area',['projectile','area']],
  ['aokiji','Aokiji',160,23694,358,186,'Ice Saber','Ice Age','ice-age','radial-area',['area']],
  ['akainu','Akainu',170,26480,380,197,'Punho de Magma','Ryusei Kazan','ryusei-kazan','falling-projectile-area',['projectile','area']]
 ];
 const catalog=Object.freeze(Object.fromEntries(rows.map(([id,name,level,maxHP,attack,defense,basic,skill,skillId,geometry,effectKinds])=>[id,Object.freeze({
  id,name,level,monster:'dungeon-'+id,profileKind:'boss-dungeon',availability:'unassigned',rewardConfigured:false,
  normalCombat:Object.freeze({level,maxHP,attack,defense,speed:50,reach:51,attackSec:2.1,aggro:300}),
  normalAttack:Object.freeze({name:basic,action:'attack'}),
  skill:Object.freeze({id:skillId,name:skill,action:'special',geometry,impactFrame:2,effects:Object.freeze(effectKinds)})
 })])));
 function combatProfile(id,characters=root.MareCharacters){
  if(!Object.hasOwn(catalog,id))return null;
  if(!characters&&typeof module!=='undefined')characters=require('./character-system.js');
  const p=characters.monsterProfile(catalog[id].normalCombat,{bossMultiplier:characters.monsterBalance.dungeonAttributes});
  return {...p,xp:0,gold:[0,0]};
 }
 root.MarePreparedDungeonBosses=Object.freeze({catalog,combatProfile});
 if(typeof module!=='undefined')module.exports=root.MarePreparedDungeonBosses;
})(globalThis);
