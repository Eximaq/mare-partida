import {deriveOriginalFighter} from '../../apps/game-server/src/gameplay/character.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),engine=require('../../world-battle.cjs'),C=require('../../character-system.js');
function fixture(classId='sword',keystone:string|null=null,ultimate:string|null=null){
 const stats={...C.derive({classId,level:1,attributes:C.empty()},engine.catalog.classes[classId],engine.catalog.factions.pirate,{attack:0,defense:0,hp:0}),physical:100,elemental:100,attack:100,maxHP:1000,maxEnergy:1000,healthRegen:0,vitalityHealthRegen:0,vitalityRegenRate:0,energyRegen:0,accuracy:1,crit:0,evasion:0,defense:0,speed:1,range:180};
 let b=engine.create('beach',stats,1000,()=>.5);const m=b.mobs[0];Object.assign(m,{type:'cesar',level:6,maxHP:10000,hp:10000,defense:0,magicDefense:0,attack:100,attackClock:999,patrolClock:999});b.mobs=[m];b.autoSkills=false;
 const hero={x:m.x-30,y:m.y,direction:'right'},nav={map:{width:4000,height:4000,spawn:{...hero}},walkable:(_x?:number,_y?:number)=>true,projectileClear:(_a:any,_z:any)=>true,path:(_:any,p:any)=>[{...p}],follow(a:any,p:any[],speed:number,dt:number){if(!p.length)return;const v=p[0],d=Math.hypot(v.x-a.x,v.y-a.y),n=Math.min(d,speed*dt);if(d){a.x+=(v.x-a.x)/d*n;a.y+=(v.y-a.y)/d*n;}if(n===d)p.shift();}};
 let now=1000;const context={hero,nav,stats,baseStats:stats,classId,factionId:'pirate',level:100,build:{nodes:{},keystone,ultimate},rng:()=>0};
 const step=(dt=.05)=>engine.step(b,{...context,now:now+=dt*1000,dt});
 const hit=()=>{b.pending={targetId:b.mobs[0].id,remaining:0};step();for(let n=0;n<25&&b.projectiles.length;n++)step();};
 return {get b(){return b;},context,stats,hero,nav,step,hit,reload(){b=JSON.parse(JSON.stringify(b));}};
}
test('server poison survives a JSON/worker reload and secondary ticks do not recursively proc',()=>{
 const f=fixture('rogue','poison');f.hit();assert.equal(f.b.mobs[0].talentPoison?.power,20);
 const hp=f.b.mobs[0].hp;f.reload();f.step(1);assert.equal(hp-f.b.mobs[0].hp,10);assert.equal(f.b.talents.procs.poison,1);
});
test('server energy efficiency and archmage affect actual skill cost without bypassing cooldown',()=>{
 const f=fixture('strategist',null,'archmage');f.b.targetId=f.b.mobs[0].id;f.b.energy=0;
 assert.equal(engine.skill(f.b,0,f.context),true);assert.equal(f.b.energy,0);assert(f.b.cooldowns[0]>0);assert.equal(engine.skill(f.b,0,f.context),false);
});
test('server asura persists delayed hits on the live target and cannot recursively make ghosts',()=>{
 const f=fixture('sword',null,'asura');f.hit();const hp=f.b.mobs[0].hp;f.reload();f.step(.3);
 assert.equal(hp-f.b.mobs[0].hp,26);assert.equal(f.b.talents.ultimate.delayed.length,0);assert.equal(f.b.talents.ultimate.procs.attacks,1);
});
test('server energy shield and immortal keep absolute cooldowns after death, reload and scene change',()=>{
 for(const [classId,keystone,ultimate,field,delay] of [['cyborg','energyShield',null,'energyShieldUntil',90000],['brawler',null,'immortal','immortalUntil',600000]] as const){
  const f=fixture(classId,keystone,ultimate);f.b.hp=2;Object.assign(f.b.mobs[0],{engaged:true,attack:100000,attackClock:0,reach:100});f.step();
  assert.equal(f.b.hp,1);assert.equal(f.b.talentCooldowns[field],1050+delay);f.reload();engine.changeArea(f.b,null,1100,()=>.5);assert.equal(f.b.talentCooldowns[field],1050+delay);
 }
});
test('light hands cannot steal more than six per spawn, including shadow clone contacts after reload',()=>{
 const f=fixture('rogue','lightHands','shadowClone');f.stats.crit=1;let total=0;
 for(let i=0;i<8;i++){f.b.pending={targetId:f.b.mobs[0].id,remaining:0};const r=f.step();total+=(r.talentSteals??[]).reduce((s:number,x:any)=>s+x.amount,0);const q=f.step(.3);total+=(q.talentSteals??[]).reduce((s:number,x:any)=>s+x.amount,0);f.reload();}
 assert.equal(total,6);assert.equal(f.b.mobs[0].talentStolen,6);
});
test('spatial and titan secondary kills obey walls and have one ordinary kill receipt per spawn',()=>{
 for(const [classId,ultimate] of [['sword','spatial'],['brawler','titan']]){
  const f=fixture(classId,null,ultimate),first=f.b.mobs[0];first.hp=10000;
  f.b.mobs.push({...structuredClone(first),id:'blocked',spawnId:'blocked',x:first.x+15,hp:1},{...structuredClone(first),id:'reachable',spawnId:'reachable',x:first.x+30,hp:1});
  f.nav.projectileClear=(_a:any,z:any)=>z.id!=='blocked';f.b.pending={targetId:first.id,remaining:0};const r=f.step();
  assert.deepEqual(r.kills.map((k:any)=>k.id),['reachable']);assert.equal(f.b.mobs.find((m:any)=>m.id==='blocked').hp,1);assert.equal(f.step().kills.length,0);
 }
});

