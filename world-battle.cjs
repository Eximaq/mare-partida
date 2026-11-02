'use strict';
// Server-only simulation. The original catalogues remain the source of balance.
const {randomUUID,createHash}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const hunt=require('./hunt-system.js'),behavior=require('./monster-behavior.js'),characters=require('./character-system.js');
const catalog=require('./character-catalog.js').create({characters});
require('./combat-vfx-data.js');const vfx=require('./combat-vfx.js');
const sources=['hunt-system.js','monster-behavior.js','monster-catalog.js','character-system.js','character-catalog.js','combat-vfx.js','combat-vfx-data.js','world-battle.cjs'];
const rulesHash=createHash('sha256').update(sources.map(f=>f+fs.readFileSync(path.join(__dirname,f),'utf8').replaceAll('\r\n','\n')).join('\0')).digest('hex');
function populate(b,now,rng,hero){
 if(!b.area)return;
 const ledger=b.hunts.areas[b.area];
 const slots=behavior.ready(b.area,b.mobs,ledger.respawns,now);
 if(hero&&hunt.bossReady(b,b.area,hero,now))slots.push(...behavior.ready(b.area,b.mobs,ledger.respawns,now,true));
 for(const s of slots){const p=hunt.profile(b.area,s.sector,s.type,.5);b.mobs=b.mobs.filter(m=>m.spawnId!==s.id);
  b.mobs.push({...p,id:randomUUID(),spawnId:s.id,area:b.area,district:s.sector,type:s.type,x:s.x,y:s.y,anchorX:s.x,anchorY:s.y,hp:p.maxHP,alive:true,engaged:false,returning:false,attackClock:1,attackCount:0,bob:rng()*Math.PI*2,patrolClock:0,telegraph:null,moving:0,attackAnim:0,emberElapsed:0,emberFacing:'south',slow:0});}
}
function create(area,stats,now,rng=Math.random){
 const b={version:1,rulesHash,area,hp:stats.maxHP,energy:stats.maxEnergy,auto:false,autoSkills:true,targetId:null,pending:null,projectiles:[],attackClock:0,cooldowns:[0,0],guard:0,blessing:0,respawn:0,mobs:[],hunts:hunt.migrate({}).hunts,events:[],seq:0};
 populate(b,now,rng);return b;
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const live=m=>m?.alive&&!m.returning;
function event(b,type,data={}){b.events.push({seq:++b.seq,type,...data});b.events=b.events.slice(-24);}
function face(a,p){const dx=p.x-a.x,dy=p.y-a.y;a.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';a.emberFacing={left:'west',right:'east',front:'south',back:'north'}[a.direction];}
function move(a,goal,speed,dt,nav){const old={x:a.x,y:a.y},route=nav.path(a,goal);nav.follow(a,route,speed,dt);a.moving=distance(old,a)>.01?1:0;if(a.moving)face(a,{x:a.x+(a.x-old.x),y:a.y+(a.y-old.y)});}
function target(b){return b.mobs.find(m=>m.id===b.targetId&&live(m));}
function cancel(b){b.auto=false;b.targetId=null;b.pending=null;b.skillJob=null;b.projectiles=[];}
function changeArea(b,area,now,rng){cancel(b);b.area=area;b.mobs=[];populate(b,now,rng);}
function skill(b,index,c){
 const s=catalog.classes[c.classId]?.skills[index],m=target(b),self=['guard','heal','blessing'].includes(s?.type);
 if(!s||!b.area||b.hp<=0||b.skillJob||b.cooldowns[index]>0||b.energy<s.cost)return false;
 if(s.type==='heal'&&b.hp>=c.stats.maxHP||s.type==='blessing'&&b.blessing>0)return false;
 if(!self&&(!m||distance(c.hero,m)>c.stats.range||!c.nav.projectileClear(c.hero,m)))return false;
 b.energy-=s.cost;b.cooldowns[index]=s.cd*(c.factionId==='government'?.92:1);
 b.skillJob={index,targetId:m?.id??null};event(b,'skill',{index});return true;
}
function step(b,c){
 if(!Number.isFinite(c.dt)||c.dt<0||c.dt>1)throw new RangeError('Invalid battle step');
 if(b.rulesHash!==rulesHash)throw new Error('battle_rules_changed');
 const {hero,nav,stats,classId}=c,kills=[];let potionsUsed=0;
 const heal=amount=>{if(b.hp>0)b.hp=Math.min(stats.maxHP,b.hp+amount*(1+(stats.healingReceivedPercent||0)));};
 const rng=()=>{const n=c.rng();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError('Invalid RNG');return n;};
 const clear=(a,z)=>nav.projectileClear(a,z);
 const kill=(m,now)=>{
  if(!m.alive)return;m.alive=false;m.hp=0;m.telegraph=null;
  b.hunts=hunt.recordKill(b,b.area,m.type,now).state.hunts;
  b.hunts.areas[b.area].respawns[m.spawnId]=now+behavior.RESPAWN_MS;
  kills.push({id:m.id,area:b.area,monster:structuredClone(m),reward:hunt.rewards(b.area,m,c.level||1,rng())});event(b,'kill',{id:m.id});
 };
 function land(m,raw,now,slow=0){
  if(!live(m)||b.hp<=0)return;
  const amount=Math.min(m.hp,raw);behavior.hurt(m);m.hp-=amount;if(slow)m.slow=slow;
  event(b,'damage',{id:m.id,amount});if(m.hp<=0)kill(m,now);
 }
 function hit(m,multiplier,damageType,now,area=false,slow=0){
  if(!live(m)||b.hp<=0||distance(hero,m)>stats.range+(area?125:1)||!clear(hero,m))return;
  if(damageType==='physical'&&rng()>stats.accuracy){event(b,'miss',{id:m.id});return;}
  const armor=damageType==='elemental'?(m.magicDefense??m.defense):m.defense;
  const amount=characters.damage(stats,armor,{type:damageType,multiplier,variance:.9+rng()*.22,critical:rng()<stats.crit});
  if(['gunner','cyborg','strategist','healer'].includes(classId)){const kind=classId==='strategist'?'mage':classId;b.projectiles.push(vfx.projectile(kind,hero,m.id,{damage:amount,slow}));event(b,'projectile',{id:m.id,kind,x:hero.x,y:hero.y});}
  else land(m,amount,now,slow);
 }
 function damage(m,multiplier=1){
  if(b.hp<=0)return;if(rng()<stats.evasion){event(b,'evade');return;}
  const amount=Math.min(b.hp,characters.incoming(stats,m.attack*multiplier,b.guard>0,.85+rng()*.25));b.hp-=amount;event(b,'hurt',{amount});
  if(b.hp<=0){b.hp=0;b.respawn=4.1;b.pending=null;b.projectiles=[];b.skillJob=null;if(c.manualPath)c.manualPath.length=0;for(const other of b.mobs.filter(m=>m.alive))behavior.disengage(other);event(b,'death');}
 }
 const type=characters.roles[classId].magic?'elemental':'physical';
 let left=c.dt,now=c.now-c.dt*1000;
 while(left>1e-9){const dt=Math.min(.05,left);left-=dt;now+=dt*1000;
  b.cooldowns=b.cooldowns.map(n=>Math.max(0,n-dt));b.guard=Math.max(0,b.guard-dt);b.blessing=Math.max(0,b.blessing-dt);b.attackClock=Math.max(0,b.attackClock-dt);
  if(b.hp<=0){b.respawn=Math.max(0,b.respawn-dt);if(b.respawn<=1e-8){b.hp=stats.maxHP;b.energy=stats.maxEnergy;Object.assign(hero,nav.map.spawn);b.targetId=null;event(b,'respawn');}}
  else{heal(dt*((stats.healthRegen||0)+(b.area?0:1.9)+(b.blessing>0?stats.regenBuff:0)));b.energy=Math.min(stats.maxEnergy,b.energy+dt*stats.energyRegen);}
  populate(b,now,rng,hero);
  if(c.manualPath?.length&&b.hp>0&&now>=(c.manualStart||0))nav.follow(hero,c.manualPath,c.manualSpeed,Math.min(dt,(now-(c.manualStart||0))/1000));
  let m=target(b);
  if(b.auto&&b.hp>0&&b.area){
   if(b.hp<stats.maxHP*.4&&potionsUsed<(c.potions||0)){heal(Math.round(stats.maxHP*.44));potionsUsed++;event(b,'potion');}
   if(!m){m=b.mobs.filter(live).sort((a,z)=>distance(hero,a)-distance(hero,z))[0];b.targetId=m?.id??null;}
   if(b.autoSkills)for(const [index,s] of catalog.classes[classId].skills.entries()){
    const support=s.type==='heal'?b.hp<stats.maxHP*.7:s.type==='guard'?b.hp<stats.maxHP*(classId==='cyborg'?.85:.75)&&b.guard<=0:s.type==='blessing'?b.hp<stats.maxHP*.85&&b.guard<=0:false;
    const offensive=!['heal','guard','blessing'].includes(s.type)&&m&&distance(hero,m)<=stats.range&&b.attackClock<=0&&(s.type!=='area'||b.mobs.filter(other=>live(other)&&distance(m,other)<125).length>=2);
    if(support||offensive)skill(b,index,{...c,hero,nav});
   }
   const warnings=b.mobs.filter(live).map(m=>m.telegraph).filter(Boolean),danger=warnings.some(w=>hunt.danger(w,hero));
   if(danger){let goal;for(const r of [90,170,240]){for(let i=0;i<16;i++){const a=i*Math.PI/8,p={x:hero.x+Math.cos(a)*r,y:hero.y+Math.sin(a)*r};if(nav.walkable(p.x,p.y)&&!warnings.some(w=>hunt.danger(w,p))){goal=p;break;}}if(goal)break;}if(goal)move(hero,goal,stats.huntSpeed,dt,nav);}
   else if(m&&!b.pending&&(distance(hero,m)>stats.range-8||!clear(hero,m)))move(hero,m,stats.huntSpeed,dt,nav);
   else if(m&&!b.pending&&['gunner','strategist','healer'].includes(classId)&&distance(hero,m)>0&&distance(hero,m)<stats.range*.45){const d=distance(hero,m),goal={x:hero.x+(hero.x-m.x)/d*stats.huntSpeed*dt,y:hero.y+(hero.y-m.y)/d*stats.huntSpeed*dt};if(nav.walkable(goal.x,goal.y)&&clear(goal,m))move(hero,goal,stats.huntSpeed,dt,nav);}
   if(m&&!b.pending&&b.attackClock<=0&&distance(hero,m)<=stats.range&&clear(hero,m)){
    const duration=Math.max(.15,1/stats.speed);face(hero,m);b.pending={targetId:m.id,remaining:duration*.5};b.attackClock=duration;event(b,'attack',{id:m.id,duration});
   }
  }
  if(b.pending){b.pending.remaining-=dt;if(b.pending.remaining<=0){const p=b.pending;b.pending=null;const t=b.mobs.find(m=>m.id===p.targetId);
   if(live(t)&&b.hp>0&&distance(hero,t)<=stats.range+1&&clear(hero,t)){
    hit(t,1,type,now);
   }
  }}
  if(b.skillJob&&b.hp>0){const job=b.skillJob;b.skillJob=null;const s=catalog.classes[classId].skills[job.index],t=b.mobs.find(m=>m.id===job.targetId);
   if(s.type==='guard'){b.guard=7;heal(Math.round(stats.maxHP*(classId==='cyborg'?.12:.18)+stats.healing*.25));}
   if(s.type==='heal')heal(stats.healing);
   if(s.type==='blessing'){b.guard=8;b.blessing=8;}
   if(s.type==='strike')hit(t,s.multiplier,s.damageType||type,now);
   if(s.type==='area'&&live(t))for(const other of b.mobs.filter(live))if(distance(t,other)<125)hit(other,s.multiplier||1.55,s.damageType||type,now,true,s.element==='lightning'?4.5:0);
   if(s.type==='taunt'){b.guard=Math.max(b.guard,4);for(const other of b.mobs.filter(live))hit(other,s.multiplier,type,now,true);}
  }
  for(const p of b.projectiles){const t=b.mobs.find(m=>m.id===p.targetId);vfx.step(p,dt,{target:t,origin:hero,clear,valid:()=>b.hp>0&&live(t),onHit:()=>land(t,p.damage,now,p.slow)});}
  b.projectiles=b.projectiles.filter(p=>p.phase!=='done').slice(-128);
  for(const enemy of b.mobs.filter(m=>m.alive)){
   enemy.slow=Math.max(0,enemy.slow-dt);enemy.emberElapsed+=dt;enemy.attackAnim=Math.max(0,enemy.attackAnim-dt);enemy.moving=0;
   const intent=behavior.intent(enemy,hero,b.hp>0),speed=enemy.speed*(enemy.slow>0?.55:1);
   if(intent==='idle'){const goal=behavior.patrol(enemy,dt,(a,z)=>{const n=Math.max(1,Math.ceil(distance(a,z)/4));for(let i=0;i<=n;i++)if(!nav.walkable(a.x+(z.x-a.x)*i/n,a.y+(z.y-a.y)*i/n))return false;return true;});if(goal)move(enemy,goal,speed*.45,dt,nav);continue;}
   if(intent==='return'){const home={x:enemy.anchorX,y:enemy.anchorY};if(distance(enemy,home)<=8){Object.assign(enemy,home);behavior.home(enemy);}else move(enemy,home,speed,dt,nav);continue;}
   if(enemy.telegraph){const result=hunt.stepWarning(enemy,dt,hero,{clear:clear(enemy,hero)});if(result?.hit)damage(enemy,result.multiplier);continue;}
   enemy.attackClock-=dt;
   if(enemy.attackClock<=0){if(distance(enemy,hero)<=enemy.reach+10&&clear(enemy,hero)){face(enemy,hero);enemy.attackAnim=enemy.type==='bananawani'?.9:.58;enemy.telegraph=hunt.beginWarning(enemy,hero);enemy.attackCount++;if(!enemy.telegraph)damage(enemy);enemy.attackClock=enemy.attackSec;}else enemy.attackClock=.3;}
   if(distance(enemy,hero)>enemy.reach*.75&&distance(enemy,hero)<enemy.aggro)move(enemy,hero,speed*.65,dt,nav);
  }
 }
 return {kills,hero,potionsUsed};
}
module.exports={create,step,skill,cancel,changeArea,rulesHash,catalog,hunt};
