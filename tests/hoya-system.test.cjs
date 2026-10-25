'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),H=require('../hoya-system.js'),A=require('../akuma-system.js'),P=require('../akuma-passives.js');
assert.equal(H.rules.worldSize,96);assert.equal(H.rules.buffScale,1.5);assert.equal(A.byId(H.rules.id).rank,'B');assert.deepEqual(P.stats[H.rules.id],H.rules.passiveStats);
const total={maxHP:100,attack:50,defense:20,speed:2,moveSpeed:100,crit:.2},g=H.create(total,0,0,0);assert.equal(g.hp,150);assert.equal(g.baseStats.attack,75);assert.equal(g.baseStats.defense,30);assert.equal(g.baseStats.speed,3);assert.equal(g.baseStats.moveSpeed,150);assert(H.active(g,59.99));assert(!H.active(g,60));
g.hp=75;assert(H.empower(g,1));H.sync(g,1.3,.3);assert.equal(g.hp,150);assert.equal(g.scale,1.5);assert.equal(H.stats(g,1.3).attack,150);H.sync(g,11,.3);assert.equal(g.hp,75);assert.equal(g.scale,1);assert.equal(H.stats(g,11).attack,75);
let hits=0;g.clock.play('attack',{attackSpeed:3,onImpact:()=>hits++});g.clock.step(.18);assert.equal(hits,0);g.clock.step(.01);assert.equal(hits,1);H.empower(g,12);g.clock.step(1);assert.equal(hits,1);
const manifest=require('../assets/akuma/hoya/manifest.json');for(const f of manifest.assets)assert.equal(crypto.createHash('sha256').update(fs.readFileSync('assets/akuma/hoya/'+f.asset)).digest('hex'),f.sha256);
for(const [action,dirs]of Object.entries(H.clips))for(const cl of Object.values(dirs)){assert.equal(cl.frames,action==='idle'?1:17);assert.equal(cl.rgba_sha256.length,cl.frames);assert(cl.foot>0);}
// All animation sheets share the original 64px reference even when padded for a weapon.
const draws=[];global.Image=class {constructor(){this.complete=true;this.naturalWidth=10000}};const ctx={save(){},restore(){},drawImage(...a){draws.push(a)}};for(const action of ['idle','walk','attack']){g.clock.reset();g.walking=action==='walk'?1:0;if(action==='attack')g.clock.play('attack',{attackSpeed:3});H.drawActor(ctx,g,12);assert.equal(draws.at(-1).at(-2),H.clips[action].south.size*96/64);}
console.log('Hoya: base 96px across all poses, 144px empowerment, stats, proportional HP, single impact, expiry and original hashes passed');

const realNow=Date.now;try{let now=1000;Date.now=()=>now;const p=H.create(total,0,0,0);H.empower(p,0);now=11000;assert(!H.empowered(p,0),'real time expires buff while world is paused');now=61000;assert(!H.active(p,0),'real time expires summon while world is paused');}finally{Date.now=realNow;}
