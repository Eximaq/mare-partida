'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../world-battle.cjs'),A=require('../akuma-system.js'),P=require('../combat-action-policy.js'),T=require('../talent-system.js'),C=require('../character-system.js'),catalog=require('../character-catalog.js').create({characters:C});
function fixture(fruitId=null,classId='gunner'){
 const stats=C.derive({classId,level:30,attributes:C.empty()},catalog.classes[classId],catalog.factions.pirate,{attack:0,defense:0,hp:0});
 const b=E.create('beach',stats,1000,()=>.5),hero={x:100,y:100,direction:'front'},m={...b.mobs[0],id:'enemy',x:160,y:100,anchorX:160,anchorY:100,hp:1e6,maxHP:1e6,attack:0,speed:0,engaged:true,attackClock:99};b.mobs=[m];b.targetId=m.id;b.autoSkills=false;b.energy=1000;
 const nav={map:{spawn:{x:100,y:100},width:1000,height:1000},walkable:()=>true,projectileClear:()=>true,path:(_a,p)=>[{...p}],follow(a,path,speed,dt){if(path.length){const p=path[0],d=P.dist(a,p),n=Math.min(d,speed*dt);a.x+=(p.x-a.x)*n/(d||1);a.y+=(p.y-a.y)*n/(d||1);if(n===d)path.shift();}}};
 let now=Date.now();const context=()=>({hero,nav,stats,baseStats:stats,fruitId,classId,factionId:'pirate',now,rng:()=>.5});const step=(dt=.05,extra={})=>{now+=dt*1000;return E.step(b,{...context(),dt,...extra});};return {b,hero,m,stats,nav,context,step,cast:key=>E.fruitCast(b,key,context())};
}
test('human fruit cast reserves once, faces target, freezes movement, hits at punch release and adds no basic punch',()=>{
 const f=fixture('akuma_supa_supa'),hp=f.m.hp;assert(f.cast('1'));assert.equal(f.hero.direction,'right');assert.equal(f.b.energy,980);assert(!f.cast('1'));assert(!E.skill(f.b,0,f.context()));
 const path=[{x:300,y:100}],start={...f.hero};f.step(.2,{manualPath:path});assert.equal(f.m.hp,hp);assert.equal(f.hero.x,start.x);assert(f.b.fruit.castVisual);
 f.step(.05,{manualPath:path});assert(f.m.hp<hp);assert.equal(f.b.events.filter(e=>e.type==='damage').length,1);assert.equal(f.hero.x,start.x);
 f.b.auto=false;for(let i=0;i<7;i++)f.step(.05,{manualPath:path});assert(f.hero.x>start.x);assert(!f.b.fruit.castVisual);
});
test('stop auto preserves a confirmed cast; death, map and fruit changes cannot restore an old cast',()=>{
 for(const cancel of ['stop','death','map','fruit']){const f=fixture('akuma_supa_supa'),hp=f.m.hp;assert(f.cast('1'));if(cancel==='stop')f.b.auto=false;if(cancel==='death')f.b.hp=0;if(cancel==='map')E.changeArea(f.b,null,1000,()=>.5);if(cancel==='fruit')E.combatStats(f.b,{...f.context(),fruitId:null});f.step(.5);assert.equal(!!f.b.fruit?.castVisual,false);assert.equal(f.m.hp<hp,cancel==='stop');}
});
test('class and fruit skills coexist with separate cooldowns; Zoan form refuses human class action',()=>{
 const f=fixture('akuma_mera_mera');assert(E.skill(f.b,0,f.context()));const cd=f.b.cooldowns[0];f.step(1);assert(f.cast('1'));assert(Math.abs(f.b.cooldowns[0]-Math.max(0,cd-1))<1e-8);assert(f.b.fruit.cooldowns['akuma_mera_mera:1']);
 const z=fixture('akuma_tori_albatroz');assert(E.fruitTransform(z.b,true,z.context()));assert(!E.skill(z.b,0,z.context()));assert(z.cast('1'));assert(!z.b.fruit.castVisual);
});
test('automatic policy avoids living summons, active fields, overheals, walls and distant targets',()=>{
 const h={x:0,y:0},m={x:60,y:0,hp:100,alive:true},c={hero:h,target:m,enemies:[m],hp:100,maxHP:100,active:{genie:true},clear:()=>true};
 assert(!P.useful(P.fruitMeta('akuma_hoya_hoya','1'),c));assert(!P.useful({kind:'heal'},c));assert(P.useful({kind:'heal'},{...c,allies:[{hp:20,maxHP:100,alive:true}]}));
 assert(!P.useful({kind:'damage',range:50},c));assert(!P.useful({kind:'damage',range:100},{...c,clear:()=>false}));assert(!P.useful(P.fruitMeta('akuma_yami_yami','2'),{...c,active:{blackHole:true}}));
 const f=fixture('akuma_hoya_hoya');f.b.auto=true;f.b.autoSkills=true;for(let i=0;i<30;i++)f.step();assert(f.b.fruit.effects.genie);const ready=f.b.fruit.cooldowns['akuma_hoya_hoya:1'];f.b.fruit.cooldowns['akuma_hoya_hoya:1']=0;for(let i=0;i<20;i++)f.step();assert(f.b.fruit.effects.genie);assert.equal(f.b.fruit.cooldowns['akuma_hoya_hoya:1'],0);assert(ready>0);
});
test('ranged attacks hold voluntary movement through recovery but release before projectile arrival',()=>{
 const f=fixture();f.hero.x=0;f.b.auto=true;f.step();assert(f.b.pending);const x=f.hero.x,path=[{x:300,y:100}];for(let i=0;i<3;i++)f.step(.05,{manualPath:path});assert.equal(f.hero.x,x);f.b.auto=false;for(let i=0;i<40;i++)f.step(.05,{manualPath:path});assert(f.hero.x>x);
});
test('new PT only on claims; migration preserves legacy budget, reset refunds investments and level adds nothing',()=>{
 let g=T.migrate({classId:'sword',level:30,talentVersion:2,talentBuilds:{sword:{nodes:{'sword-0-0':5},keystone:null,ultimate:null}}});assert.equal(T.available(g),25);g.level=99;g=T.migrate(g);assert.equal(T.available(g),25);assert.equal(T.available(T.reset(g)),30);
 const fresh=T.migrate({classId:'sword',level:1,talentVersion:T.VERSION,talentLegacyBudget:0});assert.equal(T.available(fresh),0);fresh.level=100;assert.equal(T.available(T.migrate(fresh)),0);fresh.achievements.claimed=['kills-0'];assert.equal(T.available(T.migrate(fresh)),1);
});

