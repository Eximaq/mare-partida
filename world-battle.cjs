'use strict';
// Server-only simulation. The original catalogues remain the source of balance.
const {randomUUID,createHash}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const hunt=require('./hunt-system.js'),behavior=require('./monster-behavior.js'),characters=require('./character-system.js');
const dungeons=require('./boss-dungeon-system.js'),dungeonCombat=require('./boss-dungeon-combat.js'),dungeonTiming=require('./dungeon-timing.cjs');
require('./quest-dungeons-data.js');const dungeonMap=globalThis.MareQuestDungeonData;
const prison=require('./prison-system.js'),prisonMap=require('./impel-down-world.js');
const prisonCatalog=require('./monster-game-catalog.js').create({monsters:require('./monster-catalog.js'),city:require('./alubarna-world.js'),dungeons:require('./boss-dungeon-system.js')});
const H=require('./haki-system.js'),fruits=require('./fruit-runtime.cjs'),zoan=require('./zoan-art.js');
const talents=require('./talent-runtime.cjs'),{T,U,TC}=talents;
const catalog=require('./character-catalog.js').create({characters});
require('./combat-vfx-data.js');const vfx=require('./combat-vfx.js');
const Policy=require('./combat-action-policy.js');
const sources=['combat-action-policy.js','zoan-art.js','akuma-system.js','akuma-passives.js','neko-system.js','ushi-system.js','ushi-rules.js','ushi-art-data.js','wolf-system.js','wolf-data.js','doru-system.js','doru-data.js','rank-c-system.js','rank-c-data.js','rank-c-expansion.js','rank-c-expansion-data.js','rank-b-system.js','rank-b-data.js','hoya-system.js','hoya-data.js','jiki-system.js','jiki-data.js','ryu-system.js','ryu-data.js','fruit-summon-runtime.cjs','fruit-lower-runtime.cjs','fruit-runtime.cjs','rank-a-system.js','rank-a-data.js','rank-a-expansion.js','rank-s-system.js','rank-s-data.js','haki-system.js','haki-progression.js','dungeon-timing.cjs','dungeon-boss-art-data.js','boss-dungeon-combat.js','prison-system.js','monster-game-catalog.js','boss-dungeon-system.js','hunt-system.js','archipelago.js','monster-behavior.js','monster-catalog.js','character-system.js','character-catalog.js','combat-vfx.js','combat-vfx-data.js','world-battle.cjs','party-battle.cjs','party-rules.cjs','talent-system.js','talent-combat.js','ultimate-system.js','talent-runtime.cjs'];
const rulesHash=createHash('sha256').update(sources.map(f=>f+fs.readFileSync(path.join(__dirname,f),'utf8').replaceAll('\r\n','\n')).join('\0')).digest('hex');
const balanceVersion=characters.monsterBalance.version;
const previousBalanceHash='6ec1642796a685e114cdc27e528bc2f9ff82cc18123f6dce68e639ee6bc890a8';
const priorBalanceHashes=new Set([previousBalanceHash,'c2892b86769d34771992370021a9a7edc76a89fb18e62d3f44d02900308b5f46','33f5c37bd55b0dc9a052d31c9e7d68f760bb31122337fb1da73058050083fa6a']);
function upgradeBalance(b){
 if(!b||!priorBalanceHashes.has(b.rulesHash))return;
 const prisonSpec=b.prison&&prison.resolveEncounter(b.prison.spec,prisonCatalog);
 if(prisonSpec)b.prison.spec=prisonSpec;
 for(const m of b.mobs){
  if(m.balanceVersion===balanceVersion)continue;
  const oldAttackSec=m.attackSec;
  if(m.source==='world'){
   const area=m.area||b.area,sector=hunt.get(area)?.sectors.find(s=>s.id===m.district);
   if(!sector)continue;
   if(['crab','bandit','spirit'].includes(m.type))m.type=sector.roles[0];
   const profile=hunt.profile(area,sector.id,m.type);
   m.hp=m.alive?Math.min(profile.maxHP,Math.ceil(profile.maxHP*m.hp/Math.max(1,m.maxHP))):0;
   Object.assign(m,profile);
  }else{
   const spec=m.source==='boss-dungeon'?prisonCatalog[m.type]:prisonSpec;
   if(!spec)continue;
   m.hp=m.alive?Math.min(spec.hp,Math.ceil(spec.hp*m.hp/Math.max(1,m.maxHP))):0;
   Object.assign(m,{type:spec.type??m.type,maxHP:spec.hp,attack:spec.atk,defense:spec.def,magicDefense:spec.magicDefense,speed:spec.speed,attackSec:spec.attackSec,accuracy:spec.accuracy,attributePoints:spec.attributePoints});
  }
  if(!m.telegraph&&oldAttackSec>0&&m.attackClock>0)m.attackClock*=m.attackSec/oldAttackSec;
  m.balanceVersion=balanceVersion;
 }
 b.rulesHash=rulesHash;
}
function hakiGame(b){
 b.haki??=H.migrate({}).haki;b.hakiRuntime??=H.start();
 return {has_haki_unlocked:b.haki.unlocked,haki:b.haki};
}
function resetHaki(b){hakiGame(b);b.hakiRuntime=H.start();fruits.reset(b);}
function combatStats(b,c,rt){return fruits.stats(b,c,H.stats(talents.stats(b,c,rt),hakiGame(b),b.hakiRuntime));}
function hakiCast(b,c){return H.cast(hakiGame(b),b.hakiRuntime,c.hero,b.mobs,{alive:b.hp>0,inHunt:!!b.area,now:c.now,clear:(a,z)=>c.nav.projectileClear(a,z)});}
function hakiToggle(b,id){return H.toggle(hakiGame(b),b.hakiRuntime,id,{alive:b.hp>0,inHunt:!!b.area});}
function populate(b,now,rng,hero){
 if(!b.area||b.prison||b.dungeon)return;
 const ledger=b.hunts.areas[b.area];
 b.mobs=b.mobs.filter(m=>m.alive||m.corpseUntil>now);
 const slots=behavior.ready(b.area,b.mobs,ledger.respawns,now);
 if(hero&&hunt.bossReady(b,b.area,hero,now))slots.push(...behavior.ready(b.area,b.mobs,ledger.respawns,now,true));
 for(const s of slots){const p=hunt.profile(b.area,s.sector,s.type,.5);b.mobs=b.mobs.filter(m=>m.spawnId!==s.id||!m.alive&&!m.fruitConsumed&&m.corpseUntil>now);
  b.mobs.push({...p,source:'world',balanceVersion,id:randomUUID(),spawnId:s.id,area:b.area,district:s.sector,type:s.type,x:s.x,y:s.y,anchorX:s.x,anchorY:s.y,hp:p.maxHP,alive:true,engaged:false,returning:false,attackClock:1,attackCount:0,bob:rng()*Math.PI*2,patrolClock:0,telegraph:null,moving:0,attackAnim:0,emberElapsed:0,emberFacing:'south',slow:0});}
}
function create(area,stats,now,rng=Math.random){
 const b={version:1,rulesHash,area,hp:stats.maxHP,energy:stats.maxEnergy,auto:false,autoSkills:true,targetId:null,pending:null,projectiles:[],attackClock:0,cooldowns:[0,0],guard:0,blessing:0,respawn:0,mobs:[],hunts:hunt.migrate({}).hunts,talents:null,talentCooldowns:{},events:[],seq:0};
 hakiGame(b);populate(b,now,rng);return b;
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const live=m=>m?.alive&&m.hp>0&&!m.returning;
function event(b,type,data={}){b.events.push({seq:++b.seq,type,...data});b.events=b.events.slice(-24);}
function face(a,p){const dx=p.x-a.x,dy=p.y-a.y;a.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';a.emberFacing={left:'west',right:'east',front:'south',back:'north'}[a.direction];}
function move(a,goal,speed,dt,nav){const old={x:a.x,y:a.y},route=nav.path(a,goal);nav.follow(a,route,speed,dt);a.moving=distance(old,a)>.01?1:0;if(a.moving)face(a,{x:a.x+(a.x-old.x),y:a.y+(a.y-old.y)});}
function target(b){return b.mobs.find(m=>m.id===b.targetId&&live(m));}
function cancel(b){b.actionLockUntil=0;fruits.reset(b);b.auto=false;b.targetId=null;b.unreachableUntil={};b.autoRoute=null;b.pending=null;b.skillJob=null;b.projectiles=[];}
function changeArea(b,area,now,rng){cancel(b);resetHaki(b);delete b.prison;delete b.dungeon;b.talents=null;b.area=area;b.mobs=[];populate(b,now,rng);}
function enterPrison(b,spec,stats,hero,{id=randomUUID(),stolen=0}={}){
 if(!prison.validFloor(spec.floor)||!Number.isFinite(spec.hp)||spec.hp<=0)throw Error('Invalid prison enemy');
 cancel(b);resetHaki(b);delete b.dungeon;b.talents=null;b.prison={floor:spec.floor,token:spec.token,spec:structuredClone(spec)};b.area='impel-down';b.auto=true;b.autoSkills=true;b.hp=stats.maxHP;b.respawn=0;b.attackClock=0;
 const p=prisonMap.enemySpawn;
 b.mobs=[{...spec,id,source:'impel-down',balanceVersion,prisonToken:spec.token,area:'impel-down',level:spec.floor,...p,anchorX:p.x,anchorY:p.y,maxHP:spec.hp,hp:spec.hp,attack:spec.atk,defense:spec.def,magicDefense:spec.magicDefense??spec.def,aggro:prisonMap.map.width,alive:true,engaged:false,returning:false,attackClock:1,attackCount:0,bob:0,slow:0,telegraph:null,emberElapsed:0,emberFacing:'west',attackAnim:0,moving:0,patrolClock:0,talentStolen:stolen}];
 Object.assign(hero,prisonMap.map.spawn);
}
function enterDungeon(b,id,record,stats,hero,{stolen=0}={}){
 const d=dungeons.byId[id];if(!d||!record?.spawnId)throw Error('Invalid dungeon encounter');
 cancel(b);resetHaki(b);delete b.prison;b.talents=null;b.dungeon={id,record:structuredClone(record)};b.area='quest-dungeons';b.auto=record.phase==='running';b.autoSkills=true;b.respawn=0;b.attackClock=0;b.mobs=[];
 Object.assign(hero,dungeonMap.spawn);
 if(record.phase!=='running')return;
 const spec=prisonCatalog[d.monster],p=dungeonMap.enemySpawn;
 b.mobs=[{...spec,id:record.spawnId,type:d.monster,source:'boss-dungeon',balanceVersion,dungeonId:id,dungeonRunId:record.runId,dungeonEncounterId:record.encounterId,area:'quest-dungeons',level:d.level,...p,anchorX:p.x,anchorY:p.y,maxHP:spec.hp,hp:spec.hp,attack:spec.atk,defense:spec.def,magicDefense:spec.magicDefense,aggro:dungeonMap.width,alive:true,engaged:false,returning:false,attackClock:1,attackCount:0,bob:0,slow:0,telegraph:null,emberElapsed:0,emberFacing:'south',attackAnim:0,moving:0,patrolClock:0,talentStolen:stolen}];
}
function skill(b,index,c){
 const g=talents.game(b,c),stats=combatStats(b,c,c.runtime),s=catalog.classes[c.classId]?.skills[index],cost=U.selected(g)==='archmage'?0:(s?.cost||0)*(1-(stats.energyEfficiency||0)),m=target(b),self=['guard','heal','blessing'].includes(s?.type);
 if(b.pending||(b.actionLockUntil||0)>(c.now??0)||b.fruit?.effects.genie||b.fruit?.effects.jikiCharge||b.fruit?.transformed||!s||!b.area||b.hp<=0||c.hero.talentControl?.remaining>0||b.skillJob||b.cooldowns[index]>0||b.energy<cost)return false;
 const ally=(c.allies||[]).filter(a=>a.b.hp>0&&a.b.hp<a.stats.maxHP&&distance(c.hero,a.hero)<=180&&c.nav.projectileClear(c.hero,a.hero)).sort((a,z)=>a.b.hp/a.stats.maxHP-z.b.hp/z.stats.maxHP)[0];
 if(s.type==='heal'&&!ally&&b.hp>=stats.maxHP&&!(U.selected(g)==='eternalBlessing'&&(b.talents?.combatRemaining>0||m))||s.type==='blessing'&&b.blessing>0)return false;
 if(!self&&(!m||distance(c.hero,m)>stats.range||!c.nav.projectileClear(c.hero,m)))return false;
 b.energy-=cost;b.cooldowns[index]=s.cd*(c.factionId==='government'?.92:1);
 const duration=Math.max(.2,1/stats.speed);if(m&&!self)face(c.hero,m);c.hero.moving=0;
 b.actionLockUntil=(c.now??0)+duration*1000;b.skillJob={index,targetId:m?.id??null,remaining:duration*.5};event(b,'skill',{index,duration,id:m?.id});return true;
}
function autoSkill(b,c,g,m){
 const f=fruits.state(b,c),e=f.effects,rt=fruits.decode(f.advanced),time=c.now/1000,jobs=[...(rt?.jobs||[]),...(rt?.expansion?.jobs||[]),...(rt?.rankS?.jobs||[])],active={};
 for(const name of ['supa','horu','horuSpeed','ushi','wolf','bison'])active[name]=e[name+'Until']>time;
 active.genie=globalThis.MareHoya.active(e.genie,time);active.genieBuff=e.genie?.buffUntil>time;active.jikiCharge=!!e.jikiCharge;
 active.room=fruits.R.roomActive(rt,time);active.dome=fruits.R.domeActive(rt,time);
 for(const kind of ['redPoison','blackHole','pillar','guraBuff','phoenixTotem'])active[kind]=jobs.some(j=>j.kind===kind);
 for(const [key,name]of [['1','revolution'],['2','deposition']])active[name]=e.flags?.some(v=>v.key===key&&v.until>c.now);
 const allies=(c.allies||[]).filter(a=>a.b.hp>0).map(a=>({x:a.hero.x,y:a.hero.y,hp:a.b.hp,maxHP:a.stats.maxHP,alive:true}));
 active.holyShield=(b.talents?.ultimate?.holyHP||0)>0;
 const state={hp:b.hp,maxHP:c.stats.maxHP,hero:c.hero,target:m,enemies:b.mobs,allies,active,controlled:c.hero.talentControl?.remaining>0,healThreshold:c.preferences?.healThreshold,foodAvailable:b.mobs.some(v=>!v.alive&&!v.fruitConsumed&&v.corpseUntil>c.now),clear:(a,z)=>c.nav.projectileClear(a,z)};
 const candidates=catalog.classes[c.classId].skills.map((s,index)=>({source:'class',index,meta:{shape:s.type==='area'?'circle':null,radius:125,minTargets:s.type==='area'?2:1,hybrid:s.type==='heal'&&U.selected(g)==='eternalBlessing',kind:s.type==='heal'?'heal':s.type==='guard'?'protection':s.type==='blessing'?'buff':'damage',range:c.stats.range,active:['guard','blessing'].includes(s.type)?'classProtection':null},ready:b.cooldowns[index]<=0&&b.energy>=(U.selected(g)==='archmage'?0:(s.cost||0)*(1-(c.stats.energyEfficiency||0)))}));
 state.active.classProtection=b.guard>0||b.blessing>0;
 for(const s of fruits.A.activeSkills(f.id)){const cd=fruits.R.has(f.id)?fruits.R.cooldownKey(f.id,s.key,rt,time):fruits.A.cooldownKey(f.id,s.key),meta=Policy.fruitMeta(f.id,s.key);if(f.id==='akuma_ope_ope'&&s.key==='1'&&active.room)Object.assign(meta,{kind:'damage',active:null});const current=fruits.R.has(f.id)?fruits.R.skill(f.id,s.key,rt,time):s,free=f.id===globalThis.MareRankC.rules.mato.id&&s.key==='1'&&globalThis.MareRankC.marked(m,c.now)&&m?.matoCharges>0;candidates.push({source:'fruit',key:s.key,meta,ready:(free||(f.cooldowns[cd]||0)<=c.now)&&b.energy>=(free?0:current?.cost||0)});}
 for(const item of Policy.choose(candidates,state)){
  if(item.source==='class'){if(skill(b,item.index,{...c,automatic:true}))return true;}
  else if(fruits.cast(b,item.key,{...c,automatic:true}))return true;
 }
 return false;
}
function step(b,c){
 if(!Number.isFinite(c.dt)||c.dt<0||c.dt>1)throw new RangeError('Invalid battle step');
 if(b.rulesHash!==rulesHash)throw new Error('battle_rules_changed');
 const {hero,nav,classId}=c,kills=[],talentSteals=[];let potionsUsed=0,rt=talents.load(b),stats=combatStats(b,c,rt),g=talents.game(b,c);
 b.metrics??={seconds:0,damage:0};b.metrics.seconds=Math.min(Number.MAX_SAFE_INTEGER,b.metrics.seconds+c.dt);
 const enemies=()=>b.mobs.filter(live);
 function heal(amount,ignoreEfficiency=false){if(b.hp<=0)return;const before=b.hp;b.hp=Math.min(stats.maxHP,b.hp+amount*(ignoreEfficiency?1:1+(stats.healingReceivedPercent||0)));if(b.area&&(rt.combatRemaining>0||target(b)))actions(U.heal(g,rt.ultimate,{amount,effective:b.hp-before,stats,hero,enemies:enemies(),clear}));}
 const rng=()=>{const n=c.rng();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError('Invalid RNG');return n;};
 const clear=(a,z)=>nav.projectileClear(a,z);
 const kill=(m,now)=>{
  if(!m.alive)return;m.alive=false;m.hp=0;m.telegraph=null;
  if(b.dungeon){kills.push({id:m.id,area:b.area,monster:structuredClone(m),reward:null,dungeonId:b.dungeon.id,runId:m.dungeonRunId,encounterId:m.dungeonEncounterId});cancel(b);event(b,'kill',{id:m.id});return;}
  if(b.prison){kills.push({id:m.id,area:b.area,monster:structuredClone(m),reward:null,prisonFloor:b.prison.floor,prisonToken:b.prison.token});event(b,'kill',{id:m.id});return;}
  m.corpseUntil=now+12000;
  b.hunts=hunt.recordKill(b,b.area,m.type,now).state.hunts;
  b.hunts.areas[b.area].respawns[m.spawnId]=now+behavior.RESPAWN_MS;
  b.energy=Math.min(stats.maxEnergy,b.energy+TC.onKill(g,rt,stats));
  kills.push({id:m.id,area:b.area,monster:structuredClone(m),reward:hunt.rewards(b.area,m,c.level||1,rng())});event(b,'kill',{id:m.id});
 };
 function land(m,raw,now,slow=0){
  if(!live(m)||b.hp<=0||raw<=0)return 0;H.touch(hakiGame(b),b.hakiRuntime);
  if(m.rankSFreezeUntil>now/1000){raw+=m.rankSFreezePower||0;m.rankSFreezeUntil=0;m.rankAStunUntil=0;m.rankSIceSlowUntil=now/1000+3;m.rankSIceHeavyAttackUntil=now/1000+3;}
  const amount=Math.min(m.hp,characters.monsterDamage(raw));behavior.hurt(m);if(c.shared&&!m.partyTargetId)m.partyTargetId=c.shared.actorId;m.hp-=amount;if(slow)m.slow=slow;
  if(stats.fruitLifesteal||b.fruit?.effects.wolfUntil>now/1000)b.hp=Math.min(stats.maxHP,b.hp+amount*((stats.fruitLifesteal||0)+(b.fruit.effects.wolfUntil>now/1000?globalThis.MareWolf.rules.lifesteal:0)));
  b.metrics.damage=Math.min(Number.MAX_SAFE_INTEGER,b.metrics.damage+amount);event(b,'damage',{id:m.id,amount});if(m.hp<=0)kill(m,now);return amount;
 }
 function contact(passive,m){if(passive.heal>0)heal(passive.heal);if(passive.gold>0)talentSteals.push({spawnId:m.id,amount:passive.gold});}
 function actions(list){
  for(const action of list){
   if(action.delay>0){rt.ultimate.delayed.push(action);continue;}
   if(action.selfBurn){b.hp=Math.max(0,b.hp-action.selfBurn);if(!b.hp)die();continue;}
   if(action.visualOnly){event(b,'talent',{id:action.target.id,kind:action.kind});continue;}
   if(!live(action.target)||b.hp<=0)continue;
   if(!clear(action.from||hero,action.target))continue;
   const amount=['artillery','empathy'].includes(action.kind)?characters.damage({...stats,elemental:action.amount},action.target.empRemaining>0?0:(action.target.magicDefense??action.target.defense),{type:'elemental'}):action.amount;
   if(action.from){b.projectiles.push(vfx.projectile('gunner',action.from,action.target.id,{damage:amount,secondary:true,origin:action.from}));continue;}
   const actual=land(action.target,amount,now);
   if(action.kind==='clone')contact(TC.afterHit(g,rt,{target:action.target,...action.contact,damage:actual,contactScale:.5,fromClone:true,random:rng}),action.target);
  }
 }
 function landed(m,amount,slow,meta){
  const offensiveDamage=m?Math.min(amount,m.hp/characters.monsterBalance.playerDamage):0;
  const actual=land(m,amount,now,slow);if(!actual||!meta)return;
  const hitStats=meta.stats,passive=TC.afterHit(g,rt,{target:m,...meta,damage:actual,offensiveDamage,random:rng});contact(passive,m);
  actions(U.after(g,rt.ultimate,{target:m,hero,...meta,damage:offensiveDamage,enemies:enemies(),clear,random:rng}));
  if(passive.pierce)for(const other of TC.piercingTargets(hero,m,enemies(),hitStats.range+125))if(clear(m,other))b.projectiles.push(vfx.projectile('gunner',m,other.id,{damage:offensiveDamage*.5,secondary:true,origin:{x:m.x,y:m.y}}));
 }
 function hit(m,multiplier,damageType,at,area=false,slow=0,basic=false){
  if(!live(m)||b.hp<=0||distance(hero,m)>stats.range+(area?125:1)||!clear(hero,m))return;
  H.touch(hakiGame(b),b.hakiRuntime);stats=combatStats(b,c,rt);if(b.hakiRuntime.active==='observation')b.hakiRuntime.eyeFX=.25;
  if(damageType==='physical'&&!globalThis.MareRankC.marked(m,now)&&rng()>stats.accuracy){event(b,'miss',{id:m.id});return;}
  const magic=damageType==='elemental',prepared=TC.beforeHit(g,rt,{target:m,hero,stats,basic,magic,area:area||(basic&&U.selected(g)==='titan'),critical:rng()<stats.crit});
  const normalArmor=(magic?(m.magicDefense??m.defense):m.defense)*(m.hakiDebuff>0?.85:1);if(normalArmor>0)prepared.armor*=fruits.armor(m,magic,now/1000)/normalArmor;if(basic&&b.fruit?.effects.ushiUntil>now/1000)multiplier*=globalThis.MareUshi.basicMultiplier(true);
  const amount=prepared.trueAmount??characters.damage(prepared.critMultiplier?{...stats,critMultiplier:prepared.critMultiplier}:stats,prepared.armor,{type:damageType,multiplier:multiplier*prepared.multiplier,variance:.9+rng()*.22,critical:prepared.critical});
  const projectile=!b.fruit?.transformed&&['gunner','cyborg','strategist','healer'].includes(classId),meta={stats,basic,magic,critical:prepared.critical,projectile:projectile||U.selected(g)==='spatial'};
  if(projectile){const kind=classId==='strategist'?'mage':classId;b.projectiles.push(vfx.projectile(kind,hero,m.id,{damage:amount,slow,contact:meta}));event(b,'projectile',{id:m.id,kind,x:hero.x,y:hero.y});}
  else landed(m,amount,slow,meta);
 }
 function die(){b.autoRoute=null;resetHaki(b);b.hp=0;b.respawn=4.1;b.actionLockUntil=0;fruits.reset(b);b.pending=null;b.projectiles=[];b.skillJob=null;rt=TC.create();if(c.manualPath)c.manualPath.length=0;if(!c.shared)for(const other of enemies())behavior.disengage(other);event(b,'death');}
 function damage(m,multiplier=1,warning){
  if(warning?.groundTrap&&b.fruit?.id==='akuma_tori_albatroz'&&b.fruit.transformed&&b.fruit.effects.altitudeUntil>now/1000||b.fruit?.id==='akuma_bomu_bomu'&&warning?.damageType==='explosion')return;const physical=m.type!=='spirit';
  if(b.hp<=0)return;const genie=b.fruit?.effects.genie;if(genie){fruits.genieDamage(genie,now/1000,m.attack*multiplier,physical);if(genie.hp<=0)delete b.fruit.effects.genie;return;}H.touch(hakiGame(b),b.hakiRuntime);stats=combatStats(b,c,rt);
  const raw=characters.incoming(physical?stats:{...stats,defense:stats.magicDefense??stats.defense},m.attack*multiplier*(m.kobuDebuffUntil>now?.8:1)*(m.hakiDebuff>0?.85:1)*(physical?1-(stats.impactResistancePercent||0):1),b.guard>0,.85+rng()*.25,{monster:true});
  const fruitReaction=fruits.incoming(b,{...c,stats,now},m,raw,m.attack*multiplier,physical);if(!fruitReaction.damage)return;
  const r=TC.receive(g,rt,{stats,amount:fruitReaction.damage,physical,melee:m.reach<=60,source:m,random:rng,now});
  if(r.untargetable||r.invulnerable)return;
  b.energy=Math.max(0,b.energy-(r.energyUsed||0));
  if(r.parry){if(live(m)&&distance(hero,m)<=stats.range&&clear(hero,m))land(m,characters.damage(stats,m.defense*(1-stats.penetration)),now);return;}
  const before=b.hp;b.hp=r.shieldTriggered||r.trigger==='immortal'?1:Math.max(0,b.hp-globalThis.MareUshi.receive(r.damage,fruitReaction.ushi));event(b,'hurt',{amount:before-b.hp});
  if(r.shieldTriggered)b.talentCooldowns.energyShieldUntil=now+U.internalCooldown(g,90000);
  const reflectedFruit=before>b.hp?fruitReaction.reflected+fruits.P.reflection(before-b.hp,b.fruit?.id,{physical})+(fruitReaction.bariMelee?(before-b.hp)*.2:0):0;
  if((r.reflect||reflectedFruit)&&live(m)&&clear(hero,m))land(m,(r.reflect||0)+reflectedFruit,now);
  if(r.trigger==='immortal')b.talentCooldowns.immortalUntil=now+600000;
  if(r.trigger==='guardianAngel'){b.talentCooldowns.guardianUntil=now+600000;b.hp=stats.maxHP;b.energy=stats.maxEnergy;for(const m of enemies().filter(m=>talents.visible(hero,nav.map,m)))m.talentControl={type:'stun',remaining:2};}
  if(r.trigger==='emp'){b.talentCooldowns.empUntil=now+45000;for(const m of enemies().filter(m=>talents.visible(hero,nav.map,m)))m.empRemaining=10;}
  if(r.trigger||r.shieldTriggered)event(b,'talent',{kind:r.trigger||'energyShield'});
  if(r.explode&&b.hp>0)for(const other of enemies())if(distance(hero,other)<=120&&clear(hero,other))land(other,characters.damage({...stats,elemental:stats.attack},(other.empRemaining>0?0:(other.magicDefense??other.defense))*(1-stats.magicPen),{type:'elemental',multiplier:.6}),now);
  if(b.hp<=0)die();
 }
 const type=characters.roles[classId].magic?'elemental':'physical';
 let left=c.dt,now=c.now-c.dt*1000;
 while(left>1e-9){const dt=Math.min(.05,left);left-=dt;now+=dt*1000;H.tick(hakiGame(b),b.hakiRuntime,dt,{alive:b.hp>0,inHunt:!!b.area});stats=combatStats(b,{...c,now},rt);b.hp=Math.min(b.hp,stats.maxHP);b.energy=Math.min(b.energy,stats.maxEnergy);
  fruits.tick(b,{...c,stats,now},dt,{hit:(m,amount)=>land(m,amount,now),heal:(amount)=>heal(amount,true),effect:data=>event(b,'fruit',data)});
  actions(TC.tick(rt,dt,c.shared?enemies().filter(c.shared.owns):enemies()));
  if(b.hp>0)actions(U.tick(g,rt.ultimate,dt,{hero,stats,inCombat:!!b.area&&(rt.combatRemaining>0||!!target(b)),inHunt:!!b.area,enemies:enemies(),clear,move:(m,dx,dy)=>{const p={x:m.x+dx,y:m.y+dy},n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));for(let i=1;i<=n;i++)if(!nav.walkable(m.x+dx*i/n,m.y+dy*i/n))return;if(clear(m,p))Object.assign(m,p);}}));
  b.cooldowns=b.cooldowns.map(n=>Math.max(0,n-dt));b.guard=Math.max(0,b.guard-dt);b.blessing=Math.max(0,b.blessing-dt);b.attackClock=Math.max(0,b.attackClock-dt);
  if(b.hp<=0){b.respawn=Math.max(0,b.respawn-dt);if(b.respawn<=1e-8){b.hp=stats.maxHP;b.energy=stats.maxEnergy;if(c.shared){Object.assign(hero,nav.map.spawn);}else if(b.prison){const m=b.mobs[0],auto=b.auto;enterPrison(b,b.prison.spec,stats,hero,{id:m.id,stolen:m.talentStolen||0});b.auto=auto;rt=talents.load(b);}else if(b.dungeon){const m=b.mobs[0],auto=b.auto;enterDungeon(b,b.dungeon.id,b.dungeon.record,stats,hero,{stolen:m?.talentStolen||0});b.auto=auto;rt=talents.load(b);}else Object.assign(hero,nav.map.spawn);b.targetId=null;event(b,'respawn');}}
  else{heal(dt*((stats.healthRegen||0)+(b.area?0:1.9)+(b.blessing>0?stats.regenBuff:0)));b.energy=Math.min(stats.maxEnergy,b.energy+dt*stats.energyRegen);}
  if(!c.shared)populate(b,now,rng,hero);
  if(!b.pending&&!b.skillJob&&(b.actionLockUntil||0)<=now&&!b.fruit?.job&&!b.fruit?.effects.genie&&!b.fruit?.effects.action&&!b.fruit?.effects.dash&&c.manualPath?.length&&b.hp>0&&now>=(c.manualStart||0))nav.follow(hero,c.manualPath,stats.moveSpeed,Math.min(dt,(now-(c.manualStart||0))/1000));
  const fruitBusy=!!(b.fruit?.job||b.fruit?.effects.action||b.fruit?.effects.dash||b.fruit?.effects.jikiCharge||b.fruit?.effects.genie);if(fruitBusy){b.pending=null;b.skillJob=null;}
  let m=target(b);
  if(b.auto&&b.hp>0&&b.area&&!b.fruit?.effects.action&&!b.fruit?.effects.dash&&!b.fruit?.effects.jikiCharge&&b.autoSkills&&!b.pending&&!b.skillJob&&(b.actionLockUntil||0)<=now&&now>=(b.nextSkillDecision||0)){
    b.nextSkillDecision=now+250;autoSkill(b,{...c,now,hero,nav,stats,runtime:rt},g,m);
   }
  if(b.auto&&b.hp>0&&b.area&&!fruitBusy){
   if(b.hp<stats.maxHP*.4&&potionsUsed<(c.potions||0)){heal(Math.round(stats.maxHP*.44));potionsUsed++;event(b,'potion');}
   if(!m){m=b.mobs.filter(m=>live(m)&&!(b.unreachableUntil?.[m.id]>now)).sort((a,z)=>distance(hero,a)-distance(hero,z))[0];b.targetId=m?.id??null;}
   const actionLocked=!!(b.pending||b.skillJob||b.fruit?.job||(b.actionLockUntil||0)>now);
   const warnings=b.mobs.filter(live).map(m=>m.telegraph).filter(Boolean),danger=warnings.some(w=>hunt.danger(w,hero));
   if(!actionLocked&&danger){let goal;for(const r of [90,170,240]){for(let i=0;i<16;i++){const a=i*Math.PI/8,p={x:hero.x+Math.cos(a)*r,y:hero.y+Math.sin(a)*r};if(nav.walkable(p.x,p.y)&&!warnings.some(w=>hunt.danger(w,p))){goal=p;break;}}if(goal)break;}if(goal)move(hero,goal,stats.huntSpeed,dt,nav);}
   else if(m&&!actionLocked&&(distance(hero,m)>stats.range-8||!clear(hero,m))){
    if(b.autoRoute?.target!==m.id||distance(b.autoRoute.goal,m)>20||!b.autoRoute.path.length)b.autoRoute={target:m.id,goal:{x:m.x,y:m.y},path:nav.path(hero,m)};
    const {path}=b.autoRoute,previous={x:hero.x,y:hero.y};
    if(path.length)nav.follow(hero,path,stats.huntSpeed,dt);
    hero.moving=distance(previous,hero)>.01?1:0;
    if(hero.moving)face(hero,{x:hero.x*2-previous.x,y:hero.y*2-previous.y});
    else{b.autoRoute=null;b.unreachableUntil??={};for(const id of Object.keys(b.unreachableUntil))if(b.unreachableUntil[id]<=now)delete b.unreachableUntil[id];b.unreachableUntil[m.id]=now+5000;b.targetId=null;m=null;}
   }
   else if(m&&!actionLocked&&!b.fruit?.transformed&&['gunner','strategist','healer'].includes(classId)&&distance(hero,m)>0&&distance(hero,m)<stats.range*.45){const d=distance(hero,m),goal={x:hero.x+(hero.x-m.x)/d*stats.huntSpeed*dt,y:hero.y+(hero.y-m.y)/d*stats.huntSpeed*dt};if(nav.walkable(goal.x,goal.y)&&clear(goal,m))move(hero,goal,stats.huntSpeed,dt,nav);}
   if(m&&!actionLocked&&b.attackClock<=0&&distance(hero,m)<=stats.range&&clear(hero,m)){
    const duration=Math.max(.15,1/stats.speed);face(hero,m);const clip=b.fruit?.transformed?zoan.attackTiming(b.fruit.id,hero.direction):null,ratio=clip?(clip.hitFrameRatio??(clip.impact_frame??Math.floor(clip.frames*.45))/clip.frames):.5;b.pending={targetId:m.id,remaining:duration*ratio};b.actionLockUntil=now+duration*1000;hero.moving=0;b.attackClock=duration;event(b,'attack',{id:m.id,duration});
   }
  }
  if(b.pending){b.pending.remaining-=dt;if(b.pending.remaining<=0){const p=b.pending;b.pending=null;const t=b.mobs.find(m=>m.id===p.targetId);
   if(live(t)&&b.hp>0&&distance(hero,t)<=stats.range+1&&clear(hero,t)){
    hit(t,1,b.fruit?.transformed?'physical':type,now,false,0,true);
   }
  }}
  if(b.skillJob)b.skillJob.remaining=(b.skillJob.remaining||0)-dt;
  if(b.skillJob&&b.skillJob.remaining<=0&&b.hp>0){const job=b.skillJob;b.skillJob=null;const s=catalog.classes[classId].skills[job.index],t=b.mobs.find(m=>m.id===job.targetId);
   if(s.type==='guard'){b.guard=7;heal(Math.round(stats.maxHP*(classId==='cyborg'?.12:.18)+stats.healing*.25));}
   if(s.type==='heal'){
    const ally=(c.allies||[]).filter(a=>a.b.hp>0&&a.b.hp<a.stats.maxHP&&distance(hero,a.hero)<=180&&clear(hero,a.hero)).sort((a,z)=>a.b.hp/a.stats.maxHP-z.b.hp/z.stats.maxHP)[0];
    if(ally&&ally.b.hp/ally.stats.maxHP<b.hp/stats.maxHP)ally.b.hp=Math.min(ally.stats.maxHP,ally.b.hp+stats.healing);else heal(stats.healing);
   }
   if(s.type==='blessing'){b.guard=8;b.blessing=8;}
   if(s.type==='strike')hit(t,s.multiplier,s.damageType||type,now);
   if(s.type==='area'&&live(t))for(const other of b.mobs.filter(live))if(distance(t,other)<125)hit(other,s.multiplier||1.55,s.damageType||type,now,true,s.element==='lightning'?4.5:0);
   if(s.type==='taunt'){b.guard=Math.max(b.guard,4);for(const other of b.mobs.filter(live))if(distance(hero,other)<=stats.range+125&&clear(hero,other)){
    if(c.shared){
     other.partyTaunt={targetId:c.shared.actorId,priorId:other.partyTaunt?.priorId??other.partyTargetId,until:now+5000};
     if(other.partyTargetId!==c.shared.actorId){other.telegraph=null;if(other.dungeonAttack)dungeonCombat.cancel(other);}
    }
    hit(other,s.multiplier,type,now,true);
   }}
  }
  for(const p of b.projectiles){const t=b.mobs.find(m=>m.id===p.targetId);vfx.step(p,dt,{target:t,origin:p.origin||hero,clear,valid:()=>b.hp>0&&live(t),onHit:()=>p.secondary?land(t,p.damage,now,p.slow):landed(t,p.damage,p.slow,p.contact)});}
  b.projectiles=b.projectiles.filter(p=>p.phase!=='done');if(b.projectiles.length>1024)throw Error('battle_projectile_limit');
  for(const enemy of b.mobs.filter(m=>m.alive)){
    if(c.shared&&!c.shared.owns(enemy))continue;
   const focus=b.fruit?.effects.genie||hero;
   enemy.hakiDebuff=Math.max(0,(enemy.hakiDebuff||0)-dt);enemy.slow=Math.max(0,enemy.slow-dt);enemy.emberElapsed+=dt;enemy.attackAnim=Math.max(0,enemy.attackAnim-dt);enemy.moving=0;
   const rooted=enemy.doruRootUntil>now/1000||enemy.betaRootUntil>now/1000;
   const intent=behavior.intent(enemy,focus,b.hp>0,!!(b.prison||b.dungeon)),speed=(rooted?0:enemy.speed)*fruits.R.slowFactor(enemy,now/1000)*(enemy.zoanSlowUntil>now/1000?.7:1)*(enemy.slow>0?.55:1)*(enemy.talentSlow?.remaining>0?1-enemy.talentSlow.percent:1);
   if(enemy.bisonStunUntil>now/1000||enemy.ryuStunUntil>now/1000||globalThis.MareRankB.stunned(enemy,now/1000)||fruits.R.stunned(enemy,now/1000)||fruits.R.attackBlocked(enemy,now/1000)||fruits.R.dragged(enemy,now/1000)||enemy.empRemaining>0||enemy.talentControl?.remaining>0||(enemy.source==='boss-dungeon'&&(b.hp<=0||rt.ultimate.hidden))){enemy.telegraph=null;if(enemy.dungeonAttack)dungeonCombat.cancel(enemy);continue;}
   if(intent==='idle'||rt.ultimate.hidden){enemy.telegraph=null;continue;}
   if(enemy.source==='boss-dungeon'){
    enemy.attackClock-=dt*(enemy.rankSIceHeavyAttackUntil>now/1000?.5:enemy.rankSIceAttackUntil>now/1000?.6:1);
    if(enemy.dungeonAttack){dungeonCombat.step(enemy,dt,{valid:t=>t==='hero'&&b.hp>0&&distance(enemy,focus)<=enemy.reach+10&&clear(enemy,focus),hit:()=>damage(enemy)});continue;}
    if(enemy.attackClock<=0&&distance(enemy,focus)<=enemy.reach+10&&clear(enemy,focus)){face(enemy,focus);const clip=dungeonTiming[enemy.type]?.[enemy.emberFacing];if(dungeonCombat.begin(enemy,'hero',clip)){enemy.attackCount++;enemy.attackClock=enemy.attackSec;continue;}}
    if(distance(enemy,focus)>enemy.reach*.75)move(enemy,focus,speed*.65,dt,nav);
    continue;
   }
   if(enemy.telegraph){const result=hunt.stepWarning(enemy,dt,focus,{clear:clear(enemy,focus)});if(result?.hit)damage(enemy,result.multiplier,result.warning);continue;}
   enemy.attackClock-=dt*(enemy.rankSIceHeavyAttackUntil>now/1000?.5:enemy.rankSIceAttackUntil>now/1000?.6:1);
   if(enemy.attackClock<=0){if(distance(enemy,focus)<=enemy.reach+10&&clear(enemy,focus)){face(enemy,focus);enemy.attackAnim=characters.monsterAttackVisualDuration(enemy.type);enemy.telegraph=hunt.beginWarning(enemy,focus);enemy.attackCount++;if(!enemy.telegraph)damage(enemy);enemy.attackClock=enemy.attackSec;}else enemy.attackClock=.3;}
   if(distance(enemy,focus)>enemy.reach*.75||!clear(enemy,focus))move(enemy,focus,speed*.65,dt,nav);
  }
 }
 stats=combatStats(b,{...c,now},rt);b.hp=Math.min(b.hp,stats.maxHP);b.energy=Math.min(b.energy,stats.maxEnergy);
 talents.save(b,rt);return {kills,hero,potionsUsed,talentSteals};
}
module.exports={balanceVersion,previousBalanceHash,populate,fruitCast:(b,key,c)=>fruits.cast(b,key,{...c,stats:combatStats(b,c)}),fruitTransform:fruits.transform,resetFruit:fruits.reset,hakiGame,resetHaki,hakiCast,hakiToggle,combatStats,enterDungeon,enterPrison,prisonCatalog,create,step,skill,cancel,changeArea,upgradeBalance,disengage:behavior.disengage,rulesHash,catalog,hunt,talentStats:talents.stats};
