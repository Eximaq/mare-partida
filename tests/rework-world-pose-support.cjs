'use strict';
const assert=require('node:assert/strict');
async function prepareWorldPose(lobby,player,action,direction){
 const request=lobby.requestWorldVisual(player,{action,direction,consumer:'world'});
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
module.exports={prepareWorldPose,walkingTrousers};
