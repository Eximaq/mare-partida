'use strict';
// Small, repeatable analytical baseline. No saves, art, network or files are written.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../character-system.js'),H=require('../hunt-system.js');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8'),box={MareCharacters:C};vm.createContext(box);
vm.runInContext(source.slice(source.indexOf('  const classes ='),source.indexOf('  // Somente artes'))+';globalThis.data={classes,factions};',box);
const rows=[];
for(const [classId,c] of Object.entries(box.data.classes))for(const level of [1,5,10,11,15,20,21,25,30]){
 const role=C.roles[classId],attributes=C.empty(),budget=C.earned(level);attributes[role.primary]=Math.round(budget*.7);attributes[role.secondary]=budget-attributes[role.primary];
 const g=C.migrate({classId,level,attributeVersion:2,attributes}),d=C.derive(g,c,box.data.factions.pirate,{attack:6,defense:7,hp:24});
 const area=level<=10?'beach':level<=20?'swamp':'orange',r=H.get(area),sector=r.sectors.find(s=>level>=s.min&&level<=s.max)||r.sectors[0],mob=H.profile(area,sector.id,'bandit',0),boss=H.profile(area,r.sectors.at(-1).id,'boss');
 const rate=m=>C.damage(d,m.defense,{type:role.magic?'elemental':'physical'})*(1+d.crit*.65)*d.speed*d.accuracy;
 rows.push({classId,level,hp:d.maxHP,enemyLevel:mob.level,enemyHP:mob.maxHP,basicTTK:+(mob.maxHP/rate(mob)).toFixed(2),bossLevel:boss.level,bossBasicTTK:+(boss.maxHP/rate(boss)).toFixed(2)});
}
console.log(JSON.stringify({method:'Analytical basic attacks only; real derive/damage formulae; 70/30 attributes; starter stats ATQ6 DEF7 HP24; expected accuracy/crit. No skills, talents, forge, travel, potions, warning avoidance or progression during each sample. Not a measured campaign time.',rows},null,2));
