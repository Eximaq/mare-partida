'use strict';
const {randomUUID}=require('node:crypto'),E=require('./world-battle.cjs'),P=require('./party-rules.cjs'),behavior=require('./monster-behavior.js');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function reconcile(room,actors,{nav,now,rng}){
 if(room.kind!=='hunt')return;
 const base=E.create(room.area,{maxHP:1,maxEnergy:1},now,rng).mobs,desired=P.population(base.length,actors.length);
 room.respawns??={};room.nextSlot??=0;
 // Retire only idle extras; combatants and pending impacts are never erased.
 for(const m of room.mobs.slice().reverse())if(room.mobs.filter(m=>m.alive||room.respawns[m.spawnId]>now).length>desired&&m.partyExtra&&!m.engaged&&!m.returning&&!m.dungeonAttack&&!m.telegraph&&!actors.some(a=>a.b.targetId===m.id||a.b.pending?.targetId===m.id))room.mobs.splice(room.mobs.indexOf(m),1);
 let budget=2;
 const safe=p=>nav.walkable(p.x,p.y)&&actors.every(a=>distance(p,a.hero)>=64)&&room.mobs.filter(m=>m.alive).every(m=>distance(p,m)>=44);
 for(const template of base){if(!budget)break;const old=room.mobs.find(m=>m.spawnId===template.spawnId);if(old?.alive||room.respawns[template.spawnId]>now||!safe(template))continue;if(old)room.mobs.splice(room.mobs.indexOf(old),1);room.mobs.push(template);budget--;}
 for(const old of room.mobs.filter(m=>!m.alive&&m.partyExtra&&room.respawns[m.spawnId]<=now)){if(!budget)break;const p={x:old.anchorX,y:old.anchorY};if(!safe(p))continue;Object.assign(old,{...structuredClone(base[room.nextSlot++%base.length]),...p,anchorX:p.x,anchorY:p.y,id:randomUUID(),spawnId:old.spawnId,partyExtra:true});budget--;}
 while(budget>0&&room.mobs.length<desired&&base.length){let added=false;for(let n=0;n<base.length*12&&!added;n++){const template=base[(room.nextSlot+n)%base.length],angle=(n%12)*Math.PI/6,goal={x:template.anchorX+Math.cos(angle)*96,y:template.anchorY+Math.sin(angle)*96};if(!safe(goal)||!nav.projectileClear(template,goal))continue;room.mobs.push({...structuredClone(template),...goal,anchorX:goal.x,anchorY:goal.y,id:randomUUID(),spawnId:'party:'+room.id+':'+room.nextSlot++,partyExtra:true});added=true;budget--;}if(!added)break;}
 if(actors.length&&room.hunts){
  const generated={area:room.area,hunts:room.hunts,mobs:room.mobs.slice()};
  for(const a of actors)E.populate(generated,now,rng,a.hero);
  for(const m of generated.mobs)if(m.type==='boss'&&m.alive&&!room.mobs.some(old=>old.spawnId===m.spawnId&&old.alive)&&!(room.respawns[m.spawnId]>now)&&safe(m)){room.mobs=room.mobs.filter(old=>old.spawnId!==m.spawnId);room.mobs.push(m);}
 }
 room.density=1+actors.length*.2;
}
function step(room,actors,{nav,now,dt,rng,populate=true}){
 if(!Number.isFinite(dt)||dt<0||dt>1)throw new RangeError('Invalid party step');
 const active=actors.filter(a=>a.connected),results=active.map(a=>({id:a.id,kills:[],potionsUsed:0,talentSteals:[]}));
 if(populate)reconcile(room,active,{nav,now,rng});
 let left=dt,clock=now-dt*1000;
 while(left>1e-9){const slice=Math.min(.05,left);left-=slice;clock+=slice*1000;
  const owners=new Map();for(const m of room.mobs.filter(m=>m.alive)){let focus=(m.dungeonAttack||m.telegraph)&&active.find(a=>a.id===m.partyTargetId&&a.b.hp>0);focus??=active.filter(a=>a.b.hp>0).sort((a,b)=>distance(a.hero,m)-distance(b.hero,m)||a.id.localeCompare(b.id))[0]||active[0];if(focus){m.partyTargetId=focus.id;owners.set(m.id,focus.id);}}
  for(const [i,a] of active.entries()){
   a.b.mobs=room.mobs;const result=E.step(a.b,{...a,nav,hero:a.hero,now:clock,dt:slice,rng,potions:Math.max(0,(a.potions||0)-results[i].potionsUsed),shared:{owns:m=>owners.get(m.id)===a.id}});
   results[i].kills.push(...result.kills);results[i].potionsUsed+=result.potionsUsed;results[i].talentSteals.push(...result.talentSteals);
   for(const k of result.kills){k.killerId=a.id;if(room.kind==='hunt'){room.respawns??={};room.respawns[k.monster.spawnId]=clock+behavior.RESPAWN_MS;room.hunts=E.hunt.recordKill({hunts:room.hunts},room.area,k.monster.type,clock).state.hunts;room.hunts.areas[room.area].respawns[k.monster.spawnId]=clock+behavior.RESPAWN_MS;}}
  }
 }
 return results;
}
module.exports={step,reconcile};
