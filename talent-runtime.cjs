'use strict';
// Server adapter for the unchanged original passive hooks. Never loads browser saves.
const T=require('./talent-system.js'),U=require('./ultimate-system.js'),TC=require('./talent-combat.js');
function game(b,c){
 b.talentCooldowns??={};
 return {classId:c.classId,level:c.level||1,talentBuilds:{[c.classId]:c.build||T.empty()},talentCooldowns:b.talentCooldowns,
  get hp(){return b.hp;},set hp(v){b.hp=v;},get energy(){return b.energy;},set energy(v){b.energy=v;}};
}
function load(b){
 const raw=b.talents;if(!raw)return TC.create();
 const mobs=new Map(b.mobs.map(m=>[m.id,m])),actions=list=>(list||[]).map(a=>({...a,target:mobs.get(a.targetId)})).filter(a=>a.target);
 return {...TC.create(),...raw,seen:new Set(raw.seen),backstabbed:new Set(raw.backstabbed),queue:actions(raw.queue),ultimate:{...U.start(),...raw.ultimate,
  attackers:new Set(raw.ultimate.attackers),hitTargets:new Set(raw.ultimate.hitTargets),empathyBuffer:new Map(raw.ultimate.empathyBuffer),delayed:actions(raw.ultimate.delayed)}};
}
function save(b,rt){
 const ids=new Set(b.mobs.filter(m=>m.alive).map(m=>m.id)),keep=s=>[...s].filter(id=>ids.has(id));
 const actions=list=>list.filter(a=>a.target?.alive).map(({target,...a})=>({...a,targetId:target.id}));
 // Abort the transaction instead of silently dropping effects or running an unbounded loop.
 if(rt.queue.length+rt.ultimate.delayed.length+rt.ultimate.ricochets.length>2048||rt.ultimate.fields.length>128)throw Error('talent_runtime_limit');
 b.talents={...rt,seen:keep(rt.seen),backstabbed:keep(rt.backstabbed),queue:actions(rt.queue),ultimate:{...rt.ultimate,
  attackers:keep(rt.ultimate.attackers),hitTargets:keep(rt.ultimate.hitTargets),empathyBuffer:[...rt.ultimate.empathyBuffer].filter(([id])=>ids.has(id)),delayed:actions(rt.ultimate.delayed)}};
}
function stats(b,c,rt=load(b)){return T.applyStats(c.baseStats||c.stats,game(b,c),rt);}
function visible(hero,map,m){
 const width=960,height=570,x=Math.max(0,Math.min(hero.x-width/2,Math.max(0,(map.width||width)-width))),y=Math.max(0,Math.min(hero.y-height/2,Math.max(0,(map.height||height)-height)));
 return m.x>=x&&m.x<=x+width&&m.y>=y&&m.y<=y+height;
}
module.exports={T,U,TC,game,load,save,stats,visible};
