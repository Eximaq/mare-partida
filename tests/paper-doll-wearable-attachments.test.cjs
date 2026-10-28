'use strict';
const assert=require('node:assert/strict'),{create}=require('../paper-doll.js');
const directions=['south','north','west','east'],animation={frames:4,fps:4,loop:true,directions};
const rig={id:'wearable-test',frameWidth:84,frameHeight:84,pivotX:42,pivotY:65,scale:1,requiredSlots:['body'],animations:{idle:animation}};
const images=new Map([['body.png',{complete:true,naturalWidth:336,naturalHeight:336}],['gear.png',{complete:true,naturalWidth:4,naturalHeight:3}]]);
const runtime=create({getImage:url=>images.get(url),validatePixels:()=>null});runtime.registerRig(rig);
runtime.registerPiece({id:'body',slot:'body',rigId:rig.id,approved:true,available:true,animations:{idle:{...animation,url:'body.png',frameWidth:84,frameHeight:84}}});
function piece(slot){return {id:'test-'+slot,slot,rigId:rig.id,approved:true,available:true,animations:{idle:{...animation,kind:'rigid-attachment',url:'gear.png',frameWidth:84,frameHeight:84,source:{width:4,height:3,anchorX:1,anchorY:2},sockets:Object.fromEntries(directions.map(d=>[d,[0,1,2,3].map(i=>({x:30+i,y:25}))]))}}};}
const pose={animationId:'idle',direction:'south',frameIndex:2};
for(const slot of ['head','eyewear','necklace','belt','ring','charm','boots','gloves']){
 const p=piece(slot);runtime.registerPiece(p);const plan=runtime.resolve({rigId:rig.id,pieces:{body:'body',[slot]:p.id}},pose);
 assert(plan.valid,`${slot}: ${JSON.stringify(plan.missing)}`);const layer=plan.layers.find(l=>l.slot===slot);assert.equal(layer.offsetX,31);assert.equal(layer.offsetY,23);assert.equal(layer.frameIndex,2);
}
const glasses=piece('eyewear');glasses.animations.idle.occludedFrames={north:[0,1,2,3]};runtime.registerPiece(glasses);
const look={rigId:rig.id,pieces:{body:'body',eyewear:glasses.id}};
for(let frameIndex=0;frameIndex<4;frameIndex++){
 const back=runtime.resolve(look,{...pose,direction:'north',frameIndex});assert(back.valid);assert.deepEqual(back.layers.map(l=>l.slot),['body'],'glasses never draw on the back of the skull');
 assert.equal(runtime.resolve(look,{...pose,frameIndex}).layers.length,2);
}
for(const value of [null,[],{north:[4]},{north:[1,1]},{south:[-1]},{diagonal:[0]}]){
 const bad=structuredClone(glasses);bad.animations.idle.occludedFrames=value;runtime.registerPiece(bad);assert(runtime.resolve(look,pose).missing.some(x=>x.code==='invalid-occlusion'));
}
for(const slot of ['body','pants','outfit','cloak']){
 const p=piece(slot);runtime.registerPiece(p);assert(runtime.resolve({rigId:rig.id,pieces:{body:'body',[slot]:p.id}},pose).missing.some(x=>x.code==='invalid-attachment-source'),'cloth/anatomy still require real animation');
}
runtime.registerPiece({id:'body',slot:'body',rigId:rig.id,approved:true,available:true,animations:{idle:{...animation,url:'body.png',frameWidth:84,frameHeight:84}}});
for(const slot of ['boots','gloves']){
 const p=piece(slot),clip=p.animations.idle;clip.secondarySockets=Object.fromEntries(directions.map(d=>[d,[0,1,2,3].map(i=>i===3?null:{x:45+i,y:25,quarterTurns:1})]));
 runtime.registerPiece(p);const config={rigId:rig.id,pieces:{body:'body',[slot]:p.id}};
 assert.equal(runtime.resolve(config,pose).layers.filter(l=>l.slot===slot).length,2);
 assert.equal(runtime.resolve(config,{...pose,frameIndex:3}).layers.filter(l=>l.slot===slot).length,1,'a covered far hand/foot is explicit');
 clip.secondarySockets.north[1]={x:999,y:0};runtime.registerPiece(p);assert(runtime.resolve(config,pose).missing.some(x=>x.code==='invalid-secondary-socket'),'bad off-screen sockets reject the whole clip');
}
const rotated=piece('eyewear');rotated.animations.idle.sockets.south[0].quarterTurns=1;runtime.registerPiece(rotated);assert(runtime.resolve(look,pose).missing.some(x=>x.code==='invalid-transform'),'head accessories cannot rotate anatomy');
console.log('Wearable attachments: measured sockets, full back-view occlusion, paired feet/hands and strict anatomy/geometry guards passed.');