test('intermediate hit hooks preserve stun, wear, combos, critical first shot, backstab and slows',()=>{
 const stun=fixture('brawler','concussion');stun.hit();assert.equal(stun.b.mobs[0].talentControl.type,'stun');
 const wear=fixture('sword','wear');wear.b.mobs[0].defense=100;for(let i=0;i<6;i++)wear.hit();assert.equal(wear.b.mobs[0].talentWear.stacks,5);assert.equal(wear.b.mobs[0].defense,100);
 const combo=fixture('brawler','growing');combo.hit();assert.equal(combo.b.mobs[0].hp,9954);for(let i=0;i<10;i++)combo.hit();assert.equal(combo.b.talents.combo,8);
 const focus=fixture('gunner','focus');focus.hit();assert.equal(focus.b.mobs[0].hp,9926);focus.hit();assert.equal(focus.b.mobs[0].hp,9881);
 const back=fixture('rogue','backstab');back.b.mobs[0].emberFacing='east';back.hit();assert.equal(back.b.mobs[0].hp,9925);back.hit();assert.equal(back.b.mobs[0].hp,9880);
 const freeze=fixture('strategist','freeze');freeze.hit();assert.equal(freeze.b.mobs[0].talentSlow.percent,.25);assert(freeze.b.mobs[0].talentSlow.remaining>2);
 const long=fixture('gunner','longshot');long.hero.x=long.b.mobs[0].x-180;long.hit();assert.equal(long.b.mobs[0].hp,9942);
});
test('intermediate kill, defense, healing and secondary projectile hooks use authoritative combat state',()=>{
 const blood=fixture('sword','bloodlust');blood.b.mobs[0].hp=1;blood.hit();assert.equal(engine.talentStats(blood.b,blood.context).speed,1.2);
 const siphon=fixture('strategist','siphon');siphon.b.energy=20;siphon.b.mobs[0].hp=1;siphon.hit();assert.equal(siphon.b.energy,120);
 const fury=fixture('brawler','fury');fury.b.hp=200;fury.hit();assert.equal(fury.b.hp,205.4);
 const parry=fixture('sword','parry');Object.assign(parry.b.mobs[0],{engaged:true,attackClock:0,reach:60});parry.step();assert.equal(parry.b.hp,1000);assert.equal(parry.b.mobs[0].hp,9950);
 const armor=fixture('cyborg','adaptive');armor.stats.defense=100;Object.assign(armor.b.mobs[0],{engaged:true,attackClock:0,reach:60});armor.step();assert.equal(engine.talentStats(armor.b,armor.context).defense,103);
 const blast=fixture('cyborg','unstable');Object.assign(blast.b.mobs[0],{engaged:true,attackClock:0,reach:60});blast.step();assert.equal(blast.b.mobs[0].hp,9970);
 const aura=fixture('healer','rejuvenation');aura.stats.healthRegen=10;aura.stats.energyRegen=10;aura.b.hp=500;aura.b.energy=500;aura.step(1);assert(Math.abs(aura.b.hp-512)<1e-8);assert(Math.abs(aura.b.energy-512)<1e-8);
 const pierce=fixture('gunner','pierce'),m=pierce.b.mobs[0];pierce.b.mobs.push({...structuredClone(m),id:'second',spawnId:'second',x:m.x+40});pierce.hit();assert.equal(pierce.b.mobs[1].hp,9978);
 const echo=fixture('strategist','echo');echo.hit();echo.reload();echo.step(.5);assert.equal(echo.b.mobs[0].hp,9933);assert.equal(echo.b.talents.procs.echo,1);
});
test('ultimate attacks implement execution, artillery, marks and half-strength clones without recursive procs',()=>{
 const execute=fixture('sword',null,'execution');execute.b.pending={targetId:execute.b.mobs[0].id,remaining:0};const before=execute.b.mobs[0].hp;assert.equal(execute.step().kills.length,0);assert(execute.b.mobs[0].hp<before);
 const boss=fixture('sword',null,'execution');boss.b.mobs[0].type='boss';boss.hit();assert.equal(boss.b.mobs[0].hp,9455);
 const artillery=fixture('gunner',null,'artillery');for(let i=0;i<5;i++)artillery.hit();assert.equal(artillery.b.mobs[0].hp,9575);
 const marks=fixture('rogue',null,'assassinMark');marks.stats.crit=1;for(let i=0;i<5;i++)marks.hit();assert.equal(marks.b.mobs[0].hp,9030);assert.equal(marks.b.mobs[0].assassinMarks,0);
 const clone=fixture('rogue','poison','shadowClone');clone.hit();clone.step(.3);assert.equal(clone.b.mobs[0].hp,9933);assert.equal(clone.b.mobs[0].clonePoison.power,10);assert.equal(clone.b.talents.ultimate.delayed.length,0);
});
test('ultimate defensive hooks use persistent server clocks, bounded vision and real resource consumption',()=>{
 const skin=fixture('brawler',null,'armamentSkin');Object.assign(skin.b.mobs[0],{engaged:true,attackClock:0,reach:60});skin.step();assert.equal(skin.b.hp,1000);assert.equal(skin.b.talents.ultimate.vigor,165);assert.equal(skin.b.mobs[0].hp,9990);
 const guardian=fixture('healer',null,'guardianAngel');guardian.b.hp=2;guardian.b.energy=0;Object.assign(guardian.b.mobs[0],{engaged:true,attackClock:0,reach:60,attack:100000});guardian.step();assert.equal(guardian.b.hp,1000);assert.equal(guardian.b.energy,1000);assert.equal(guardian.b.talentCooldowns.guardianUntil,601050);
 const emp=fixture('cyborg',null,'emp');emp.b.hp=550;Object.assign(emp.b.mobs[0],{engaged:true,attackClock:0,reach:60});emp.b.mobs.push({...structuredClone(emp.b.mobs[0]),id:'far',x:100000,attackClock:999});emp.step();assert.equal(emp.b.mobs[0].empRemaining,10);assert(!emp.b.mobs[1].empRemaining);assert.equal(emp.b.talentCooldowns.empUntil,46050);
 const mage=fixture('strategist',null,'archmage');mage.b.energy=40;Object.assign(mage.b.mobs[0],{engaged:true,attackClock:0,reach:60});mage.step();assert.equal(mage.b.energy,0);assert.equal(mage.b.hp,955);
 const over=fixture('cyborg',null,'overclock');over.hit();const hpBefore=over.b.hp;over.step(1);assert(Math.abs(hpBefore-over.b.hp-10)<1e-7);assert.equal(engine.talentStats(over.b,over.context).speed,2);
});
test('camouflage, orbital fire, cataclysm and singularity survive snapshots and respect server geometry',()=>{
 const hidden=fixture('gunner',null,'camouflage');hidden.step(.05);hidden.step(1);hidden.step(1);assert(hidden.b.talents.ultimate.hidden);hidden.hit();assert.equal(hidden.b.mobs[0].hp,9865);assert.equal(hidden.b.talents.ultimate.hidden,false);
 const orbital=fixture('cyborg',null,'orbital');orbital.hit();const hp=orbital.b.mobs[0].hp;orbital.reload();orbital.step(1);assert.equal(hp-orbital.b.mobs[0].hp,17);assert.equal(engine.talentStats(orbital.b,orbital.context).speed,.5);
 const burn=fixture('strategist',null,'cataclysm');burn.hit();assert.equal(burn.b.mobs[0].ultimateBurn.power,30);const before=burn.b.mobs[0].hp;burn.step(1);assert.equal(before-burn.b.mobs[0].hp,15);
 const gravity=fixture('strategist',null,'singularity');gravity.stats.crit=1;const m=gravity.b.mobs[0];gravity.b.mobs.push({...structuredClone(m),id:'pulled',x:m.x+100});gravity.hit();const x=gravity.b.mobs[1].x;gravity.reload();gravity.step(.2);assert(gravity.b.mobs[1].x<x);
});
test('healer finals have solo effects without creating party recipients; no overheal budget survives combat end',()=>{
 const blessing=fixture('healer',null,'eternalBlessing');blessing.b.targetId=blessing.b.mobs[0].id;
 const healIndex=engine.catalog.classes.healer.skills.findIndex((s:any)=>s.type==='heal');assert(engine.skill(blessing.b,healIndex,blessing.context));blessing.step(.6);assert(blessing.b.talents.ultimate.holyHP>0);assert(engine.talentStats(blessing.b,blessing.context).maxHP>1000);
 blessing.b.hp=engine.talentStats(blessing.b,blessing.context).maxHP;blessing.b.targetId=null;blessing.step();assert.equal(blessing.b.talents.ultimate.holyHP,0);assert.equal(blessing.b.hp,1000);
 const empathy=fixture('healer',null,'empathy');empathy.b.hp=500;Object.assign(empathy.b.mobs[0],{engaged:true,attackClock:0,reach:60});empathy.step();const population=empathy.b.mobs.length;assert(engine.skill(empathy.b,healIndex,empathy.context));empathy.step(.6);assert(empathy.b.mobs[0].hp<10000);assert.equal(empathy.b.mobs.length,population);
});
test('ricochet continues over time after JSON reload while secondary hits never create new chains',()=>{
 const f=fixture('gunner',null,'ricochet'),m=f.b.mobs[0];f.b.mobs.push({...structuredClone(m),id:'second',spawnId:'second',x:m.x+60});f.hit();f.step(1);const total=f.b.mobs.reduce((n:number,m:any)=>n+m.hp,0);f.reload();f.step(1);
 assert(f.b.mobs.reduce((n:number,m:any)=>n+m.hp,0)<total);assert.equal(f.b.talents.ultimate.ricochets.length,1);assert.equal(f.b.talents.ultimate.procs.attacks,1);
});


