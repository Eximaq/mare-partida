'use strict';
const assert=require('node:assert/strict');
const {create}=require('../paper-doll.js');
const images={'body.png':{complete:true,naturalWidth:168,naturalHeight:84},'blade.png':{complete:true,naturalWidth:64,naturalHeight:64}};
const drawn=[];
const engine=create({getImage:url=>images[url],validatePixels:()=>null,createCanvas:(width,height)=>({width,height,getContext:()=>({drawImage:(image)=>drawn.push(image),save(){},restore(){},translate(){},rotate(){}})})});
const rig={id:'paired',frameWidth:84,frameHeight:84,pivotX:42,pivotY:65,scale:1,requiredSlots:['body','weapon'],animations:{idle:{frames:2,fps:4,loop:true,directions:['south']}}};
engine.registerRig(rig);
const clip={...rig.animations.idle,frameWidth:84,frameHeight:84,url:'body.png'};
engine.registerPiece({id:'body',slot:'body',rigId:rig.id,approved:true,animations:{idle:clip}});
const weapon={id:'daggers',slot:'weapon',rigId:rig.id,approved:true,animations:{idle:{...clip,url:'blade.png',kind:'rigid-attachment',source:{width:64,height:64,anchorX:20,anchorY:36},offsetX:2,offsetY:3,sockets:{south:[{x:30,y:50},{x:31,y:51}]},secondarySockets:{south:[{x:55,y:49,quarterTurns:1},null]}}}};
const appearance={rigId:rig.id,pieces:{body:'body',weapon:'daggers'}},pose={animationId:'idle',direction:'south',frameIndex:0};
engine.registerPiece(weapon);
let result=engine.resolve(appearance,pose);assert(result.valid);
let hands=result.layers.filter(l=>l.slot==='weapon');assert.equal(hands.length,2);
assert.deepEqual(hands.map(l=>[l.offsetX,l.offsetY,l.quarterTurns]),[[12,17,0],[30,32,1]]);
assert.equal(hands[0].image,hands[1].image,'paired blades reuse pixels, not body animation');
assert.equal(engine.resolve(appearance,{...pose,frameIndex:1}).layers.filter(l=>l.slot==='weapon').length,1,'occluded far hand is explicitly absent');
assert(engine.draw({save(){},restore(){},drawImage(){}},appearance,pose,42,65,{hidden:['weapon']}));
assert.deepEqual(drawn,[images['body.png']],'hiding the slot removes both hands');
const ctx={save(){},restore(){},drawImage(){}};
assert(engine.draw(ctx,appearance,pose,42,65));
const before=drawn.length;assert(engine.draw(ctx,appearance,pose,42,65));assert.equal(drawn.length,before,'paired composition is cached');
const shifted=structuredClone(weapon);shifted.animations.idle.secondarySockets.south[0].x=56;engine.registerPiece(shifted);
assert(engine.draw(ctx,appearance,pose,42,65));assert(drawn.length>before,'changing only the far hand invalidates the composition');
engine.registerPiece(weapon);
for(const mutate of [
 p=>p.animations.idle.secondarySockets.south.pop(),
 p=>delete p.animations.idle.secondarySockets.south,
 p=>p.animations.idle.secondarySockets.south[1]={x:Infinity,y:40},
 p=>p.animations.idle.secondarySockets.south[1]={x:40,y:-1},
 p=>p.animations.idle.secondarySockets.south[1]={x:40,y:40,quarterTurns:4},
 p=>p.animations.idle.secondarySockets.east=[null,null],
 p=>p.animations.idle.secondarySockets=[],
 p=>p.animations.idle.kind=undefined
]){
 const bad=structuredClone(weapon);mutate(bad);engine.registerPiece(bad);
 assert(engine.resolve(appearance,pose).missing.some(m=>m.code==='invalid-secondary-socket'),'invalid unselected frames also reject the whole piece');
}
engine.registerPiece(weapon);
const hair={...structuredClone(weapon),id:'hair',slot:'hair'};engine.registerPiece(hair);
assert(engine.resolve({...appearance,pieces:{...appearance.pieces,hair:'hair'}},pose).missing.some(m=>m.code==='invalid-secondary-socket'));
console.log('Paired weapons: independent hand anchors/rotations, shared art, explicit occlusion, hide both and atomic validation passed.');
