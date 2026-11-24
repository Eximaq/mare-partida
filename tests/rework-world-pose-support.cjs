'use strict';
const assert=require('node:assert/strict');
async function prepareWorldPose(lobby,player,action,direction){
 const request=lobby.requestWorldVisual(player,{action,direction,consumer:'world'});
 const pending=lobby.worldVisual();
 if(pending.state==='loading'){
  assert.equal(pending.key,request.key);assert.equal(pending.publishedKey,undefined);
  assert.deepEqual(pending.coverage,[]);
 }
 await request.promise;
 const visual=lobby.worldVisual();
 assert.equal(visual?.state,'ready',JSON.stringify(visual));
 assert.equal(visual.publishedKey,request.key);
 assert.equal(visual.coverage.length,1);
 const [entry]=visual.coverage;
 assert.equal(entry.action,action);assert.equal(entry.direction,direction);
 return entry;
}
async function walkingTrousers(lobby,player,item,direction){
 const pose=await prepareWorldPose(lobby,player,'walk',direction);
 const route=pose.slotRoutes?.legs;
 assert.deepEqual(pose.omitted,[]);
 assert.equal(route?.item,item);assert.equal(route.quality,'hd');
 // The map uses the fitted donor on the current walk rig. Its own cycle is
 // inspected separately through the original native selector and frame map.
 const donor='female-pants'+item+(item===168?'-walk-':'-sword-walk-')+direction;
 assert.equal(route.source,donor);return pose;
}
async function equippedWorldPose(lobby,player,action,direction){
 const entry=await prepareWorldPose(lobby,player,action,direction);
 assert.deepEqual(entry.omitted,[],action+'/'+direction+' '+JSON.stringify(player.equipment));
 for(const [slot,item] of Object.entries(player.equipment)){
  if(item==null)continue;
  const route=entry.slotRoutes?.[slot];
  assert.equal(route?.item,item.def??item,slot+' in '+action+' '+direction);
  assert.equal(route.quality,'hd');assert(route.source);
 }
 return entry;
}
function assertWalkingEquipment(api,player,direction){
 const catalog=require('../tools/paper-doll-96-v3/weapons.json');
 const r=require('../paper-doll-96-lobby.js').selectWorldHDOnly(api,catalog,player,{consumer:'world',action:'walk',direction});
 assert.deepEqual(r.omitted,[]);
 for(const [slot,item] of Object.entries(player.equipment)){
  const route=r.slotRoutes[slot];assert.equal(route.item,item.def??item);assert.equal(route.quality,'hd');assert(route.source);
 }
 return r;
}
module.exports={prepareWorldPose,walkingTrousers,equippedWorldPose,assertWalkingEquipment};
