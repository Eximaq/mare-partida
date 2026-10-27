'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),R=require('../ryu-system.js'),A=require('../akuma-system.js');
assert.equal(R.rules.worldSize,128);const fruit=A.catalog.find(f=>f.id===R.rules.id);const profile=require('../zoan-transition.js').profile(fruit,true);assert.equal(profile.width,128);assert.equal(profile.height,128);assert.equal(A.catalog.find(f=>f.id===R.rules.id).rank,'B');
assert.equal(R.damage(100,0,4.5,0,{fruitId:'akuma_beta_beta'},true),450);
assert.equal(R.damage(100,0,4.5,0,{fruitId:'akuma_beta_beta'},false),315);
assert.equal(R.damage(100,100,4.5,0,{},true),420);
assert.equal(R.mitigate(100,{physicalDamageReduction:.3}),70);
const m={};R.stun(m,10);assert.equal(m.isStunned,true);assert.equal(R.stunned(m,12.999),true);assert.equal(R.stunned(m,13),false);assert.equal(m.moving,0);
const calls=[],sandbox={Image:class{constructor(){this.complete=true;this.naturalWidth=100}addEventListener(){}}};vm.createContext(sandbox);
for(const f of ['ryu-data.js','ryu-system.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox);
const c={save(){},restore(){},drawImage(...a){calls.push(a)}};let frames=0;
for(const action of ['idle','walk','attack','bite','tail'])for(const dir of ['front','back','left','right']){const clip=R.clip(action,dir);frames+=clip.frames;for(let frame=0;frame<clip.frames;frame++)sandbox.MareRyu.drawActor(c,100,200,{action,direction:dir,time:frame/clip.fps});}
assert.equal(frames,304);assert.ok(calls.every(a=>a[7]/a[3]===2&&a[8]/a[4]===2),'every source pixel keeps the idle 2x scale, regardless of cell padding');
for(const direction of ['front','back','left','right'])for(const scale of [.5,1,1.25]){const pair=[];const context={save(){},restore(){},drawImage(...args){pair.push(args)}};for(const action of ['idle','walk'])sandbox.MareRyu.drawActor(context,100,200,{action,direction,time:0,scale});assert.equal(pair[0][7]/pair[0][3],pair[1][7]/pair[1][3]);assert.ok(Math.abs(pair[0][6]+R.clip('idle',direction).feet[0]*2*scale-200)<=.5);assert.ok(Math.abs(pair[1][6]+R.clip('walk',direction).feet[0]*2*scale-200)<=.5);}
assert.equal(R.timing('1','front').impact,1);assert.equal(R.timing('2','front').impact,1);
assert.deepEqual(R.rules,JSON.parse(fs.readFileSync(path.join(root,'assets/akuma/ryu/rules.json'))));
console.log('Ryu: catalog, physical damage, Haki bypass, armor, exact 3s stun, 304 frames and constant body scale relative to 128px idle passed');
