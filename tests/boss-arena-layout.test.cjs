'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('../world-catalog.cjs');
const exportsData=require('../world-map-exports.js');
const point=([x,y])=>({x:x*3072/1448,y:y*2304/1086});

function walk(nav,from,to,label){
  assert(nav.walkable(from.x,from.y),label+' starts on floor');
  assert(nav.walkable(to.x,to.y),label+' ends on floor');
  const actor={...from},route=nav.path(actor,to);
  assert(route.length,label+' has a connected route');
  for(const next of route){
    assert(nav.clear(actor,next),label+' avoids solids');
    nav.move(actor,next.x-actor.x,next.y-actor.y);
    assert(Math.hypot(actor.x-next.x,actor.y-next.y)<.1,label+' moves along the route');
  }
  assert(Math.hypot(actor.x-to.x,actor.y-to.y)<.1,label+' reaches the exact destination');
}

test('the shared dungeon selects the HD arena and retains its independent reward interaction',()=>{
  const w=load(),s=exportsData.get('quest-dungeons'),map=w.maps['quest-dungeons'];
  assert.equal(s.groundUrl,'assets/quest-dungeons/boss-arena/scene-hd.png');
  assert.deepEqual([map.width,map.height],[3072,2304]);
  assert.deepEqual({...map.spawn},{x:1536,y:1824});
  assert.deepEqual(s.enemySpawn,{x:1536,y:1152});
  assert.equal(map.interactions[0].id,'40420c70-1e86-493e-a829-79b42d260c18');
  const browser=require('../tools/audit_maps.cjs').loadMaps();
  assert.deepEqual(JSON.parse(JSON.stringify(map.interactions[0])),JSON.parse(JSON.stringify(browser.MareQuestDungeonWorld.chest)));
  assert.deepEqual(JSON.parse(JSON.stringify(s.enemySpawn)),JSON.parse(JSON.stringify(browser.MareQuestDungeonWorld.enemySpawn)));
  const chest=s.props.find(p=>p.id==='1cb97a09-0a88-4167-9627-1fd4b1e6ca0b');
  assert.equal(chest.spriteUrl,'assets/map-depth/objects/export-0c9aababd1dd8d975621951c.png');
  assert.deepEqual(s.chest.bounds,{x:chest.x,y:chest.y,w:chest.w,h:chest.h});
  assert.equal(map.returnPoint,undefined,'the existing return command remains the exit');
});

test('both navigation engines connect the entrance, combat flanks and reward chest',()=>{
  const w=load(),s=exportsData.get('quest-dungeons');
  assert.equal(s.spriteMode,'painted');
  for(const [kind,nav]of [['client',w.originalNavigation('quest-dungeons')],['server',w.navigation('quest-dungeons')]]){
    walk(nav,s.spawn,s.enemySpawn,kind+' boss approach');
    walk(nav,s.enemySpawn,s.chest,kind+' reward approach');
    for(const [name,p]of [['west flank',[300,530]],['east flank',[1150,530]],
      ['north floor',[724,340]],['south floor',[724,790]],['entry',[724,1015]]])
      walk(nav,s.spawn,point(p),kind+' '+name);
    const rehearsal=nav.nearest({x:s.spawn.x,y:s.spawn.y-180});
    assert(nav.walkable(rehearsal.x,rehearsal.y),kind+' private Akainu rehearsal spawn');
    assert(nav.clear(s.spawn,rehearsal),kind+' private rehearsal approach');
    assert(nav.projectileClear(s.spawn,rehearsal),kind+' private rehearsal line of sight');
  }
});

test('water, masonry, brazier feet and chest remain solid around the open fighting floor',()=>{
  const w=load();
  // Independent probes reviewed against the original painting, in native pixels.
  const blocked=[['west water',[65,575]],['east water',[1382,575]],
    ['north portcullis',[724,175]],['west bastion',[475,220]],
    ['west brazier',[130,550]],['southeast brazier',[1221,787]],
    ['southwest gate pier',[480,1030]],['southeast gate pier',[976,1030]]];
  for(const [kind,nav]of [['client',w.originalNavigation('quest-dungeons')],['server',w.navigation('quest-dungeons')]]){
    for(const [label,p]of blocked){const q=point(p);assert.equal(nav.walkable(q.x,q.y),false,kind+' '+label);}
    assert.equal(nav.walkable(1536,590),false,kind+' chest footprint');
    const left=point([100,575]),right=point([65,575]);
    assert.equal(nav.clear(left,right),false,kind+' cannot walk across the water boundary');
    assert.equal(nav.projectileClear({x:1430,y:590},{x:1640,y:590}),false,kind+' chest stops projectiles');
  }
});
