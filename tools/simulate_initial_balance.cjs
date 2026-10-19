'use strict';
/* Diagnostic arena only: imports production formulae and animation timing, never edits a save. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),model=require('../character-system.js'),combat=require('../combat-animation.js');
const source=fs.readFileSync(path.join(ROOT,'game.js'),'utf8'),box={MareCharacters:model};vm.createContext(box);
vm.runInContext(source.slice(source.indexOf('  const classes ='),source.indexOf('  // Somente artes'))+';globalThis.data={classes,factions};',box);
vm.runInContext(source.slice(source.indexOf('  const monsterTypes ='),source.indexOf('  const itemDefs ='))+';globalThis.enemies=monsterTypes;',box);
const {classes,factions}=box.data,enemies=box.enemies,animations=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/classes/pirate-sword/metadata.json'),'utf8')).animations;
const LEVELS=[1,5,10,20,30],HORIZON=180,DT=.05,REPEATS=12,GEAR={attack:6,defense:7,hp:24};
const rng=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
const round=v=>Math.round(v*100)/100,mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
function profile(id,level){const a=model.empty(),r=model.roles[id],budget=model.earned(level);a[r.primary]=Math.round(budget*.7);a[r.secondary]=budget-a[r.primary];return a;}
function simulate(id,level,{count=1,skills=true,seed=1,animation=true,hpGrowth=.04}={}){
  const random=rng(seed),g=model.migrate({classId:id,level,attributeVersion:2,attributes:profile(id,level)});
  const d=model.derive(g,classes[id],factions.pirate,GEAR),c=classes[id],scale=1+Math.max(0,level-8)*.04,b=enemies.boss;
  const controller=id==='sword'&&animation?combat.create(animations):null;
  let hp=d.maxHP,energy=d.maxEnergy,guard=0,blessing=0,attackClock=0,respawn=0,t=0,kills=0,damage=0,taken=0,healed=0,spent=0,kos=0,skillDamage=0,skillHeal=0,blocked=0,starved=0;
  const cooldown=[0,0],uses=[0,0],ttks=[],pool=[];
  function spawn(){const hpScale=1+Math.max(0,level-8)*hpGrowth;return {hp:Math.round(b.hp*hpScale),maxHP:Math.round(b.hp*hpScale),armor:Math.round(b.def*scale),attack:Math.round(b.atk*scale),clock:.5,started:t,next:0};}
  for(let i=0;i<count;i++)pool.push(spawn());
  const alive=()=>pool.filter(m=>m.hp>0),target=()=>alive()[0];
  function heal(n,skill=false){const delta=Math.min(d.maxHP-hp,n);hp+=delta;healed+=delta;if(skill)skillHeal+=delta;return delta;}
  function hit(m,mult=1,skill=null){
    if(!m||m.hp<=0||respawn>0)return;
    const type=skill?.damageType||(model.roles[id].magic?'elemental':'physical');
    if(type==='physical'&&random()>d.accuracy)return;
    const critical=random()<d.crit,amount=model.damage(d,m.armor,{type,multiplier:mult,variance:.90+random()*.22,critical});
    const delta=Math.min(m.hp,amount);m.hp-=delta;damage+=delta;if(skill)skillDamage+=delta;
    if(m.hp<=0){kills++;ttks.push(t-m.started);m.next=t+1;}
  }
  function cast(i){
    const s=c.skills[i],m=target(),self=['guard','heal','blessing'].includes(s.type);
    if(!skills||controller?.locked()||cooldown[i]>0)return false;
    if(energy<s.cost){starved++;return false;}
    if(!self&&!m)return false;
    if(s.type==='heal'&&hp>=d.maxHP)return false;
    if(s.type==='blessing'&&blessing>0)return false;
    energy-=s.cost;spent+=s.cost;uses[i]++;cooldown[i]=s.cd;
    if(s.type==='guard'){guard=7;heal(Math.round(d.maxHP*(id==='cyborg'?.12:.18)+d.healing*.25),true);}
    if(s.type==='heal')heal(d.healing,true);
    if(s.type==='blessing'){guard=8;blessing=8;}
    if(s.type==='taunt'){guard=Math.max(guard,4);for(const other of alive())hit(other,s.multiplier,s);}
    if(s.type==='strike'){
      if(controller)controller.play('skill',{direction:'south',onImpact:()=>hit(m,s.multiplier,s)});
      else hit(m,s.multiplier,s);
    }
    if(s.type==='area'){
      const targets=alive().slice();
      if(controller)controller.play('skill',{direction:'south',onImpact:()=>targets.forEach(other=>hit(other,s.multiplier||1.55,s))});
      else targets.forEach(other=>hit(other,s.multiplier||1.55,s));
    }
    return true;
  }
  function offensive(){for(const [i,s] of c.skills.entries())if(s.type==='strike'||s.type==='taunt'||(s.type==='area'&&alive().length>=2))cast(i);}
  for(t=0;t<HORIZON;t+=DT){
    for(let i=0;i<2;i++)cooldown[i]=Math.max(0,cooldown[i]-DT);guard=Math.max(0,guard-DT);blessing=Math.max(0,blessing-DT);
    controller?.step(DT,{inCombat:true,direction:'south'});energy=Math.min(d.maxEnergy,energy+d.energyRegen*DT);
    if(respawn>0){respawn-=DT;if(respawn<=0){hp=d.maxHP;energy=d.maxEnergy;controller?.reset('south');}continue;}
    heal((d.healthRegen+(blessing>0?d.regenBuff:0))*DT);
    for(const [i,s] of c.skills.entries()){
      if(s.type==='heal'&&hp<d.maxHP*.7)cast(i);
      if(s.type==='blessing'&&hp<d.maxHP*.85&&guard<=0)cast(i);
      if(s.type==='guard'&&hp<d.maxHP*(id==='cyborg'?.85:.75)&&guard<=0)cast(i);
    }
    for(let i=0;i<pool.length;i++){
      let m=pool[i];if(m.hp<=0){if(t>=m.next)pool[i]=spawn();continue;}
      m.clock-=DT;
      if(m.clock<=0){m.clock=b.attackSec;if(random()<d.evasion)continue;
        const variance=.85+random()*.25,amount=model.incoming(d,m.attack,guard>0,variance),unblocked=model.incoming(d,m.attack,false,variance);
        blocked+=unblocked-amount;taken+=amount;hp=Math.max(0,hp-amount);
        controller?.play(hp<=0?'death':'hurt',{direction:'south'});
        if(hp<=0){kos++;respawn=4.1;break;}
      }
    }
    if(respawn>0)continue;
    if(controller&&skills&&!controller.locked())offensive();
    attackClock-=DT;
    const m=target();
    if(m&&attackClock<=0){
      const ok=controller?controller.play('attack',{direction:'south',onImpact:()=>hit(m)}):(hit(m),true);
      if(ok)attackClock=1/Math.max(.35,d.speed);
    }
    if(skills)offensive();
  }
  return {hp:d.maxHP,physical:d.physical,elemental:d.elemental,defense:d.defense,maxEnergy:d.maxEnergy,range:d.range,speed:d.speed,evasion:d.evasion,healing:d.healing,
    dps:damage/HORIZON,incomingDps:taken/HORIZON,ttk:ttks.length?mean(ttks):HORIZON,energyPerMinute:spent/HORIZON*60,energyEndPct:energy/d.maxEnergy*100,hpEndPct:hp/d.maxHP*100,
    healingPerSecond:healed/HORIZON,skillDamagePerEnergy:spent?skillDamage/spent:0,skillHealingPerEnergy:spent?skillHeal/spent:0,guardBlocked:blocked/HORIZON,blockedSkillAttempts:starved,
    kills,xpPerHour:kills*b.xp/HORIZON*3600,secondsToNextLevel:kills?Math.round(80+25*Math.pow(level-1,1.55))/(kills*b.xp/HORIZON):null,kos,uses};
}
const rows=[];
for(const level of LEVELS)for(const id of Object.keys(classes)){
  const summary={id,name:classes[id].name,level,profile:profile(id,level)};
  for(const [name,settings] of Object.entries({single:{count:1},pair:{count:2},basic:{count:1,skills:false}})){
    const samples=Array.from({length:REPEATS},(_,seed)=>simulate(id,level,{...settings,seed:4100+seed}));
    summary[name]=Object.fromEntries(Object.keys(samples[0]).filter(k=>k!=='uses').map(k=>[k,round(mean(samples.map(s=>s[k]??0)))]));
    summary[name].uses=samples[0].uses.map((_,i)=>round(mean(samples.map(s=>s.uses[i]))));
    summary[name].dpsMin=round(Math.min(...samples.map(s=>s.dps)));summary[name].dpsMax=round(Math.max(...samples.map(s=>s.dps)));
  }
  summary.skillDpsGainPct=round((summary.single.dps/summary.basic.dps-1)*100);
  assert.equal(model.spent(summary.profile),model.earned(level));assert(Object.values(summary.single).filter(v=>typeof v==='number').every(Number.isFinite));rows.push(summary);
}
const out=path.join(ROOT,'docs/balance-data');fs.mkdirSync(out,{recursive:true});
const proposal=[];
for(const level of [20,30])for(const id of Object.keys(classes)){
  const before=rows.find(r=>r.id===id&&r.level===level).single,samples=Array.from({length:REPEATS},(_,seed)=>simulate(id,level,{seed:4100+seed,hpGrowth:.10}));
  proposal.push({id,level,beforeTTK:before.ttk,afterTTK:round(mean(samples.map(s=>s.ttk))),beforeXP:before.xpPerHour,afterXP:round(mean(samples.map(s=>s.xpPerHour)))});
}
fs.writeFileSync(path.join(out,'initial-balance.json'),JSON.stringify({configuration:{levels:LEVELS,horizonSeconds:HORIZON,repeats:REPEATS,dt:DT,gear:GEAR,faction:'pirate',enemy:'boss',region:'beach',spawnGap:1,recommendedPrimaryShare:.7,usesProductionFormulae:true,usesProductionBentoController:true,normalizedCloseRange:true,noPotions:true,noLevelGainDuringSample:true},rows,proposal:{applied:false,description:'Boss HP growth after level8: 4% to 10% per level; attack/defense, XP and class stats unchanged. Diagnostic only.',rows:proposal}},null,2));
const fields=['id','level','hp','dps','incomingDps','ttk','energyPerMinute','hpEndPct','xpPerHour','secondsToNextLevel','skillDamagePerEnergy','skillHealingPerEnergy'];
fs.writeFileSync(path.join(out,'initial-balance.csv'),fields.join(',')+'\n'+rows.map(r=>fields.map(k=>r[k]??r.single[k]).join(',')).join('\n'));
console.log(`${rows.length} class/level combinations × 3 scenarios × ${REPEATS} deterministic seeds; production formulae; no runtime changes.`);
for(const level of LEVELS)console.log('Level '+level,rows.filter(r=>r.level===level).map(r=>`${r.id}: DPS ${r.single.dps}; HP ${r.single.hp}; TTK ${r.single.ttk}s`).join(' | '));
