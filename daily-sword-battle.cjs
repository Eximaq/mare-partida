'use strict';
const geometry=require('./daily-sword-boss-combat.js');
const {actors}=require('./daily-sword-boss-specials.json');
const names=require('./sword-compendium.js').bossNames;
const {create:spawn}=require('./akainu-combat.js');
const {monsterProfile}=require('./character-system.js');
const reference=require('./sabaody-monsters.js').catalog.kuma.normalCombat;

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const policy=Object.freeze({maxPlayers:16,minLevel:100,assumedPlayers:6,assumedDps:185,seconds:300,specialMultiplier:1.45});
function create({id,boss,x,y,now}){
 if(!Object.hasOwn(actors,boss))throw Error('daily_sword_unknown_boss');
 const base=monsterProfile(reference),level=reference.level;
 const profile={hp:policy.assumedPlayers*policy.assumedDps*policy.seconds,attack:Math.round(base.attack*1.15),
  defense:base.defense,magicDefense:base.defense,speed:64,reach:60,attackSec:2.4,aoeCooldown:9,
  aoeRadius:220,aoeWindup:1,aoeMultiplier:policy.specialMultiplier,level,leash:850};
 return {...spawn({id,x,y,profile,now}),type:boss,name:names[boss],dailySwordBossId:boss,nextAoeAt:now+3500};
}
function face(b,to){
 const dx=to.x-b.x,dy=to.y-b.y;
 b.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'front';
 b.emberFacing={left:'west',right:'east',back:'north',front:'south'}[b.direction];
}
function step(b,players,{nav,now,dt=.05}){
 if(!b.alive||b.hp<=0)return [];
 const anchor={x:b.anchorX,y:b.anchorY};
 const living=players.filter(p=>p.connected&&p.b.hp>0&&distance(p.hero,anchor)<=b.profile.leash);
 const hit=(targetId,kind)=>({attackId:b.action.id,targetId,kind});
 b.moving=0;b.attackAnim=0;
 if(b.action){
  const a=b.action;
  if(now<=a.endAt){
   b.attackAnim=Math.max(.01,(a.endAt-now)/1000);
   if(a.kind==='sword-special'){
    const last=now-dt*1000;
    const hits=geometry.contact(a.cast,last,now,living.map(p=>({id:p.id,x:p.hero.x,y:p.hero.y})),{clear:(x,y)=>nav.projectileClear(x,y)});
    a.impacted||=hits.length>0;
    if(a.cast.shape==='dash-lane'&&now>=a.cast.impactAt&&!a.dashed){Object.assign(b,a.cast.to);a.dashed=true;}
    return hits.map(id=>hit(id,a.kind));
   }
   if(!a.impacted&&now>=a.impactAt){a.impacted=true;return [hit(a.targetId,a.kind)];}
   return [];
  }
  b.action=null;b.telegraph=null;
 }
 const focus=living.reduce((best,p)=>!best||distance(b,p.hero)<distance(b,best.hero)?p:best,null);
 if(!focus)return [];
 const range=distance(b,focus.hero);
 face(b,focus.hero);
 if(now>=b.nextAoeAt&&range<=245){
  const cast=geometry.create(actors[b.dailySwordBossId],{castId:b.id+':'+(++b.seq),origin:b,target:focus.hero,now,
   legalPoint:point=>nav.walkable(point.x,point.y)&&distance(point,anchor)<=b.profile.leash&&nav.projectileClear(b,point)?point:null});
  if(cast){
   b.action={id:cast.castId,kind:'sword-special',cast,startedAt:now,impactAt:cast.releaseAt,endAt:cast.endAt,impacted:false};
   b.nextAoeAt=now+b.profile.aoeCooldown*1000;b.attackCount++;
   return [];
  }
 }
 if(range<=b.reach&&nav.projectileClear(b,focus.hero)){
  if(now>=b.nextPunchAt){
   b.action={id:b.id+':'+(++b.seq),kind:'punch',targetId:focus.id,startedAt:now,impactAt:now+450,endAt:now+850,impacted:false};
   b.nextPunchAt=now+b.attackSec*1000;b.attackCount++;
  }
  return [];
 }
 const from={x:b.x,y:b.y};nav.follow(b,nav.path(b,focus.hero),b.speed,dt);
 if(distance(b,anchor)>b.profile.leash)Object.assign(b,from);
 b.moving=distance(b,from)>.01?1:0;
 return [];
}
module.exports={create,step,policy};
