'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../akainu-combat.js'),E=require('../world-battle.cjs'),C=require('../character-system.js');
const S=fs.existsSync(path.join(__dirname,'../weekly-boss-battle.cjs'))?require('../weekly-boss-battle.cjs'):{};
const profile={hp:10000,attack:50,defense:0,magicDefense:0,speed:80,reach:65,attackSec:2,aoeCooldown:8,aoeRadius:120,aoeWindup:1,aoeMultiplier:1.6,level:50,leash:480};
const nav={map:{width:1200,height:1200,spawn:{x:600,y:600}},walkable:()=>true,projectileClear:()=>true,path:(_,p)=>[{...p}],follow(a,p,s,dt){if(!p.length)return;const t=p[0],d=Math.hypot(t.x-a.x,t.y-a.y),r=Math.min(1,s*dt/Math.max(d,.001));a.x+=(t.x-a.x)*r;a.y+=(t.y-a.y)*r;}};
function fixture(){const stats=C.derive({classId:'sword',level:10,attributes:C.empty()},E.catalog.classes.sword,E.catalog.factions.pirate,{attack:0,defense:0,hp:0});const room={id:'event',config:{profile},contributions:{},mobs:[A.create({id:'boss',x:300,y:300,profile,now:1000})]};const actors=['a','b'].map((id,i)=>{const b=E.create(null,stats,1000,()=>.5);b.weeklyBossInstanceId=room.id;b.area='marineford';b.mobs=room.mobs;b.autoSkills=false;return {id,connected:true,hero:{x:320+i*10,y:300,direction:'left'},b,stats,baseStats:stats,classId:'sword',factionId:'pirate',level:10,build:undefined};});return {room,actors};}
function step(f,now,dt=.05){assert.equal(typeof S.step,'function','Weekly shared combat not implemented');return S.step(f.room,f.actors,{nav,now,dt,rng:()=>.5});}
test('all actors use one boss HP pool and player attacks cannot produce hunt loot',()=>{const f=fixture(),m=f.room.mobs[0];m.hp=1;m.nextPunchAt=1e9;m.nextAoeAt=1e9;f.actors[0].b.pending={targetId:'boss',remaining:0};const r=step(f,1050);assert.equal(m.hp,0);assert.equal(m.alive,false);assert.equal(r.flatMap(x=>x.kills).length,1);assert.equal(r[0].kills[0].reward,null);assert.equal(r[0].kills[0].weeklyBossId,'event');assert.deepEqual(f.actors[1].b.mobs,f.actors[0].b.mobs);assert.equal(f.actors[0].b.hunts.areas.beach.kills,0);});
test('AoE uses the real defensive damage pipeline and hits two actors in one shared timeline',()=>{const f=fixture();f.room.mobs[0].nextAoeAt=1000;const initial=f.actors.map(a=>a.b.hp);for(let t=1050;t<=2200;t+=50)step(f,t);for(let i=0;i<2;i++)assert(f.actors[i].b.hp<initial[i]);assert.equal(f.room.mobs[0].attackCount,1);for(const a of f.actors)assert.equal(a.b.events.filter(e=>e.type==='hurt').length,1);});
test('disconnected actor has no damage, cooldown advance or contribution',()=>{const f=fixture();f.actors[1].connected=false;const before=structuredClone(f.actors[1].b);f.room.mobs[0].nextAoeAt=1000;for(let t=1050;t<=2200;t+=50)step(f,t);assert.equal(f.actors[1].b.hp,before.hp);assert.equal(f.actors[1].b.metrics,undefined);assert.equal(f.room.contributions.b,undefined);});
test('lethal player damage cancels an in-progress magma cast',()=>{const f=fixture();f.room.mobs[0].nextAoeAt=1000;step(f,1050);f.room.mobs[0].hp=1;f.actors[0].b.pending={targetId:'boss',remaining:0};step(f,1100);for(let t=1150;t<=2400;t+=50)step(f,t);assert.equal(f.actors[0].b.events.filter(e=>e.type==='hurt').length,0);assert.equal(f.room.mobs[0].telegraph,null);});
test('combat never credits idle observation as damage or healing',()=>{const f=fixture();step(f,1050);assert.equal(f.room.contributions.a.damage,0);assert.equal(f.room.contributions.a.healing,0);});
test('new weekly boss damage uses each defender max HP, not current HP or the legacy attack',()=>{
 const D=require('../weekly-admirals.js'),f=fixture();
 f.room.mobs=[D.initialize(A.create({id:'boss',x:300,y:300,profile:D.balanceProfile('kizaru'),now:1000}),'kizaru')];
 const boss=f.room.mobs[0];boss.attack=999999;boss.nextAoeAt=1000;
 assert.equal(boss.maxHP,300000);
 const base=[4000,10000];
 for(const [i,a] of f.actors.entries()){
  a.stats={...a.stats,maxHP:base[i],mitigation:0,defense:0,magicDefense:0,impactResistancePercent:0};
  a.baseStats=a.stats;a.b.hp=base[i]/2;
 }
 for(let t=1050;t<=2400;t+=50)step(f,t);
 for(const [i,a] of f.actors.entries()){
  const max=E.combatStats(a.b,a).maxHP;
  const expected=C.incoming({...E.combatStats(a.b,a),defense:0},max*.05,false,.975,{monster:boss});
  assert.equal(a.b.events.filter(e=>e.type==='hurt').length,1);
  assert.equal(a.b.events.find(e=>e.type==='hurt').amount,expected);
 }
 assert.equal(boss.attack,999999,'must not mutate the shared boss attack per defender');
});
