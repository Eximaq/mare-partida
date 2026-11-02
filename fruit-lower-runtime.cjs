'use strict';
// Orchestration of unchanged E/D/C/B rules. State contains only server-owned data.
require('./akuma-system.js');const N=globalThis.MareNeko,U=globalThis.MareUshi,W=globalThis.MareWolf,D=globalThis.MareDoru,RC=globalThis.MareRankC,X=globalThis.MareRankCExpansion,B=globalThis.MareRankB,Y=globalThis.MareRyu,C=require('./character-system.js');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),live=m=>m?.alive&&m.hp>0&&!m.returning;
function valid(f,c){const {fruit:id,key,target:t,hero:h}=c,near=r=>live(t)&&distance(h,t)<=r&&c.clear(h,t),visible=()=>live(t)&&RC.visible(t,c.view);
 if(f.effects.action)return false;
 if(id==='akuma_supa_supa')return true;
 if(id===N.rules.id)return near(key==='1'?N.rules.dashRange:N.rules.comboRange)&&(key!=='1'||distance(h,t)>=1);
 if(id===U.rules.id)return key==='2'||near(U.rules.range);
 if(id===W.rules.id)return key==='2'||near(W.rules.range)&&distance(h,t)>=1;
 if(id===D.rules.id)return near(D.rules.range)&&distance(h,t)>=1;
 if(id===RC.rules.horu.id)return true;
 if(id===RC.rules.mato.id)return key==='1'||visible();
 if(id===X.rules.bison.id)return key==='2'||near(256)&&distance(h,t)>0;
 if(id===X.rules.bomu.id)return near(384);
 if(id===X.rules.kobu.id)return true;
 if(id===Y.rules.id)return near(Y.rules.range);
 if(B.has(id))return id===B.rules.beta.id&&key==='1'||visible()&&(id!==B.rules.hana.id||key!=='1'||distance(h,t)<=128);
 return false;
}
const direction=(c)=>{const t=c.target,d=live(t)?distance(c.hero,t):0;return d?[(t.x-c.hero.x)/d,(t.y-c.hero.y)/d]:({right:[1,0],left:[-1,0],front:[0,1],back:[0,-1]})[c.hero.direction]||[0,1];};
function cast(f,c){if(!valid(f,c))return;const e=f.effects,{fruit:id,key,now,stats:s,target:t,hero:h}=c,ms=c.epoch,[dx,dy]=direction(c),physical=(m,mult,critical=false)=>c.hit(m,C.damage(s,c.armor(m,false),{type:'physical',multiplier:mult,critical}));e.shots??=[];e.jobs??=[];
 if(id==='akuma_supa_supa'){if(key==='1')for(const m of c.enemies.filter(m=>live(m)&&distance(h,m)<=128))physical(m,1.3);else e.supaUntil=now+5;}
 else if(id===N.rules.id)e.action={kind:key==='1'?'neko-dash':'neko-combo',targetId:t.id,started:now,dx,dy,remaining:Math.min(N.rules.dashRange+N.rules.dashBeyond,distance(h,t)+N.rules.dashBeyond),nextHit:0,hit:false};
 else if(id===U.rules.id){if(key==='2')e.ushiUntil=now+U.rules.duration/1000;else e.action={kind:'ushi',targetId:t.id,started:now,direction:[dx,dy],hit:false};}
 else if(id===W.rules.id){if(key==='2')e.wolfUntil=now+W.rules.auraDuration/1000;else e.action={kind:'wolf',targetId:t.id,started:now,travel:0,attack:s.physical};}
 else if(id===D.rules.id)e.shots.push({kind:'doru',...D.create(key,h,[dx,dy],s.attack+(C.roles[c.classId]?.magic?0:s.fruitSpecialAttack||0))});
 else if(id===RC.rules.horu.id){if(key==='1')e.horuUntil=now+30;else{RC.cleanse(h);c.heal(.2);c.effect?.({fruitId:f.id,kind:'horu-heal',x:h.x,y:h.y});e.horuSpeedUntil=now+6;}}
 else if(id===RC.rules.mato.id){if(key==='2'){for(const m of c.enemies)RC.clearMark(m);RC.mark(t,ms);}else{const p=RC.projectile(h,[dx,dy],t,s.physical,RC.marked(t,ms),c.map);p.penetration=s.penetration||0;p.kind='mato';e.shots.push(p);}}
 else if(id===X.rules.bison.id){if(key==='1')e.action={kind:'bison',started:now,travel:0,dx,dy,attack:s.physical,penetration:s.penetration||0};else{e.bisonUntil=now+30;if(!f.hpScale){f.hpScale=1.2;c.scaleHp(1.2);}}}
 else if(id===X.rules.bomu.id){for(let i=0;i<(key==='1'?6:2);i++)e.shots.push({...RC.projectile(h,[dx,dy],null,s.physical,false,c.map),kind:'bomu',key,launch:now+(key==='2'?i*.18:0),penetration:s.penetration||0});}
 else if(id===X.rules.kobu.id){e.flags=(e.flags||[]).filter(v=>v.key!==key);const point=key==='2'&&c.point?c.point:h;e.flags.push({key,x:point.x,y:point.y,until:ms+(key==='1'?20000:15000),view:X.flagArea(point,c.view)});e.flagTick=0;}
 else if(id===Y.rules.id)e.action={kind:'ryu',key,targetId:t.id,started:now,direction:h.direction,attack:s.physical,penetration:s.penetration||0,hasHaki:!!Y.skill(key).hasHaki||c.haki==='armament',hit:false};
 else if(B.has(id)){const beta=id===B.rules.beta.id,power=beta?s.elemental:s.physical,pen=beta?s.magicPen||0:s.penetration||0;
  if(beta&&key==='1'){for(const m of c.enemies.filter(m=>live(m)&&distance(h,m)<=128))c.hit(m,C.damage({physical:power,elemental:power},c.armor(m,true)*(1-pen),{type:'elemental',multiplier:1.5}));}
  else{const kind=beta?'root':key==='1'?'punch':'choke';e.jobs.push({kind,targetId:t.id,started:now,power,penetration:pen,next:0});if(beta)t.betaRootUntil=now+4;else if(key==='2'){c.hit(t,C.damage({physical:power,elemental:0},c.armor(t,false)*(1-pen),{multiplier:1}));t.hanaStunFrom=now+B.chokeLead/1000;t.hanaStunUntil=now+B.chokeEnd/1000;}}
 }
}
function tick(f,c,dt){const e=f.effects,{now,epoch:ms,stats:s,hero:h}=c;
 if(f.hpScale&&e.bisonUntil<=now){c.scaleHp(1/f.hpScale);delete f.hpScale;}
 for(const m of c.enemies){if(m.hasMatoMark&&!RC.marked(m,ms))RC.clearMark(m);if(m.wolfBleed){for(const _ of W.dueTicks(m.wolfBleed,now))if(live(m))c.hit(m,W.damage(m.wolfBleed.attack,c.armor(m,false),.2));if(m.wolfBleed.nextTick>5||!live(m))delete m.wolfBleed;}}
 if((e.flags||[]).length&&ms>=(e.flagTick||0)){e.flags=e.flags.filter(v=>v.until>ms);e.kobuUntil=0;for(const m of c.enemies)delete m.kobuDebuffUntil;for(const flag of e.flags){if(flag.key==='1'&&X.visible(flag,c.view))e.kobuUntil=flag.until/1000;else if(flag.key==='2')for(const m of c.enemies.filter(live))if(X.visible(m,flag.view))m.kobuDebuffUntil=flag.until;}e.flagTick=ms+1000;}
 for(const p of e.shots||[]){if(p.launch>now)continue;if(p.kind==='doru'){D.step(p,dt,c.enemies,c.clear,{impact:shot=>{if(shot.key==='1')for(const m of D.targets({x:shot.impactX,y:shot.impactY},c.enemies).filter(m=>live(m)&&c.clear(shot,m)))c.hit(m,D.damage(shot.attack,c.armor(m,false)));}},now);continue;}
  const impact=(m,shot)=>{shot.resolved=true;if(m){shot.x=m.x;shot.y=m.y;}if(p.kind==='bomu')c.effect?.({fruitId:f.id,kind:'bomu-impact',key:p.key,x:p.x,y:p.y});const targets=p.kind==='bomu'?(p.key==='1'?(m?[m]:[]):c.enemies.filter(m=>live(m)&&X.inSplash(p,m))):(m?[m]:[]);for(const target of targets)c.hit(target,C.damage({physical:shot.attack,elemental:0},c.armor(target,false)*(1-shot.penetration),{type:'physical',multiplier:p.kind==='bomu'?(p.key==='1'?.75:1.5):1.1}));};
  RC.stepProjectile(p,dt,c.enemies,c.clear,impact);if(p.done&&!p.resolved&&p.kind==='bomu')impact(null,p);
 }e.shots=(e.shots||[]).filter(p=>!p.done);
 e.jobs=(e.jobs||[]).filter(j=>{const m=c.enemies.find(m=>m.id===j.targetId&&live(m));if(!m)return false;const elapsed=(now-j.started)*1000;if(j.kind==='root')return B.rooted(m,now);for(const _ of B.due(j,elapsed))if(live(m))c.hit(m,C.damage({physical:j.power,elemental:0},c.armor(m,false)*(1-j.penetration),{multiplier:j.kind==='punch'?.8:.9}));return elapsed<(j.kind==='punch'?B.effects.punch.duration:B.chokeEnd)&&live(m);});
 const a=e.action;if(!a)return;const t=c.enemies.find(m=>m.id===a.targetId&&live(m)),age=now-a.started,physical=(m,mult,critical=false)=>c.hit(m,C.damage(s,c.armor(m,false),{type:'physical',multiplier:mult,critical}));
 if(a.kind==='neko-combo'){if(t)for(const _ of N.dueHits(a,age*1000))if(live(t)&&distance(h,t)<=N.rules.comboRange&&c.clear(h,t))physical(t,.8);if(!t||age*1000>=N.rules.comboDuration)delete e.action;}
 else if(a.kind==='ushi'){if(!a.hit&&age>=U.rules.impactAt){a.hit=true;if(t&&distance(h,t)<=U.rules.range&&U.frontal(h,t,a.direction)&&c.clear(h,t)){c.hit(t,U.damage(s.physical,c.armor(t,false),s.penetration));if(live(t)&&!D.isRooted(t,now))Object.assign(t,U.knockback(h,t,(from,to)=>c.clear(from,to)&&c.walkable(to)&&!c.enemies.some(m=>m!==t&&live(m)&&distance(m,to)<24)));}}if(age>=U.rules.headbuttDuration)delete e.action;}
 else if(a.kind==='ryu'){const timing=Y.timing(a.key,a.direction);if(!a.hit&&age>=timing.impact){a.hit=true;if(t&&distance(h,t)<=Y.rules.range&&c.clear(h,t)){c.hit(t,Y.damage(a.attack,c.armor(t,false),Y.skill(a.key).multiplier,a.penetration,t,a.hasHaki));if(live(t)&&Y.skill(a.key).stunDuration)Y.stun(t,now);}}if(age>=timing.duration)delete e.action;}
 else{
  if(a.kind==='wolf'&&(!t||age>=W.rules.chargeTimeout)){delete e.action;return;}
  if(a.finished){if(now-a.finished>=4/12)delete e.action;return;}
  if(a.kind==='wolf'){const goal=c.manualPath?.[0]||t,d=distance(h,goal);if(d){a.dx=(goal.x-h.x)/d;a.dy=(goal.y-h.y)/d;h.direction=Math.abs(a.dx)>Math.abs(a.dy)?a.dx<0?'left':'right':a.dy<0?'back':'front';}}
  let budget=Math.min((a.kind==='neko-dash'?N.rules.dashSpeed:a.kind==='wolf'?W.rules.chargeSpeed:640)*dt,a.kind==='neko-dash'?a.remaining:256-a.travel);
  while(budget>0&&!a.finished){const n=Math.min(8,budget),from={x:h.x,y:h.y},moved=c.move(h,a.dx*n,a.dy*n);budget-=n;if(a.kind==='neko-dash')a.remaining-=n;else a.travel+=moved;if(moved<n-.01){delete e.action;return;}
   const victim=a.kind==='bison'?c.enemies.find(m=>live(m)&&N.segmentHit(from,h,m,24)):t;
   if(victim&&!a.hit&&N.segmentHit(from,h,victim,a.kind==='wolf'?W.rules.hitRadius:24)){a.hit=true;if(a.kind==='neko-dash')physical(victim,1.45,N.backstab(h.x-from.x,h.y-from.y,victim.emberFacing||'south'));
    else if(a.kind==='wolf'){a.finished=now;c.hit(victim,W.damage(a.attack,c.armor(victim,false),1));if(live(victim))victim.wolfBleed={started:now,nextTick:1,attack:a.attack};}
    else{a.finished=now;c.hit(victim,C.damage({physical:a.attack,elemental:0},c.armor(victim,false)*(1-a.penetration),{multiplier:1.8}));victim.bisonStunUntil=now+2;victim.telegraph=null;}
   }
  }
  if(a.kind==='neko-dash'?age>=.75:a.travel>=256&&!a.finished)delete e.action;
 }
}
module.exports={valid,cast,tick};
