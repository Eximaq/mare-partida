const assert=require('node:assert/strict');
require('../island-world.js');
require('../world-system.js');
const {maps,Camera,Navigation}=globalThis.MareWorld;
let checks=0;
for(const map of Object.values(maps)){
  const nav=new Navigation(map);
  assert(nav.walkable(map.spawn.x,map.spawn.y));checks++;
  for(const o of map.colliders){assert(!nav.walkable(o.x+o.w/2,o.y+o.h/2),o.id);checks++;}
  for(const goal of map.navigationGoals||[{x:map.width-30,y:map.height-30},{x:map.width-30,y:30},{x:map.spawn.x,y:30}]){
    const path=nav.path(map.spawn,goal);assert(path.length,'distant reachable destination');
    const actor={...map.spawn,facing:1};let frames=0;
    while(path.length&&frames++<6000){nav.follow(actor,path,158,1/30);assert(nav.walkable(actor.x,actor.y),'path crossed solid geometry');}
    assert(frames<6000);assert(Math.hypot(actor.x-goal.x,actor.y-goal.y)<1);checks++;
  }
  // A tall barrier must be routed around, and a closed chamber must fail cleanly.
  const synthetic=new Navigation({width:600,height:500,colliders:[{x:270,y:80,w:70,h:330}]});
  const path=synthetic.path({x:180,y:240},{x:440,y:240});assert(path.length>1);checks++;
  const closed=new Navigation({width:600,height:500,colliders:[{x:270,y:0,w:70,h:500}]});
  assert.equal(closed.path({x:180,y:240},{x:440,y:240}).length,0);checks++;
  const camera=new Camera();camera.width=683;camera.height=384;
  for(const hero of [{x:10,y:10},{x:map.width-10,y:map.height-10},map.spawn]){
    camera.update(hero,map,1,true);
    assert(camera.x>=0&&camera.y>=0&&camera.x+camera.width<=map.width&&camera.y+camera.height<=map.height);
    const screen=camera.worldToScreen(hero.x,hero.y),world=camera.screenToWorld(screen.x,screen.y);
    assert.deepEqual(world,hero);checks++;
  }
}
console.log(`${checks} world/navigation/camera assertions passed`);
