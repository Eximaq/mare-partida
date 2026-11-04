const {test}=require('node:test'),assert=require('node:assert/strict'),W=require('../tools/paper-doll-96-v3/weapons.js');
test('garment order is central, deterministic and independent of load order',()=>{
 const passes=['head','boots','hair','face','torso','pants','gloves','body','cloakFront','belt'],drawn=[];
 W.composition.paint(passes.map(slot=>({slot,draw(){drawn.push(slot);}})));
 assert.deepEqual(drawn,['body','face','hair','pants','torso','boots','gloves','head']);assert(Object.isFrozen(W.composition.priorities));assert.equal(W.composition.priorities.torso,50);assert.equal(W.composition.priorities.boots,70);assert.equal(W.composition.priorities.gloves,80);
});
test('weapon depth follows its own hand and frame, not a fixed equipment priority',()=>{
 const pose={NECK:{z_index:-2},'LEFT ARM':{z_index:-6},'RIGHT ARM':{z_index:0}};
 assert.equal(W.composition.depth({pose,side:'LEFT',direction:'east'}),'back');assert.equal(W.composition.depth({pose,side:'RIGHT',direction:'east'}),'front');
 pose['LEFT ARM'].z_index=1;assert.equal(W.composition.depth({pose,side:'LEFT',direction:'east'}),'front');
 const model={depthTrack:{'attack-focus':{east:{LEFT:['back','back','front','front','front','front','back','back']}}}};
 assert.deepEqual(Array.from({length:8},(_,frame)=>W.composition.depth({model,pose,side:'LEFT',direction:'east',action:'attack-focus',frame})),['back','back','front','front','front','front','back','back']);
 assert(W.composition.handPriority('south','walk'));assert(W.composition.handPriority('east','attack-focus'));assert(W.composition.handPriority('west','attack-focus'));assert(!W.composition.handPriority('north','idle'));
});