test('healthy healer automatically heals a real injured party recipient but not a blocked or full one',()=>{
 const Party=require('../party-battle.cjs'),f=fixture(null,'healer'),a=fixture(),actors=[{id:'healer',...f.context(),b:f.b,connected:true},{id:'ally',...a.context(),b:a.b,connected:true}],room={id:'fixture-party',kind:'hunt',area:'beach',mobs:f.b.mobs,hunts:f.b.hunts};
 for(const actor of actors){actor.b.auto=false;actor.b.autoSkills=false;actor.hero.x=100;actor.hero.y=100;}
 f.b.auto=true;f.b.autoSkills=true;a.b.hp=a.stats.maxHP*.3;const before=a.b.hp,now=Date.now();
 for(let i=1;i<=15;i++)Party.step(room,actors,{nav:f.nav,now:now+i*100,dt:.1,rng:()=>.5,populate:false});
 const healIndex=E.catalog.classes.healer.skills.findIndex(s=>s.type==='heal');assert(f.b.cooldowns[healIndex]>0);assert(a.b.hp>before+f.stats.healing*.5);assert.equal(f.b.hp,f.stats.maxHP);
 const blocked=fixture(null,'healer');blocked.nav.projectileClear=()=>false;blocked.b.auto=true;blocked.b.autoSkills=true;blocked.step(.5,{allies:[{b:a.b,hero:a.hero,stats:a.stats}]});assert.equal(blocked.b.cooldowns[healIndex],0);
});
test('Nodachi keeps its grip and authored depth while the cutting edge points outward',()=>{
 const weapons=require('../tools/paper-doll-96-v3/weapons.json');const w=weapons.items.find(w=>w.id==='weapon-68');assert(w);assert.equal(w.edgeSide,1);assert.deepEqual(w.grip,{x:44,y:87});
});

test('human casting preserves cleanse skills and manual charge release exceptions',()=>{
 const h=fixture('akuma_horu_horu');h.hero.talentControl={remaining:3};h.b.hp=h.stats.maxHP*.4;assert(h.cast('2'));h.step(.3);assert(h.b.hp>h.stats.maxHP*.4);assert(!(h.hero.talentControl?.remaining>0));
 const j=fixture('akuma_jiki_jiki');assert(j.cast('1'));j.step(.5);assert(j.b.fruit.effects.jikiCharge);assert(j.cast('1'));j.step(.5);assert(!j.b.fruit.effects.jikiCharge);
 const m=fixture('akuma_mato_mato');Object.assign(m.m,{hasMatoMark:true,matoMarkUntil:Date.now()+10000,matoCharges:1});m.b.fruit={id:'akuma_mato_mato',transformed:false,cooldowns:{'akuma_mato_mato:1':Date.now()+10000},effects:{},job:null};m.b.energy=0;assert(m.cast('1'));assert.equal(m.m.matoCharges,0);
});