test('gravity cannot drag a monster across a solid movement barrier even when projectiles can cross',()=>{
 const f=fixture('strategist',null,'singularity');f.stats.crit=1;const m=f.b.mobs[0];f.b.mobs.push({...structuredClone(m),id:'pulled',x:m.x+100});f.hit();
 const pulled=f.b.mobs.find((m:any)=>m.id==='pulled'),x=pulled.x,wall=x-4;f.nav.walkable=(px=0)=>Math.abs(px-wall)>1;f.step(.05);assert.equal(pulled.x,x);
});


test('every original class, intermediate and final combination fits the authenticated fighter contract',()=>{
 const T=require('../../talent-system.js');let checked=0;
 for(const classId of Object.keys(engine.catalog.classes)){
  const tree=T.getTree(classId),nodes=Object.fromEntries(T.nodes(classId).filter((n:any)=>Number(n.id.split('-')[1])<2).map((n:any)=>[n.id,10]));
  for(const key of tree.keystones)for(const final of tree.ultimates){
   const build={nodes,keystone:key.id,ultimate:final.id};assert.equal(T.validate(classId,build,104,T.empty()),'');
   const fighter=deriveOriginalFighter(classId,'pirate',{characterId:'11111111-1111-4111-8111-111111111111',version:0,level:104,experience:'0',gold:'0'},C.empty(),{inventory:[],equipment:{},potions:0,materials:0,forgeSeq:0,forgeVersion:4,forgeHistory:[],catalogId:'original-game-v1'} as any,build);
   assert.equal(fighter.rulesetId,'original-character-v1');assert(Number.isFinite(fighter.maxHp));checked++;
  }
 }
 assert.equal(checked,63);
});
