'use strict';
// Server adapter. Only equipped server inventory selects rules; clients send a key.
const A=require('./akuma-system.js'),P=require('./akuma-passives.js'),C=require('./character-system.js');
const Policy=require('./combat-action-policy.js');
const R=globalThis.MareRankA,S=globalThis.MareRankS,L=require('./fruit-lower-runtime.cjs'),G=require('./fruit-summon-runtime.cjs');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),live=m=>m?.alive&&m.hp>0&&!m.returning;
const encode=v=>v instanceof Set?{serverSet:[...v].map(encode)}:v instanceof Map?{serverMap:[...v].map(encode)}:Array.isArray(v)?v.map(encode):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)])):v;
const decode=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(decode):v.serverSet?new Set(v.serverSet.map(decode)):v.serverMap?new Map(v.serverMap.map(decode)):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)]))):v;
function reset(b){const f=b.fruit;if(!f)return;R.clear(decode(f.advanced||R.create()),b.mobs);if(f.hpScale){b.hp/=f.hpScale;delete f.hpScale;}for(const m of b.mobs)for(const k of ['wolfBleed','hasMatoMark','matoMarkUntil','matoCharges','doruRootUntil','betaRootUntil','hanaStunFrom','hanaStunUntil','ryuStunUntil','bisonStunUntil','kobuDebuffUntil','zoanSlowUntil','zoanDefenseUntil'])delete m[k];f.job=null;f.castVisual=null;b.actionLockUntil=0;f.advanced=null;f.effects={};f.time=null;}
function state(b,c){
 const id=A.byId(c.fruitId)?.id||null;b.fruit??={id:null,transformed:false,cooldowns:{},effects:{},advanced:null,job:null,time:null};
 const f=b.fruit;if(f.id!==id){reset(b);f.id=id;f.transformed=!!id&&['akuma_neko_leopard','akuma_ushi_giraffe','akuma_inu_wolf','akuma_ushi_bison','akuma_ryu_ryu'].includes(id);}
 return f;
}
function stats(b,c,base){
 const f=state(b,c),t=(c.now??f.time??0)/1000,d=P.apply(base,f.id,{magic:!!C.roles[c.classId].magic,healer:c.classId==='healer'}),out={...d};
 if(f.transformed){out.range=['akuma_ushi_giraffe','akuma_inu_wolf','akuma_ryu_ryu'].includes(f.id)?96:65;out.attack=out.physical;}
 if(f.effects.bisonUntil>t){out.maxHP*=1.2;out.defense*=1.35;}
 if(f.effects.kobuUntil>t){out.physical*=1.2;out.elemental*=1.2;out.defense*=1.2;out.crit=Math.min(.65,out.crit+.1);out.attack=f.transformed||!C.roles[c.classId].magic?out.physical:out.elemental;}
 if(f.effects.horuUntil>t){out.physical*=1.3;out.elemental*=1.3;out.defense*=1.3;out.attack=C.roles[c.classId].magic?out.elemental:out.physical;}
 if(f.effects.horuSpeedUntil>t){out.moveSpeed*=1.25;out.huntSpeed*=1.25;}
 if(f.effects.wolfUntil>t)out.speed*=1+globalThis.MareWolf.rules.attackSpeed;
 if(f.effects.altitudeUntil>t){out.moveSpeed*=1.3;out.huntSpeed*=1.3;}
 const advanced=decode(f.advanced);
 if(advanced?.rankS?.jobs?.some(j=>j.kind==='guraBuff'&&t<j.until)){out.physical*=1.6;out.elemental*=1.6;out.defense*=1.6;out.attack*=1.6;}
 if(R.roomActive(advanced,t)){out.physical*=1.3;out.elemental*=1.3;out.defense*=1.3;out.speed*=1.3;out.attack=C.roles[c.classId].magic?out.elemental:out.physical;}
 return out;
}
function basicMultiplier(b){return A.zoanBasicMultiplier(A.byId(b.fruit?.id),b.fruit?.transformed);}
function transform(b,enabled,c){const f=state(b,c);if(b.hp<=0||!A.isZoan(A.byId(f.id))||f.job)return false;if(f.transformed!==enabled)reset(b);f.transformed=enabled;return true;}
function move(nav,m,dx,dy){const from={x:m.x,y:m.y},n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));for(let i=1;i<=n;i++){const p={x:from.x+dx*i/n,y:from.y+dy*i/n};if(!nav.walkable(p.x,p.y)||!nav.projectileClear(m,p))break;Object.assign(m,p);}return distance(from,m);}
function armor(m,magic,now){return (magic?1:R.defenseFactor(m,now))*(m.rankSDefenseUntil>now?.2:1)*(m.rankSPhoenixDefenseUntil>now?.5:1)*(m.kobuDebuffUntil>now*1000?.8:1)*(m.empRemaining>0?0:(magic?(m.magicDefense??m.defense):m.defense)*(m.hakiDebuff>0?.85:1)*(m.zoanDefenseUntil>now?.95:1));}
function context(b,c,key,hooks={}){
 const f=state(b,c),now=c.now/1000,hero=c.hero,nav=c.nav;
 return {fruit:f.id,key:String(key),now,epoch:c.now,hero,target:b.mobs.find(m=>m.id===b.targetId&&live(m)),enemies:b.mobs,stats:A.offensiveStats(c.stats,A.castCoefficient(f.id)),
  manualPath:c.manualPath,point:c.point,classId:c.classId,map:nav.map,haki:b.hakiRuntime?.active,armor:(m,magic)=>armor(m,magic,now),scaleHp:n=>{b.hp*=n;},view:{x:Math.max(0,Math.min(hero.x-480,nav.map.width-960)),y:Math.max(0,Math.min(hero.y-285,nav.map.height-570)),width:960,height:570},
  clear:(a,z)=>nav.projectileClear(a,z),walkable:p=>nav.walkable(p.x,p.y),path:(a,z)=>nav.path(a,z),move:(m,dx,dy)=>move(nav,m,dx,dy),
  damage:(m,power,mult,magic,pen,absolute)=>R.damage({...m,defense:armor(m,false,now),magicDefense:armor(m,true,now)},power,mult,magic,pen,absolute),
  ...hooks,healArea:(point,radius,ratio)=>{if(distance(hero,point)<=radius&&nav.projectileClear(point,hero))hooks.heal?.(c.stats.maxHP*ratio,true);for(const a of c.allies||[])if(a.b.hp>0&&distance(a.hero,point)<=radius&&nav.projectileClear(point,a.hero))a.b.hp=Math.min(a.stats.maxHP,a.b.hp+a.stats.maxHP*ratio);},hit:hooks.hit||(()=>{}),heal:ratio=>hooks.heal?.(c.stats.maxHP*ratio,true),cancelHero(){b.pending=null;b.skillJob=null;b.projectiles=[];if(c.manualPath)c.manualPath.length=0;for(const m of b.mobs)m.telegraph=null;},onSwap(){b.pending=null;if(c.manualPath)c.manualPath.length=0;}};
}
function valid(b,c,key){
 const f=state(b,c),skill=A.activeSkill(f.id,key),ctx=context(b,c,key),target=ctx.target;
 if(c.point&&(f.id!=='akuma_kobu_kobu'||key!=='2'||!ctx.walkable(c.point)||!globalThis.MareRankC.visible(c.point,ctx.view)))return false;
 if(!skill||!b.area||b.hp<=0||b.respawn>0||c.hero.talentControl?.remaining>0&&!Policy.cleansesControl(f.id,key)||f.job||!Number.isFinite(c.now)||S.silenced(c.hero,c.now/1000))return false;
 if(R.has(f.id))return R.valid(decode(f.advanced||R.create()),ctx);
 if(A.isZoan(A.byId(f.id))&&!f.transformed)return false;
 if(f.id==='akuma_kuku_kuku')return (f.effects.food?.length||0)<128&&b.mobs.some(m=>!m.alive&&!m.fruitConsumed&&m.corpseUntil>c.now);
 if(f.id==='akuma_inu_dachshund')return b.mobs.some(m=>live(m)&&distance(m,c.hero)<=130&&ctx.clear(c.hero,m));
 return G.valid(f,ctx)||L.valid(f,ctx)||['akuma_beri_beri','akuma_tori_albatroz','akuma_uma_uma'].includes(f.id);
}
function cast(b,key,c){
 const f=state(b,c);key=String(key);if(!valid(b,c,key)||b.pending||b.skillJob||(b.actionLockUntil||0)>c.now)return false;
 const special=key==='1'&&(f.id===globalThis.MareJiki.rules.id&&f.effects.jikiCharge||f.id===globalThis.MareHoya.rules.id&&f.effects.genie);if(special){if(c.automatic)return false;queue(b,f,key,c);return true;}
 const advanced=decode(f.advanced||R.create()),skill=R.has(f.id)?R.skill(f.id,key,advanced,c.now/1000):A.activeSkill(f.id,key),cd=R.has(f.id)?R.cooldownKey(f.id,key,advanced,c.now/1000):A.cooldownKey(f.id,key);
 const target=b.mobs.find(m=>m.id===b.targetId),free=f.id===globalThis.MareRankC.rules.mato.id&&key==='1'&&globalThis.MareRankC.marked(target,c.now)&&target.matoCharges>0,cost=free?0:skill.cost||0;
 if(b.energy<cost||!free&&(f.cooldowns[cd]||0)>c.now)return false;
 b.energy-=cost;if(free)target.matoCharges--;if(!free||target.matoCharges===0)f.cooldowns[cd]=Math.max(f.cooldowns[cd]||0,c.now+require('./attribute-rules.js').cooldown(P.cooldown(skill.cooldown,f.id),Policy.fruitMeta(f.id,key),c.stats)*1000);
 // Persist an intent. The worker owns effects, damage and the kill reward transaction.
 queue(b,f,key,c);return true;
}
function queue(b,f,key,c){
 const human=!A.isZoan(A.byId(f.id)),t=b.mobs.find(m=>m.id===b.targetId&&live(m));
 if(t){const dx=t.x-c.hero.x,dy=t.y-c.hero.y;c.hero.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';}
 f.job={id:f.id,key,targetId:b.targetId,area:b.area,impactAt:c.now+(human?Policy.punch.impact*1000:0),...(c.point?{point:{...c.point}}:{})};
 if(human){f.castVisual={id:f.id,key,area:b.area,started:c.now,until:c.now+Policy.punch.duration*1000,direction:c.hero.direction};b.actionLockUntil=f.castVisual.until;}
 c.hero.moving=0;
}
function tick(b,c,dt,hooks){
 const f=state(b,c);f.time=c.now;if(!f.id||b.hp<=0){f.job=null;f.castVisual=null;b.actionLockUntil=0;return;}
 if(f.castVisual&&(c.now+1e-6>=f.castVisual.until||f.castVisual.id!==f.id||f.castVisual.area!==b.area||b.hp<=0))f.castVisual=null;
 if(c.hero.talentControl?.remaining>0&&!Policy.cleansesControl(f.id,f.job?.key||f.castVisual?.key)){f.job=null;f.castVisual=null;b.actionLockUntil=0;}
 const ctx=context(b,c,f.job?.key||'1',hooks),now=ctx.now,rt=decode(f.advanced||R.create());
 if(f.job&&c.now>=(f.job.impactAt??0)){const j=f.job;f.job=null;const original=b.targetId;b.targetId=j.targetId;const castContext=context(b,{...c,point:j.point},j.key,hooks);b.targetId=original;
  if(j.id===f.id&&(j.area??b.area)===b.area){hooks.effect?.({fruitId:f.id,key:j.key,x:c.hero.x,y:c.hero.y});if(R.has(f.id)){R.cast(rt,castContext);if(rt.room&&!rt.room.realUntil)rt.room.realUntil=c.now+30250;}
   else if(G.valid(f,castContext))G.cast(f,castContext);
   else if(L.valid(f,castContext))L.cast(f,castContext);
   else if(f.id==='akuma_kuku_kuku'){const m=b.mobs.filter(m=>!m.alive&&!m.fruitConsumed&&m.corpseUntil>c.now).sort((a,z)=>distance(a,c.hero)-distance(z,c.hero))[0];if(m){m.fruitConsumed=true;f.effects.food??=[];f.effects.food.push({x:m.x,y:m.y,ready:now+.75});}}
   else if(f.id==='akuma_beri_beri'){f.effects.invulnerableUntil=now+1.5;for(const m of b.mobs.filter(m=>live(m)&&distance(m,c.hero)<=130)){const d=Math.max(1,distance(m,c.hero));ctx.move(m,(m.x-c.hero.x)*65/d,(m.y-c.hero.y)*65/d);}}
   else if(f.id==='akuma_tori_albatroz')f.effects.altitudeUntil=now+5;
   else if(f.id==='akuma_uma_uma'){const [dx,dy]=R.direction(c.hero);f.effects.dash={dx,dy,remaining:256,hit:false};}
   else if(f.id==='akuma_inu_dachshund'){const m=b.mobs.filter(m=>live(m)&&distance(m,c.hero)<=130&&ctx.clear(c.hero,m)).sort((a,z)=>distance(a,c.hero)-distance(z,c.hero))[0];if(m){const d=Math.max(1,distance(m,c.hero));ctx.move(c.hero,(m.x-c.hero.x)/d*Math.max(0,d-35),(m.y-c.hero.y)/d*Math.max(0,d-35));m.zoanSlowUntil=m.zoanDefenseUntil=now+3;hooks.hit(m,C.damage(ctx.stats,armor(m,false,now),{type:'physical',multiplier:.85}));}}
  }
 }
 if(R.has(f.id))R.step(rt,ctx);else {L.tick(f,ctx,dt);G.tick(f,ctx,dt);}
 f.effects.food=(f.effects.food||[]).filter(food=>{if(food.ready<=now&&distance(food,c.hero)<25){hooks.heal(c.stats.maxHP*.15,true);return false;}return true;});
 if(f.id==='akuma_tori_phoenix'){f.effects.phoenixElapsed=(f.effects.phoenixElapsed||0)+dt;if(f.effects.phoenixElapsed>=10){f.effects.phoenixElapsed-=10;b.hp=Math.min(c.stats.maxHP,b.hp+c.stats.maxHP*.1);b.energy=Math.min(c.stats.maxEnergy,b.energy+c.stats.maxEnergy*.1);}}
 const dash=f.effects.dash;if(dash){const amount=Math.min(dash.remaining,800*dt),moved=ctx.move(c.hero,dash.dx*amount,dash.dy*amount);dash.remaining-=amount;
  if(!dash.hit){const m=b.mobs.find(m=>live(m)&&distance(m,c.hero)<45&&ctx.clear(c.hero,m));if(m){dash.hit=true;hooks.hit(m,C.damage(ctx.stats,armor(m,false,now),{type:'physical',multiplier:.55}));ctx.move(m,dash.dx*45,dash.dy*45);}}
  if(dash.remaining<=0||moved<amount-.1)delete f.effects.dash;
 }
 f.advanced=encode(rt);if(JSON.stringify(f).length>250000)throw Error('fruit_runtime_limit');
}
function incoming(b,c,m,raw,original,physical=true){const f=state(b,c),now=c.now/1000,rt=decode(f.advanced),tags=R.attackTags(c.hero,m,{physical,reach:m.reach});
 if(f.effects.invulnerableUntil>now)return {damage:0,reflected:0};
 raw=globalThis.MareRankB.reduction(raw,{equipped:f.id,physical,hasHaki:m.hasHaki});
 const p=R.protect(rt,now,raw,tags),r=A.retaliate(original,p.damage,{active:f.effects.supaUntil>now,physical});
 return {damage:r.damage,reflected:r.reflected,ushi:f.effects.ushiUntil>now,bariMelee:R.domeActive(rt,now)&&tags.melee,physical};
}
module.exports={basicMultiplier,A,P,R,S,valid,state,stats,cast,tick,transform,reset,armor,incoming,genieDamage:G.damage,encode,decode,move};
