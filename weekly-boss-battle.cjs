'use strict';
// Runs only on the authoritative worker. It never issues loot, XP or claims.
const E=require('./world-battle.cjs'),A=require('./akainu-combat.js'),R=require('./weekly-boss-rules.cjs');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function step(room,actors,{nav,now,dt,rng}){
 if(!room?.id||!Array.isArray(room.mobs)||room.mobs.length!==1||room.mobs[0].source!=='weekly-boss')throw Error('weekly_boss_room_invalid');
 if(!Number.isFinite(now)||!Number.isFinite(dt)||dt<0||dt>1||typeof rng!=='function')throw RangeError('weekly_boss_step_invalid');
 const active=actors.filter(a=>a.connected===true&&a.b?.weeklyBossInstanceId===room.id);
 if(active.length>R.policy.maxPlayers||new Set(active.map(a=>a.id)).size!==active.length)throw Error('weekly_boss_roster_invalid');
 const boss=room.mobs[0],results=new Map(active.map(a=>[a.id,{id:a.id,kills:[],hero:a.hero,potionsUsed:0,talentSteals:[]}]));
 room.contributions??={};
 for(const actor of active){
  actor.b.mobs=room.mobs;
  if(!Object.hasOwn(room.contributions,actor.id)){
   if(Object.keys(room.contributions).length>=R.policy.maxContributors)throw Error('weekly_boss_contribution_limit');
   Object.defineProperty(room.contributions,actor.id,{value:{damage:0,healing:0,combatMs:0,lastSeen:now},writable:true,enumerable:true,configurable:true});
  }
 }
 const merge=(actor,result)=>{const out=results.get(actor.id);out.kills.push(...result.kills);out.potionsUsed+=result.potionsUsed;out.talentSteals.push(...(result.talentSteals||[]));};
 const inArena=a=>a.b.hp>0&&distance(a.hero,{x:boss.anchorX,y:boss.anchorY})<=boss.profile.leash;
 const context=(a,clock,slice,incoming=[])=>({...a,nav,now:clock,dt:slice,rng,potions:Math.max(0,(a.potions||0)-results.get(a.id).potionsUsed),allies:active.filter(o=>o.id!==a.id&&o.b.hp>0).map(o=>({...o,stats:E.combatStats(o.b,o)})),shared:{actorId:a.id,owns:()=>a.id===active[0]?.id},weeklyDamage:incoming});
 let left=dt,clock=now-dt*1000;
 while(left>1e-9){
  const slice=Math.min(.05,left);left-=slice;clock+=slice*1000;
  for(const a of active){
   const record=room.contributions[a.id],present=inArena(a),wasAlive=boss.alive&&boss.hp>0;
   const hpBefore=boss.hp,alliedHP=new Map(active.filter(o=>o.id!==a.id&&inArena(o)).map(o=>[o.id,o.b.hp]));
   merge(a,E.step(a.b,context(a,clock,slice)));
   if(present&&wasAlive){
    record.lastSeen=clock;record.combatMs+=slice*1000;
    record.damage+=Math.max(0,hpBefore-boss.hp);
    // Only effective healing of other participants is attributable here.
    // Self regeneration and healing done during another actor's step never count.
    for(const other of active){if(alliedHP.has(other.id))record.healing+=Math.max(0,other.b.hp-alliedHP.get(other.id));}
   }
  }
  const hits=A.step(boss,active,{nav,now:clock,dt:slice});
  for(const a of active){
   const incoming=hits.filter(h=>h.targetId===a.id).map(h=>({...h,sourceId:boss.id}));
   if(!incoming.length)continue;
   const hpBefore=boss.hp;
   // A zero-time pass invokes the existing defense/fruit/talent pipeline once,
   // without advancing cooldowns, player movement or the shared AI again.
   merge(a,E.step(a.b,context(a,clock,0,incoming)));
   if(inArena(a))room.contributions[a.id].damage+=Math.max(0,hpBefore-boss.hp);
  }
 }
 return [...results.values()];
}
module.exports={step};
