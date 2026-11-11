'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
const a=src.indexOf('  function stepWolfBleeds()'),b=src.indexOf('  function isUshiForm()',a);
const mob={alive:true,x:10,y:20,wolfBleed:{started:0,nextTick:1,attack:100}},hits=[];
const s={world:{time:0,mobs:[mob],fx:[]},MareWolf:require('../wolf-system.js'),enemyArmor:()=>0,outputDamage:(m,n)=>hits.push(n)};vm.createContext(s);vm.runInContext(src.slice(a,b),s);
for(let i=1;i<=5;i++){s.world.time=i;s.stepWolfBleeds();}
assert.deepEqual(hits,[20,20,20,20,20]);assert.equal(s.world.fx.length,5,'exactly one cosmetic pulse per real bleed event');assert.equal(mob.wolfBleed,undefined);for(const f of s.world.fx){assert.equal(f.life,.32);assert.equal(f.x,10);}
console.log('Five unchanged bleed ticks emit exactly five short cosmetic pulses, including final tick.');
