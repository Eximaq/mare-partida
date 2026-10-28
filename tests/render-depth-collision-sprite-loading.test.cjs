const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

globalThis.Image=class {constructor(){this.complete=true;this.naturalWidth=3840;}};
require('../lobby-map-data.js');
const lobby=require('../lobby-world.js');
require('../world-system.js');
const {Navigation}=globalThis.MareWorld;

test('Lobby legacy foreground delegates to the same transparent-object renderer',()=>{
  const calls=[],regions=[{id:'house'},{id:'tree'}],actors=[{x:1400,y:1070}],ctx={};
  globalThis.MareWorldDepth={regions(id){assert.equal(id,'lobby');return regions;},draw(...args){calls.push(args);}};
  try { lobby.foreground(ctx,actors);assert.deepEqual(calls,regions.map(r=>[ctx,r,actors])); } finally { delete globalThis.MareWorldDepth; }
});

test('feet collide with houses, stall, chests, barrels, trees, water, and boundaries',()=>{
  const nav=new Navigation(lobby.map,32,10);
  for(const name of ['west-house','east-house','forge-house','market-house','dock-house','market-stall','forge-chest-west','forge-chest-east','dock-barrels-west','south-tree']){
    const o=lobby.colliders.find(c=>c.id===name);
    assert(o,name+' exists');assert.equal(nav.walkable(o.x+o.w/2,o.y+o.h/2),false,name);
  }
  assert.equal(nav.walkable(5,5),false,'map boundary');
  assert.equal(nav.walkable(100,100),false,'ocean');
  assert.equal(nav.walkable(lobby.spawn.x,lobby.spawn.y),true,'road remains traversable');
  const house=lobby.colliders.find(c=>c.id==='west-house');
  const actor={x:house.x+house.w/2,y:house.y+house.h+34};
  assert.equal(nav.walkable(actor.x,actor.y),true);
  for(let n=0;n<30;n++)nav.move(actor,0,-4);
  assert(actor.y>=house.y+house.h+9,'movement stops at physical base');
});

test('dedicated character art remains selected during loading and failure',()=>{
  const {create}=require('../combat-registry.js');
  const animation=require('../combat-animation.js');
  let ready=false;
  const sprites={assets:{current:{meta:{production_approved:true,animations:{'combat-idle':{frames:4,fps:5,loop:true}}},sheets:{'combat-idle':{complete:false,naturalWidth:0}}}},ensure(){},draw(){return ready;}};
  const registry=create({sprites,animation});
  registry.register({classId:'sword',factionId:'pirate',assetId:'current'});
  const papacapim={name:'Papacapim',classId:'sword',factionId:'pirate'};
  assert.equal(registry.entry(papacapim).assetId,'current');
  assert(registry.asset(papacapim),'loading does not change identity');
  assert.equal(registry.draw({},papacapim,0,0,{action:'combat-idle'}),false);
  sprites.assets.current.sheets['combat-idle']={complete:true,naturalWidth:0};
  assert(registry.asset(papacapim),'failed load does not change identity');
  ready=true;assert.equal(registry.draw({},papacapim,0,0,{action:'combat-idle'}),true);
  const source=fs.readFileSync(require.resolve('../game.js'),'utf8');
  assert(source.includes('classCombat.entry(game)'),'world chooses configured identity');
  assert(!source.includes('assets/sprites/'),'legacy base sprites are never requested');
});
