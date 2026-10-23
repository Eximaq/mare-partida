'use strict';
const assert=require('node:assert/strict');
const {create}=require('../paper-doll.js');
const rig={id:'occlusion-test',frameWidth:2,frameHeight:2,pivotX:1,pivotY:2,scale:1,requiredSlots:['body','weapon'],animations:{attack:{frames:3,fps:12,loop:false,directions:['north']}}};
const images=new Map();
function sheet(visible){
 const data=new Uint8ClampedArray(6*2*4);
 for(const frame of visible){const i=frame*2*4;data[i]=90+frame;data[i+3]=255;}
 return {complete:true,naturalWidth:6,naturalHeight:2,data};
}
images.set('body',sheet([0,1,2]));images.set('weapon',sheet([0,2]));
function canvas(width,height){let image;return {width,height,getContext:()=>({drawImage(value){image=value;},getImageData:()=>({data:image.data})})};}
const runtime=create({getImage:url=>images.get(url),createCanvas:canvas});runtime.registerRig(rig);
const piece=slot=>({id:slot,rigId:rig.id,slot,available:true,approved:true,animations:{attack:{url:slot,kind:'sheet',frameWidth:2,frameHeight:2,frames:3,fps:12,loop:false,directions:['north']}}});
const body=piece('body'),weapon=piece('weapon');runtime.registerPiece(body);runtime.registerPiece(weapon);
const look={rigId:rig.id,pieces:{body:'body',weapon:'weapon'}},pose={animationId:'attack',direction:'north',frameIndex:1};
assert.equal(runtime.resolve(look,pose).missing[0].code,'empty-frame','Unmarked empty weapon still falls back');
weapon.animations.attack.occludedFrames={north:[1]};runtime.registerPiece(weapon);
for(let frameIndex=0;frameIndex<3;frameIndex++)assert(runtime.resolve(look,{...pose,frameIndex}).valid);
const marked=JSON.parse(JSON.stringify(weapon));
weapon.animations.attack.occludedFrames={north:[0]};runtime.registerPiece(weapon);
assert.equal(runtime.resolve(look,pose).missing[0].code,'occluded-frame-has-pixels','Occlusion must describe an actually empty cell');
for(const metadata of [{north:[0,1,2]},{north:[1,1]},{north:[-1]},{north:[3]},{north:[1.5]},{east:[1]},[],null]){
 const invalid=JSON.parse(JSON.stringify(marked));invalid.animations.attack.occludedFrames=metadata;runtime.registerPiece(invalid);
 assert.equal(runtime.resolve(look,pose).missing[0].code,'invalid-occlusion');
}
runtime.registerPiece(marked);
body.animations.attack.occludedFrames={north:[1]};runtime.registerPiece(body);
assert.equal(runtime.resolve(look,pose).missing[0].code,'invalid-occlusion','Anatomy cannot use weapon visibility declarations');
delete body.animations.attack.occludedFrames;runtime.registerPiece(body);
marked.approved=false;runtime.registerPiece(marked);
assert.equal(runtime.resolve(look,pose).missing[0].code,'unapproved-piece');assert(runtime.resolve(look,pose,{allowDraft:true}).valid);
marked.available=false;runtime.registerPiece(marked);assert.equal(runtime.resolve(look,pose,{allowDraft:true}).missing[0].code,'missing-source');
console.log('Weapon occlusion: actual transparent cells, cache key isolation, malformed declarations, anatomy and production gates passed.');
