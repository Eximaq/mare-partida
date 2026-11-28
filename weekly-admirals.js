(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MareWeeklyAdmirals=api;})(globalThis,()=>{
 'use strict';
 // Skill tile = 64 world units (four 16-unit navigation cells).
 const tile=64,roster=Object.freeze({aokiji:Object.freeze({name:'Aokiji',height:154,line:5,width:.43,radius:5,element:'ice'}),akainu:Object.freeze({name:'Akainu',height:150,line:6,width:.47,radius:3.4,element:'magma'}),kizaru:Object.freeze({name:'Kizaru',height:156,radius:1.5,chain:4,element:'light'})});
 // Ace's dungeon has 304,088 HP, 4,527 physical and 1,674 magical defense.
 // Use a rounded comparable baseline for these 300,000 HP weekly variants.
 const balance=Object.freeze({hp:300000,defense:4500,magicDefense:1650,attackFraction:.05});
 const attackAmount=maxHP=>Number.isFinite(maxHP)&&maxHP>0?maxHP*balance.attackFraction:0;
 const levels=Object.freeze({aokiji:170,akainu:180,kizaru:130});
 function balanceProfile(id,profile={}){if(!valid(id))throw Error('weekly_admiral_invalid');
  // attack=1 is only an adapter to the legacy spawn shape; every weekly hit
  // uses attackAmount against its own defender; no prior flat damage is used.
  return {speed:90,reach:66,attackSec:2.8,aoeCooldown:12,aoeWindup:1.15,level:levels[id],leash:700,...profile,
   hp:balance.hp,defense:balance.defense,magicDefense:balance.magicDefense,attack:1,aoeMultiplier:1,aoeRadius:Math.min(240,roster[id].radius*tile)};
 }
 function defaultConfig(id,{spawn,entry}){return {mapId:'marineford',spawn:{...spawn},entry:{...entry},maxPlayers:16,minLevel:1,durationMinutes:45,balanceApproved:false,profile:balanceProfile(id)};}
 const dirs=Object.freeze({north:Object.freeze({x:0,y:-1}),east:Object.freeze({x:1,y:0}),south:Object.freeze({x:0,y:1}),west:Object.freeze({x:-1,y:0})});
 const ids=Object.freeze(Object.keys(roster));
 const valid=id=>Object.hasOwn(roster,id);
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const point=m=>({x:m.x,y:m.y});
 const extent=id=>Math.max(roster[id].radius,roster[id].line||0)*tile+(roster[id].width||0)*tile;
 function shape(id,slot,p,direction){
  const r=roster[id],v=dirs[direction];if(!r||!v)throw Error('weekly_admiral_invalid');
  if(slot==='area')return {kind:'circle',center:point(p),radius:r.radius*tile};
  if(r.chain)return {kind:'chain',count:r.chain,range:tile*5};
  return {kind:'capsule',from:{x:p.x+v.x*.5*tile,y:p.y+v.y*.5*tile},
   to:{x:p.x+v.x*r.line*tile,y:p.y+v.y*r.line*tile},radius:r.width*tile};
 }
 function contains(s,p){
  if(s?.kind==='circle')return distance(s.center,p)<=s.radius;
  if(s?.kind!=='capsule')return false;
  const dx=s.to.x-s.from.x,dy=s.to.y-s.from.y,d=dx*dx+dy*dy;if(!d)return false;
  const t=Math.max(0,Math.min(1,((p.x-s.from.x)*dx+(p.y-s.from.y)*dy)/d));
  return Math.hypot(p.x-s.from.x-t*dx,p.y-s.from.y-t*dy)<=s.radius;
 }
 function profiles(config){return config?.admiralsVersion===1&&config.profiles&&typeof config.profiles==='object'?config.profiles:{};}
 function withProfile(config,id,value){if(!valid(id))throw Error('weekly_admiral_invalid');return {admiralsVersion:1,profiles:{...profiles(config),[id]:value},legacyConfig:config?.admiralsVersion===1?config.legacyConfig??null:config??null};}
 function initialize(base,id){if(!valid(id))throw Error('weekly_admiral_invalid');return {...base,type:'weekly-'+id,name:roster[id].name,weeklyBossId:id,weeklyAdmiralVersion:1,nextSpecialAt:base.nextAoeAt+2500};}
 function turn(b,p){const dx=p.x-b.x,dy=p.y-b.y;if(!dx&&!dy)return;const d=Math.abs(dx)>Math.abs(dy)?dx<0?'west':'east':dy<0?'north':'south';b.emberFacing=d;b.direction={north:'back',east:'right',south:'front',west:'left'}[d];}
 function pause(b,now){b.action=null;b.telegraph=null;b.moving=0;b.attackAnim=0;b.nextPunchAt=now+900;b.nextAoeAt=Math.max(b.nextAoeAt||0,now+2000);b.nextSpecialAt=Math.max(b.nextSpecialAt||0,now+1500);}
 function move(b,to,nav,dt){const from=point(b);nav.follow(b,nav.path(b,to),b.speed*(b.slow>0?.55:1),dt);if(!b.returning&&distance(b,{x:b.anchorX,y:b.anchorY})>b.profile.leash+2)Object.assign(b,from);b.moving=distance(b,from)>.01?1:0;if(b.moving)turn(b,{x:2*b.x-from.x,y:2*b.y-from.y});}
 function chain(living,start,range,nav){
  const targets=[],seen=new Set();let from=start;
  for(let i=0;i<4;i++){const a=living.filter(a=>!seen.has(a.id)&&distance(from,a.hero)<=range&&nav.projectileClear(from,a.hero)).sort((a,b)=>distance(from,a.hero)-distance(from,b.hero)||a.id.localeCompare(b.id))[0];if(!a)break;const to=point(a.hero);targets.push({id:a.id,from,to});seen.add(a.id);from=to;}
  return targets;
 }
 function cast(b,kind,focus,living,nav,now){
  const id=b.weeklyBossId,r=roster[id],origin=point(b);
  const geometry=kind==='punch'?null:shape(id,kind==='aoe'?'area':'line',origin,b.emberFacing);
  const impactAt=now+(kind==='aoe'?b.profile.aoeWindup*1000:kind==='punch'?450:500);
  const hops=geometry?.kind==='chain'?chain(living,origin,geometry.range,nav):[];
  if(geometry?.kind==='chain'&&!hops.length)return false;
  const endAt=impactAt+(kind==='punch'?420:geometry?.kind==='chain'?(hops.length+1)*127+190:1450);
  b.action={id:b.id+':'+(++b.seq),kind,origin,geometry,facing:b.emberFacing,targetId:focus.id,hops,startedAt:now,impactAt,endAt,impacted:false,hitIds:{},nextHop:0};
  b.attackCount++;b.nextPunchAt=Math.max(b.nextPunchAt,endAt+200,now+b.profile.attackSec*1000);
  if(kind==='aoe')b.nextAoeAt=now+b.profile.aoeCooldown*1000;
  if(kind==='special')b.nextSpecialAt=now+b.profile.aoeCooldown*850;
  return true;
 }
 function step(b,actors,{nav,now,dt=.05}){
  if(!Number.isFinite(now)||!Number.isFinite(dt)||dt<0||dt>1)throw RangeError('weekly_admiral_invalid_tick');
  const r=roster[b.weeklyBossId];if(!r)throw Error('weekly_admiral_invalid');
  b.moving=0;b.emberElapsed=(b.emberElapsed||0)+dt;b.slow=Math.max(0,(b.slow||0)-dt);
  if(!b.alive||b.hp<=0){b.alive=false;b.hp=0;b.action=null;b.telegraph=null;return [];}
  const anchor={x:b.anchorX,y:b.anchorY},living=actors.filter(a=>a.connected&&a.b.hp>0&&distance(a.hero,anchor)<=b.profile.leash);
  if(!living.length||distance(b,anchor)>b.profile.leash||b.returning){
   pause(b,now);b.engaged=false;b.returning=distance(b,anchor)>3;if(b.returning)move(b,anchor,nav,dt);return [];
  }
  b.engaged=true;
  if(b.empRemaining>0||b.talentControl?.remaining>0||b.bisonStunUntil>now/1000||b.ryuStunUntil>now/1000||b.rankSFreezeUntil>now/1000||b.rankAStunUntil>now/1000){pause(b,now);return [];}
  const a=b.action,hits=[];
  if(a){
   const push=t=>{if(!t||Object.hasOwn(a.hitIds,t.id))return;a.hitIds[t.id]=true;hits.push({attackId:a.id,targetId:t.id,kind:a.kind});};
   if(now>=a.endAt){b.action=null;return hits;}
   if(now>=a.impactAt){
    if(a.geometry?.kind==='chain'){
     while(a.nextHop<a.hops.length&&now>=a.impactAt+a.nextHop*127){
      const h=a.hops[a.nextHop++],target=living.find(t=>t.id===h.id);
      if(target&&distance(target.hero,h.to)<=tile*.65&&nav.projectileClear(h.from,target.hero))push(target);
     }
     a.impacted=true;
    }else if(!a.impacted){
     a.impacted=true;
     for(const target of living){const hit=a.kind==='punch'?target.id===a.targetId&&distance(a.origin,target.hero)<=b.reach+10:contains(a.geometry,target.hero);
      if(hit&&nav.projectileClear(a.origin,target.hero))push(target);}
    }
   }
   return hits;
  }
  const focus=(b.partyTaunt?.until>now&&living.find(a=>a.id===b.partyTaunt.targetId))||living.find(a=>a.id===b.partyTargetId)||living.slice().sort((a,z)=>distance(b,a.hero)-distance(b,z.hero)||a.id.localeCompare(z.id))[0];
  b.partyTargetId=focus.id;turn(b,focus.hero);
  const d=distance(b,focus.hero),clear=nav.projectileClear(b,focus.hero);
  if(now>=b.nextAoeAt&&d<=r.radius*tile&&clear&&cast(b,'aoe',focus,living,nav,now))return hits;
  const geom=shape(b.weeklyBossId,'line',b,b.emberFacing);
  if(now>=b.nextSpecialAt&&clear&&(geom.kind==='chain'?d<=geom.range:contains(geom,focus.hero))&&cast(b,'special',focus,living,nav,now))return hits;
  if(d<=b.reach+10&&clear){if(now>=b.nextPunchAt)cast(b,'punch',focus,living,nav,now);}
  else if(!(b.doruRootUntil>now/1000||b.betaRootUntil>now/1000))move(b,focus.hero,nav,dt);
  return hits;
 }
 return Object.freeze({tile,roster,balance,attackAmount,balanceProfile,defaultConfig,ids,dirs,valid,extent,shape,contains,profiles,withProfile,initialize,pause,step});
});
