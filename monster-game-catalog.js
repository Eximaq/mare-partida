'use strict';
// Original enemy definitions shared by browser presentation and authoritative duels.
((root)=>{
 function create({monsters:MareMonsterCatalog,city:MareAlubarna,dungeons:MareBossDungeons}){
  const monsterTypes = {
    crab: { name:'Carapaça Ígnea', hp:45, atk:7, def:3, xp:22, gold:[6,13], reach:43, speed:42, attackSec:2.15, color:'#dd846c', icon:'◇' },
    bandit: { name:'Corsário de Brasa', hp:67, atk:10, def:5, xp:29, gold:[10,18], reach:51, speed:55, attackSec:1.95, color:'#e6b27d', icon:'⚔' },
    spirit: { name:'Sentinela Cinzenta', hp:52, atk:12, def:3, xp:34, gold:[10,19], reach:135, speed:34, attackSec:2.6, color:'#85d8c8', icon:'✧' },
    cesar: { name:'César', hp:211, atk:17, def:8, xp:70, gold:[22,35], reach:52, speed:55, attackSec:1.8, color:'#726770', icon:'◆' },
    boss: { name:'Guardião da Caldeira', hp:350, atk:17, def:10, xp:145, gold:[100,140], reach:56, speed:33, attackSec:2.45, color:'#e9c27b', icon:'♛' },
    cocox: { name:'Cocox', hp:620, atk:48, def:22, xp:140, gold:[45,70], reach:56, speed:82, attackSec:1.35, color:'#aaa797', icon:'◆' }
  };
  for(const id of ['sham','buchi','pearl','gin','kuroobi','chew','mr3','cabaji','marinheiro','helmeppo','bananawani','satori',...MareAlubarna.specs.map(s=>s.type)]){const m=MareMonsterCatalog[id];monsterTypes[id]={name:m.name,hp:m.max_hp,atk:m.physical_attack,def:m.physical_defense,xp:Math.round(140*1.055**(m.level-18)),gold:[90,135],reach:m.reach,speed:m.move_speed,attackSec:m.attack_seconds,color:'#d8aa79',icon:'◆'};}
  for(const d of MareBossDungeons.catalog){const p=MareBossDungeons.combatProfile(d.id);monsterTypes[d.monster]={name:d.name,hp:p.maxHP,atk:p.attack,def:p.defense,magicDefense:p.magicDefense,xp:0,gold:[0,0],speed:p.speed,reach:p.reach,attackSec:p.attackSec,boss:true,family:d.family||null,naturalProtection:d.naturalProtection??null,color:'#d8aa79',icon:'◆'};}
return monsterTypes;
 }
 const api={create};root.MareMonsterGameCatalog=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
