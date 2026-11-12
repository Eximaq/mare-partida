/* Pure encounter simulation. No map registration, spawning, saves or rendering. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KaizokuAkainu=api;})(globalThis,function(){
 'use strict';
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const directions={left:'west',right:'east',front:'south',back:'north'};
 function validateProfile(p){
  const limits={hp:[1,1e9],attack:[1,1e6],defense:[0,1e6],magicDefense:[0,1e6],speed:[1,240],reach:[24,160],attackSec:[1,30],aoeCooldown:[4,120],aoeRadius:[48,240],aoeWindup:[.8,5],aoeMultiplier:[.1,10],level:[1,1000],leash:[240,1200]};
  if(!p||typeof p!=='object'||Object.keys(p).some(k=>!limits[k]))throw Error('weekly_boss_profile_invalid');
  for(const [k,[min,max]] of Object.entries(limits))if(!Number.isFinite(p[k])||p[k]<min||p[k]>max)throw Error('weekly_boss_profile_invalid');
  if(!Number.isInteger(p.level)||!Number.isInteger(p.hp)||p.leash<p.aoeRadius+64)throw Error('weekly_boss_profile_invalid');
  return {...p};
 }
 function create({id,x,y,profile,now}){
  const p=validateProfile(profile);if(!id||![x,y,now].every(Number.isFinite))throw Error('weekly_boss_spawn_invalid');
  return {id,spawnId:id,type:'weekly-akainu',weeklyBossId:'akainu',source:'weekly-boss',name:'Akainu',...p,profile:p,maxHP:p.hp,hp:p.hp,x,y,anchorX:x,anchorY:y,alive:true,engaged:false,returning:false,aggro:p.leash,attackClock:0,attackCount:0,bob:0,slow:0,telegraph:null,action:null,moving:0,attackAnim:0,emberElapsed:0,emberFacing:'south',direction:'front',nextPunchAt:now,nextAoeAt:now+Math.min(4000,p.aoeCooldown*1000),seq:0};
 }
 function face(b,point){const dx=point.x-b.x,dy=point.y-b.y;b.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';b.emberFacing=directions[b.direction];}
 function pause(b,now){b.action=null;b.telegraph=null;b.moving=0;b.attackAnim=0;b.nextPunchAt=now+1000;b.nextAoeAt=Math.max(b.nextAoeAt||0,now+2000);}
 function move(b,point,nav,dt){const before={x:b.x,y:b.y},path=nav.path(b,point);nav.follow(b,path,b.speed*(b.slow>0?.55:1),dt);if(distance(b,{x:b.anchorX,y:b.anchorY})>b.profile.leash+2&&!b.returning){b.x=before.x;b.y=before.y;}b.moving=distance(before,b)>.01?1:0;if(b.moving)face(b,{x:2*b.x-before.x,y:2*b.y-before.y});}
 function step(b,actors,{nav,now,dt=.05}){
  if(!Number.isFinite(now)||!Number.isFinite(dt)||dt<0||dt>1)throw RangeError('Invalid Akainu step');
  const hits=[];b.moving=0;b.emberElapsed=(b.emberElapsed||0)+dt;b.attackAnim=Math.max(0,(b.attackAnim||0)-dt);b.slow=Math.max(0,(b.slow||0)-dt);
  if(!b.alive||b.hp<=0){b.alive=false;b.hp=0;b.action=null;b.telegraph=null;return hits;}
  const origin={x:b.anchorX,y:b.anchorY},living=actors.filter(a=>a.connected&&a.b.hp>0&&distance(a.hero,origin)<=b.profile.leash);
  if(!living.length){pause(b,now);b.engaged=false;if(distance(b,origin)>2){b.returning=true;move(b,origin,nav,dt);}else b.returning=false;return hits;}
  if(distance(b,origin)>b.profile.leash||b.returning){b.returning=true;pause(b,now);move(b,origin,nav,dt);if(distance(b,origin)<=4)b.returning=false;return hits;}
  b.engaged=true;
  if(b.empRemaining>0||b.talentControl?.remaining>0||b.bisonStunUntil>now/1000||b.ryuStunUntil>now/1000||b.rankSFreezeUntil>now/1000||b.rankAStunUntil>now/1000){pause(b,now);return hits;}
  if(b.action){
   const a=b.action;
   if(b.telegraph)b.telegraph.remaining=Math.max(0,(a.impactAt-now)/1000);
   if(!a.impacted&&now>=a.impactAt){a.impacted=true;b.telegraph=null;
    for(const target of living){
     const hit=a.kind==='aoe'?distance(target.hero,a.center)<=a.radius:target.id===a.targetId&&distance(b,target.hero)<=b.reach+10;
     if(hit&&nav.projectileClear(a.kind==='aoe'?a.center:b,target.hero))hits.push({attackId:a.id,targetId:target.id,kind:a.kind,multiplier:a.kind==='aoe'?b.profile.aoeMultiplier:1});
    }
   }
   if(now>=a.endAt)b.action=null;
   return hits;
  }
  const taunter=b.partyTaunt?.until>now&&living.find(a=>a.id===b.partyTaunt.targetId);
  const focus=taunter||living.find(a=>a.id===b.partyTargetId)||living.slice().sort((a,z)=>distance(b,a.hero)-distance(b,z.hero)||a.id.localeCompare(z.id))[0];
  b.partyTargetId=focus.id;face(b,focus.hero);
  const inReach=distance(b,focus.hero)<=b.reach+10&&nav.projectileClear(b,focus.hero);
  if(now>=b.nextAoeAt&&distance(b,focus.hero)<=b.profile.aoeRadius){
   const windup=b.profile.aoeWindup*1000;
   b.action={id:b.id+':'+(++b.seq),kind:'aoe',startedAt:now,impactAt:now+windup,endAt:now+windup+850,impacted:false,center:{x:b.x,y:b.y},radius:b.profile.aoeRadius};
   b.telegraph={kind:'circle',shape:'circle',x:b.x,y:b.y,radius:b.profile.aoeRadius,remaining:b.profile.aoeWindup,duration:b.profile.aoeWindup,total:b.profile.aoeWindup,impactAt:b.action.impactAt,damageType:'magma'};
   b.nextAoeAt=now+b.profile.aoeCooldown*1000;b.nextPunchAt=Math.max(b.nextPunchAt,b.action.endAt+350);b.attackCount++;return hits;
  }
  if(inReach&&now>=b.nextPunchAt){b.action={id:b.id+':'+(++b.seq),kind:'punch',targetId:focus.id,startedAt:now,impactAt:now+450,endAt:now+850,impacted:false};b.nextPunchAt=now+b.profile.attackSec*1000;b.attackCount++;return hits;}
  if(!inReach&&!(b.doruRootUntil>now/1000||b.betaRootUntil>now/1000))move(b,focus.hero,nav,dt);
  return hits;
 }
 return Object.freeze({create,step,pause,validateProfile});
});
