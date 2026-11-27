'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../world-battle.cjs'),H=require('../hunt-system.js'),B=require('../monster-behavior.js');
const cases=[
 ['thriller-bark-01','absalom',114,26000],['thriller-bark-02','perona',118,28000],
 ['thriller-bark-03','ryuma',122,30000],['thriller-bark-04','oars',127,32600],
 ['sabaody-01','pacifista',131,34800],['sabaody-02','urouge',136,37600],
 ['sabaody-03','hawkins',141,40600],['sabaody-04','x-drake',146,43700],
 ['marineford-01','squard',151,46900],['marineford-02','onigumo',156,50200],
 ['marineford-03','little-oars-jr',161,53600],['marineford-04','izo',166,57200],
 ['marineford-05','vista',171,60900],['marineford-06','jozu',176,64700]
];
test('all fourteen world encounters produce their approved combat profiles without entering the prison pool',()=>{
 for(const [area,type,level,xp] of cases){
  const entry=E.worldMonsterCatalog[type];assert(entry,type+' is active');
  assert(!E.prisonCatalog[type],type+' remains world-only');
  const slot=B.slots(area)[0];assert(slot,area+' has a spawn');
  const p=H.profile(area,slot.sector,type);
  assert.equal(p.level,level);assert.equal(p.xp,xp);
  assert(p.maxHP>0&&p.attack>0&&p.defense>0&&p.attackSec>0);
  assert.throws(()=>H.profile('beach','cais',type),/Monstro fora da ilha/);
 }
});
test('X Drake keeps the first-hit Zoan form through server JSON resume and resets on disengage',()=>{
 const S=require('../sabaody-monsters.js'),actor={type:'x-drake',alive:true,hp:100,engaged:true};
 assert.equal(S.recordHit(actor,0,1),false);
 assert.equal(S.recordHit(actor,8,1),true);
 assert.equal(S.form(actor,1.1,.18),'x-drake');
 const restored=JSON.parse(JSON.stringify(actor));
 assert.equal(S.form(restored,20,.18),'x-drake-zoan');
 B.disengage(restored);
 assert.equal(S.form(restored,21,.18),'x-drake');
 assert.equal(restored.sabaodyTransformed,undefined);
});
test('a published Enies battle keeps its combat state when the new hunt ledgers are appended',()=>{
 const old={rulesHash:'fde69ce5850f0028b5b45ac47805635b3fe798c56aad13c3ade9578297031259',area:'enies-lobby-03',hp:321,
  targetId:'same-target',pending:{targetId:'same-target',remaining:.17},cooldowns:[1,2,3],
  mobs:[{id:'same-target',type:'jabra',hp:1234,cp9Transformed:true,attackClock:.71}],
  hunts:{areas:{'enies-lobby-03':{kills:17,bosses:0,firstRewardClaimed:false,bossReadyAt:0,respawns:{'enies-lobby-03-0':1234}}}}
 };
 const original=structuredClone(old);E.upgradeBalance(old);
 for(const key of ['area','hp','targetId','pending','cooldowns','mobs'])assert.deepEqual(old[key],original[key],key+' is preserved');
 assert.deepEqual(old.hunts.areas['enies-lobby-03'],original.hunts.areas['enies-lobby-03']);
 for(const [id]of cases)assert.equal(old.hunts.areas[id]?.kills,0,id+' is initialized');
 assert.equal(old.rulesHash,E.rulesHash);
});
