const assert=require('node:assert/strict');
const P=require('../prison-system.js'),F=require('../forge-system.js');
const defs=[{name:'Sabre',slot:'weapon',type:'sword',rarity:'common',attack:8,defense:2,hp:10},...F.pearls.map(p=>({name:p.name,kind:'pearl',pearlId:p.id,slot:'pearl',rarity:p.rarity})),...P.boxes];
const boxDef=level=>defs.findIndex(d=>d.kind==='pearl-box'&&d.boxLevel===level);
const seed=()=>({name:'Nauta',classId:'sword',gold:120,materials:4,inventory:[],equipment:{weapon:null},forgeSeq:0,stats:{kills:9}});
const snap=v=>JSON.stringify(v);
let tests=0;
function test(name,run){run();tests++;console.log(name+': passed');}
test('All 100 floors, compounded power scaling',()=>{
 for(let f=1;f<=100;f++)assert.equal(P.multiplier(f),1.30**(f-1));
 for(const f of [0,101,1.5,NaN,'1',undefined])assert.throws(()=>P.multiplier(f));
 const base={hp:100,atk:20,def:10,speed:5,xp:12};assert.deepEqual(P.scaleMonster(base,1),{hp:100,atk:20,def:10,speed:5,xp:12});
 assert.deepEqual(P.scaleMonster(base,100),{hp:Math.round(100*1.30**99),atk:Math.round(20*1.30**99),def:Math.round(10*1.30**99),speed:5,xp:12});assert.equal(base.hp,100);
 assert.throws(()=>P.scaleMonster({hp:-1,atk:2,def:3},1));
});
test('Explicitly disabled system rejects entrance, victories and reward claims',()=>{
 const g=seed(),before=snap(g),P=require('../prison-system.js').createSystem();assert.equal(P.available,false);
 for(let f=1;f<=100;f++){assert.equal(P.canEnter(g,f),false);assert.equal(P.completeFloor(g,f,true,defs).ok,false);}
 assert.equal(P.claimMilestone(g,5,defs).ok,false);assert.equal(snap(g),before);
});
test('Sequential victory only, exactly ten first-clear rewards through floor 100',()=>{
 const active=P.createSystem({available:true});let g=seed();
 for(let f=1;f<=100;f++){
  const before=snap(g);assert.equal(active.completeFloor(g,f+1,true,defs).ok,false);assert.equal(active.completeFloor(g,f,false,defs).ok,false);
  const result=active.completeFloor(g,f,true,defs);assert(result.ok);assert.equal(snap(g),before);g=result.state;
  assert.equal(g.impelDown.cleared,f);assert.equal(active.completeFloor(g,f,true,defs).ok,false);
  if(f%5===0&&f<=50)assert.equal(active.claimMilestone(g,f,defs).ok,false);
 }
 assert.equal(g.inventory.length,10);assert.deepEqual(g.impelDown.claimed,P.milestones);
 assert(g.inventory.every(i=>defs[i.def].boxLevel===1));assert.equal(active.canEnter(g,101),false);
 assert.equal(P.rewardFor(55),null);assert.equal(P.rewardFor(100),null);
});
test('Full bag keeps floor victory and pending milestone; retry grants exactly once',()=>{
 const active=P.createSystem({available:true}),g=seed();g.impelDown={cleared:4,claimed:[]};g.inventory=Array.from({length:120},(_,i)=>({id:'gear'+i,def:0}));
 const result=active.completeFloor(g,5,true,defs);assert(result.ok&&result.rewardPending);assert.equal(result.state.impelDown.cleared,5);assert.deepEqual(result.state.impelDown.claimed,[]);
 assert.equal(active.claimMilestone(result.state,5,defs).ok,false);result.state.inventory.pop();
 const grant=active.claimMilestone(result.state,5,defs);assert(grant.ok);assert.equal(grant.state.inventory.length,120);assert.equal(active.claimMilestone(grant.state,5,defs).ok,false);
});
test('Box levels 1–3 draw all five matching pearl attributes and replace one item',()=>{
 for(const level of [1,2,3])for(let n=0;n<5;n++){
  const g=seed();g.inventory=[{id:'box',def:boxDef(level),locked:false},{id:'kept',def:0}];const before=snap(g);
  const result=P.openBox(g,'box',defs,()=>n/5,123);assert(result.ok);assert.equal(snap(g),before);
  assert.equal(F.pearlOf(result.item,defs).level,level);assert.equal(F.pearlOf(result.item,defs).attribute,F.keys[n]);
  assert.equal(result.state.inventory.length,2);assert.deepEqual(result.state.inventory[1],g.inventory[1]);
  for(const k of ['gold','materials','stats','equipment'])assert.deepEqual(result.state[k],g[k]);
  assert.equal(P.openBox(result.state,'box',defs).ok,false);
 }
});
test('Locked/missing boxes, bad RNG, duplicate identities and missing catalog cannot consume',()=>{
 const g=seed();g.inventory=[{id:'box',def:boxDef(1),locked:true}];const before=snap(g);
 assert.equal(P.openBox(g,'box',defs).ok,false);assert.equal(snap(g),before);g.inventory[0].locked=false;
 const snapshot=snap(g);for(const roll of [-1,1,NaN,Infinity])assert.equal(P.openBox(g,'box',defs,()=>roll).ok,false);
 assert.equal(P.openBox(g,'box',defs,()=>{throw Error('RNG');}).ok,false);
 assert.equal(P.openBox(g,'missing',defs).ok,false);assert.equal(P.openBox(g,'box',defs.filter(d=>d.kind!=='pearl')).ok,false);assert.equal(snap(g),snapshot);
 g.inventory.push({...g.inventory[0]});assert.equal(P.openBox(g,'box',defs).ok,false);
});
test('A full bag can open a box since it is a one-to-one replacement',()=>{
 const g=seed();g.inventory=Array.from({length:120},(_,n)=>({id:'id'+n,def:n===0?boxDef(1):0}));
 const r=P.openBox(g,'id0',defs,()=>.99999);assert(r.ok);assert.equal(r.state.inventory.length,120);assert.equal(r.item.pearlId,'pearl_esp_1');
});
test('Consumable boxes give no equipment stats and cannot enter forge operations',()=>{
 const g=F.migrate(seed(),defs),box={id:'box',def:boxDef(1),level:1,locked:false};g.inventory=[box];
 assert.equal(F.isGear(box,defs),false);assert.equal(F.itemStats(box,defs).attack,0);assert.equal(F.normalizeItem(box,defs).sockets,undefined);
 for(const type of ['upgrade','reforge','imbue','remove'])assert.equal(F.execute(g,{type,itemId:'box',expectedSeq:0},defs).ok,false);
 g.inventory=Array.from({length:5},(_,n)=>({...box,id:'b'+n,rarity:'common'}));assert(F.equipmentFusion(g,g.inventory.map(i=>i.id),'weapon',defs).error);
});
test('Migration is idempotent, preserves pearls/equipment and never grants supply',()=>{
 const g=seed();g.inventory=[{id:'old-pearl',def:1,pearlId:'pearl_for_1'}];const before=snap(g),a=P.migrate(g);
 assert.equal(snap(g),before);assert.equal(a.impelDown.cleared,0);assert.deepEqual(a.inventory,g.inventory);assert.deepEqual(P.migrate(a),a);
});
test('World monsters including bosses cannot create pearls, gems or boxes',()=>{
 for(const source of ['world','boss','beach','swamp','common-monster'])for(const kind of ['pearl','gem','pearl-box'])assert.equal(P.canDrop(kind,source),false);
 for(const kind of ['pearl','gem','pearl-box'])assert.equal(P.canDrop(kind,'impel-down'),true);
 assert.equal(P.canDrop('equipment','world'),true);
});
test('Only completed floors and the next floor can be inspected, capped at 100',()=>{
 const g=seed();assert.equal(P.unlockedThrough(g),1);assert(P.canInspect(g,1));assert(!P.canInspect(g,2));
 g.impelDown={cleared:9,claimed:[]};assert(P.canInspect(g,9));assert(P.canInspect(g,10));assert(!P.canInspect(g,11));
 g.impelDown.cleared=100;assert.equal(P.unlockedThrough(g),100);assert(!P.canInspect(g,101));
});
test('Phase presentation exposes final monster data without balancing factors',()=>{
 const catalog={bandit:{name:'Corsário',hp:67,atk:10,def:5},spirit:{name:'Sentinela',hp:52,atk:12,def:3},boss:{name:'Guardião',hp:350,atk:17,def:10}};
 const first=P.floorDetails(1,catalog);assert.equal(first.waves,1);assert.equal(first.total,1);assert.equal(first.monsters[0].hp,67);assert.equal(first.monsters[0].attack,10);
 assert(first.monsters.every(m=>m.level===1&&m.quantity>0));assert.equal(P.floorDetails(10,catalog).boss,true);
 assert.equal(P.floorDetails(10,catalog).monsters[0].id,'boss');assert(!/multiplier|factor|scale/.test(JSON.stringify(first)));assert.equal(catalog.bandit.hp,67);
 assert.equal(P.floorDetails(1,{}).monsters.length,0);
});
test('Ascent preferences persist and determine the next action only when available',()=>{
 const active=P.createSystem({available:true}),g=seed();g.impelDown={cleared:8,claimed:[],options:{autoAdvance:true,pauseBeforeBoss:true}};
 let result=active.completeFloor(g,9,true,defs);assert(result.ok);assert.deepEqual(result.next,{floor:10,autoEnter:false});
 g.impelDown.options.pauseBeforeBoss=false;result=active.completeFloor(g,9,true,defs);assert.deepEqual(result.next,{floor:10,autoEnter:true});
 g.impelDown.options.autoAdvance=false;result=active.completeFloor(g,9,true,defs);assert.equal(result.next.autoEnter,false);
 assert.deepEqual(P.nextAction(g),{floor:9,autoEnter:false});assert.deepEqual(P.migrate(P.migrate(g)),P.migrate(g));
});
console.log(tests+' prison/drop/box groups passed.');
