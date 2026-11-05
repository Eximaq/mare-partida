'use strict';
// Original enemy definitions shared by browser presentation and authoritative duels.
((root)=>{
 function create({monsters:MareMonsterCatalog,city:MareAlubarna,dungeons:MareBossDungeons}){
  const monsterTypes = {
    cesar: { name:'César', level:5, hp:211, atk:17, def:8, xp:70, gold:[22,35], reach:52, speed:55, attackSec:1.8, color:'#726770', icon:'◆' },
    cocox: { name:'Cocox', level:18, hp:620, atk:48, def:22, xp:140, gold:[45,70], reach:56, speed:82, attackSec:1.35, color:'#aaa797', icon:'◆' }
  };
  for(const id of ['sham','buchi','pearl','gin','kuroobi','chew','mr3','cabaji','marinheiro','helmeppo','bananawani','satori',...MareAlubarna.specs.map(s=>s.type)]){const m=MareMonsterCatalog[id];monsterTypes[id]={name:m.name,level:m.level,hp:m.max_hp,atk:m.physical_attack,def:m.physical_defense,magicDefense:m.magic_defense,xp:Math.round(140*1.055**(m.level-18)),gold:[90,135],reach:m.reach,speed:m.move_speed,attackSec:m.attack_seconds,color:'#d8aa79',icon:'◆'};}
  for(const d of MareBossDungeons.catalog){const p=MareBossDungeons.combatProfile(d.id);monsterTypes[d.monster]={name:d.name,hp:p.maxHP,atk:p.attack,def:p.defense,magicDefense:p.magicDefense,xp:0,gold:[0,0],speed:p.speed,reach:p.reach,attackSec:p.attackSec,accuracy:p.accuracy,boss:true,family:d.family||null,naturalProtection:d.naturalProtection??null,color:'#d8aa79',icon:'◆'};}
return monsterTypes;
 }
 const api={create};root.MareMonsterGameCatalog=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
