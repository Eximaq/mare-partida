import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),engine=require('../../world-battle.cjs'),C=require('../../character-system.js');
function fixture(classId='sword',keystone:string|null=null,ultimate:string|null=null){
 const stats={...C.derive({classId,level:1,attributes:C.empty()},engine.catalog.classes[classId],engine.catalog.factions.pirate,{attack:0,defense:0,hp:0}),physical:100,elemental:100,attack:100,maxHP:1000,maxEnergy:1000,healthRegen:0,energyRegen:0,accuracy:1,crit:0,evasion:0,defense:0,speed:1,range:180};
 let b=engine.create('beach',stats,1000,()=>.5);const m=b.mobs[0];Object.assign(m,{type:'bandit',maxHP:10000,hp:10000,defense:0,magicDefense:0,attack:100,attackClock:999,patrolClock:999});b.mobs=[m];b.autoSkills=false;
 const hero={x:m.x-30,y:m.y,direction:'right'},nav={map:{width:4000,height:4000,spawn:{...hero}},walkable:(_x?:number,_y?:number)=>true,projectileClear:(_a:any,_z:any)=>true,path:(_:any,p:any)=>[{...p}],follow(a:any,p:any[],speed:number,dt:number){if(!p.length)return;const v=p[0],d=Math.hypot(v.x-a.x,v.y-a.y),n=Math.min(d,speed*dt);if(d){a.x+=(v.x-a.x)/d*n;a.y+=(v.y-a.y)/d*n;}if(n===d)p.shift();}};
 let now=1000;const context={hero,nav,stats,baseStats:stats,classId,factionId:'pirate',level:100,build:{nodes:{},keystone,ultimate},rng:()=>0};
 const step=(dt=.05)=>engine.step(b,{...context,now:now+=dt*1000,dt});
 const hit=()=>{b.pending={targetId:b.mobs[0].id,remaining:0};step();for(let n=0;n<25&&b.projectiles.length;n++)step();};
 return {get b(){return b;},context,stats,hero,nav,step,hit,reload(){b=JSON.parse(JSON.stringify(b));}};
}
const H=require('../../haki-system.js');
function learned(f:any){f.b.haki=H.migrate({}).haki;f.b.haki.unlocked=true;f.b.haki.mastery.completedVersions={armament:1,observation:1,conqueror:1};}
test('authoritative Haki touch activates learned auto once, drains, exhausts and does not rearm in the same fight',()=>{
 const f=fixture();learned(f);f.b.haki.auto='armament';f.b.haki.current=1;f.hit();assert.equal(f.b.hakiRuntime.active,'armament');
 for(let i=0;i<5;i++)f.step(.05);assert.equal(f.b.haki.current,0);assert.equal(f.b.hakiRuntime.active,null);f.hit();assert.equal(f.b.hakiRuntime.active,null);
 f.b.mobs=[];for(let i=0;i<7;i++)f.step(1);assert(f.b.haki.current>0);assert.equal(f.b.hakiRuntime.inCombat,false);
});
test('Haki stats apply once, obey learned gates and original caps, and observation activates before an incoming evade roll',()=>{
 const f=fixture();learned(f);f.b.hakiRuntime=H.start();f.b.hakiRuntime.active='armament';
 const stats=engine.combatStats(f.b,f.context);assert.equal(stats.penetration,.15);assert.equal(stats.defense,0);f.stats.defense=10;assert.equal(engine.combatStats(f.b,f.context).defense,11);
 f.b.hakiRuntime.active='observation';f.stats.evasion=.7;assert.equal(engine.combatStats(f.b,f.context).evasion,.6);assert.equal(engine.combatStats(f.b,f.context).accuracy,1);
 f.b.haki.mastery.completedVersions={};assert.equal(engine.combatStats(f.b,f.context).evasion,.45);
 f.b.haki.mastery.completedVersions={observation:1};f.b.haki.auto='observation';f.b.hakiRuntime=H.start();f.stats.evasion=0;Object.assign(f.b.mobs[0],{attackClock:0,engaged:true,reach:100});f.context.rng=()=>.1;const before=f.b.hp;f.step();assert.equal(f.b.hp,before);assert.equal(f.b.hakiRuntime.active,'observation');
});
test('king uses server time and LOS, debuffs bosses without stacking, and survives JSON, travel and death',()=>{
 const f=fixture();learned(f);const m=f.b.mobs[0];Object.assign(m,{type:'boss',boss:true});f.b.mobs.push({...structuredClone(m),id:'blocked',x:m.x+10},{...structuredClone(m),id:'normal',type:'bandit',boss:false,x:m.x+20});f.nav.projectileClear=(_a:any,z:any)=>z.id!=='blocked';
 assert.equal(engine.hakiCast(f.b,{...f.context,now:1000}).ok,true);assert.equal(f.b.haki.current,50);assert.equal(m.hakiDebuff,8);assert.equal(m.talentControl,undefined);assert.equal(f.b.mobs[1].hakiDebuff,undefined);assert.equal(f.b.mobs[2].talentControl.remaining,3);
 f.reload();assert.equal(engine.hakiCast(f.b,{...f.context,now:1001}).ok,false);assert.equal(f.b.haki.current,50);f.step(1);assert(f.b.mobs[0].hakiDebuff<8);assert(f.b.mobs[2].talentControl.remaining<3);
 engine.changeArea(f.b,null,2000,()=>.5);assert.equal(f.b.haki.kingReadyAt,9000);assert.equal(f.b.hakiRuntime.active,null);assert.equal(f.b.haki.current,50);
});
test('unlearned or locked king cannot spend willpower, and death resets runtime but preserves reserve/cooldown',()=>{
 const f=fixture();assert.equal(engine.hakiCast(f.b,{...f.context,now:1000}).ok,false);learned(f);f.b.haki.mastery.completedVersions={};assert.equal(engine.hakiCast(f.b,{...f.context,now:1000}).ok,false);
 f.b.haki.mastery.completedVersions={armament:1};f.b.haki.current=37;f.b.haki.kingReadyAt=9000;f.b.hakiRuntime=H.start();f.b.hakiRuntime.active='armament';f.b.hp=1;Object.assign(f.b.mobs[0],{attack:99999,attackClock:0,engaged:true,reach:100});f.context.rng=()=>.9;f.step();assert.equal(f.b.hp,0);assert.equal(f.b.hakiRuntime.active,null);assert.equal(f.b.haki.kingReadyAt,9000);assert(f.b.haki.current<=37);
});
