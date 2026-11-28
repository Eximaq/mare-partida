import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const W=require('../../world-catalog.cjs').load();
const E=require('../../world-battle.cjs');
const B=require('../../monster-behavior.js');
const before='0c6dbd3c8a12bb2e1958e830b6bdf3149be9cb911f976f7722ff11d99867b8c0';
const expected=[['skypiea-01',75,'satori',77],['skypiea-02',80,'shura',84],['skypiea-03',85,'gendatsu',88],['skypiea-04',90,'ohm',95]] as const;
const stats={maxHP:100,maxEnergy:100};

test('server resolves four separate Skypiea IDs, tier gates and ordinary authored opponents',()=>{
 const all=new Set<string>();
 for(const [id,min,type,level] of expected){
  const island=W.islands.find((row:any)=>row.id===id);
  assert(island,id);
  assert.equal(island.minLevel,min);
  assert.equal(W.mapId(island.area),id);
  const n=W.navigation(id),spawn=n.map.spawn;
  assert.deepEqual([n.map.id,n.map.width,n.map.height],[id,4608,3072]);
  assert.deepEqual([spawn.x,spawn.y],[534,2604]);
  assert(n.walkable(spawn.x,spawn.y),id+': blocked arrival');
  assert.equal(E.hunt.get(id).boss,null);
  const b=E.create(id,stats,100000,()=>.5),slots=B.slots(id);
  assert.equal(slots.length,6);
  assert.equal(b.mobs.length,slots.length);
  for(const s of slots){
   assert(!all.has(s.id)&&s.id.startsWith(id+'-'),s.id);
   all.add(s.id);assert.equal(s.boss,undefined);assert.equal(s.type,type);
   const mob=b.mobs.find((m:any)=>m.spawnId===s.id);
   assert.deepEqual([mob.source,mob.type,mob.level,mob.x,mob.y],['world',type,level,s.x,s.y]);
   assert(n.walkable(s.x,s.y)&&n.path(spawn,s).length>0,id+': unreachable '+s.id);
  }
 }
 for(let i=0;i<6;i++)assert(all.has('skypiea-01-'+i),'lost sleep/respawn identity '+i);
});

test('exact predecessor migrates selected geometry and three empty ledgers without resetting progression',()=>{
 const now=100000,id='skypiea-01',b=E.create(id,stats,now,()=>.5),m=b.mobs[0],slot=B.slots(id)[0];
 b.rulesHash=before;b.hp=43;b.energy=37;
 b.hunts.areas[id].kills=17;b.hunts.areas[id].respawns['skypiea-01-5']=now+10000;
 for(const [d] of expected.slice(1))delete b.hunts.areas[d];
 Object.assign(m,{x:910,y:1232,anchorX:912,anchorY:1232,hp:9,engaged:true,telegraph:{fixture:true}});
 b.targetId=m.id;b.pending={targetId:m.id};b.auto=true;b.projectiles=[{}];
 const oldId=m.id;
 E.upgradeBalance(b);
 assert.equal(b.rulesHash,E.rulesHash);
 assert.deepEqual([m.id,m.hp,m.x,m.y,m.anchorX,m.anchorY,m.engaged,m.telegraph],[oldId,9,slot.x,slot.y,slot.x,slot.y,false,null]);
 assert.deepEqual([b.hp,b.energy,b.hunts.areas[id].kills,b.hunts.areas[id].respawns['skypiea-01-5']],[43,37,17,now+10000]);
 assert.equal(b.pending,null);assert.equal(b.auto,false);assert.equal(b.targetId,null);assert.deepEqual(b.projectiles,[]);
 for(const [d,,type,level] of expected.slice(1)){
  assert.deepEqual(b.hunts.areas[d],{kills:0,bosses:0,firstRewardClaimed:false,bossReadyAt:0,respawns:{}});
  E.changeArea(b,d,now,()=>.5);
  assert(b.mobs.length&&b.mobs.every((m:any)=>m.type===type&&m.level===level));
 }
 const unaffected=E.create('beach',stats,now,()=>.5);unaffected.rulesHash=before;
 const exact=structuredClone(unaffected.mobs);
 E.upgradeBalance(unaffected);
 assert.deepEqual(unaffected.mobs,exact);
 const unknown=E.create(id,stats,now,()=>.5);unknown.rulesHash='f'.repeat(64);
 const unaltered=structuredClone(unknown);
 E.upgradeBalance(unknown);
 assert.deepEqual(unknown,unaltered);
});

test('old shared party slots are projected once while keeping ordinary and bonus enemies',()=>{
 const area='skypiea-01',nav=W.navigation(area);
 const base={id:'base',source:'world',spawnId:'skypiea-01-0',type:'satori',district:'sky-0',hp:11,x:912,y:1232,anchorX:912,anchorY:1232,engaged:true};
 const extra={...base,id:'extra',spawnId:'party:room:0',partyExtra:true,hp:7,x:1008,anchorX:1008};
 const mobs=[base,extra];
 assert.equal(E.reanchorSkypieaMobs(area,mobs,nav),true);
 assert.deepEqual(mobs.map(m=>[m.id,m.hp,m.engaged]),[['base',11,false],['extra',7,false]]);
 for(const m of mobs)assert(nav.walkable(m.x,m.y)&&nav.path(nav.map.spawn,m).length>0);
 const saved=structuredClone(mobs);
 assert.equal(E.reanchorSkypieaMobs(area,mobs,nav),false);
 assert.deepEqual(mobs,saved);
});
