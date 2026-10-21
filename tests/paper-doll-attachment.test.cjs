'use strict';
const assert=require('node:assert/strict');
const {create}=require('../paper-doll.js');
const images=new Map([
 ['body.png',{complete:true,naturalWidth:336,naturalHeight:84}],
 ['sword.png',{complete:true,naturalWidth:64,naturalHeight:64}],
 ['other.png',{complete:true,naturalWidth:64,naturalHeight:64}]
]);
const compositions=[];
const engine=create({getImage:url=>images.get(url),validatePixels:()=>null,
 createCanvas:(width,height)=>({width,height,getContext:()=>({drawImage:(...args)=>compositions.push(args)})})});
const a={frames:4,fps:4,loop:true,directions:['south','north']};
const rig={id:'attachment-test',frameWidth:84,frameHeight:84,pivotX:42,pivotY:65,scale:1,
 requiredSlots:['body','weapon'],animations:{idle:a,walk:{...a,frames:8,fps:8}}};
engine.registerRig(rig);
const animated={...a,directions:['south'],frameWidth:84,frameHeight:84,url:'body.png'};
const body={id:'body',slot:'body',rigId:rig.id,approved:true,animations:{idle:animated}};
const sockets={south:[{x:30,y:49},{x:28,y:48},{x:30,y:49},{x:29,y:48}]};
const sword={id:'sword',slot:'weapon',rigId:rig.id,approved:true,zIndex:50,
 animations:{idle:{...animated,url:'sword.png',kind:'rigid-attachment',
 source:{width:64,height:64,anchorX:20,anchorY:36},sockets}}};
const appearance={rigId:rig.id,pieces:{body:'body',weapon:'sword'}};
engine.registerPiece(body);engine.registerPiece(sword);
for(let frameIndex=0;frameIndex<4;frameIndex++){
 const pose={animationId:'idle',direction:'south',frameIndex};
 const plan=engine.resolve(appearance,pose);assert(plan.valid);
 const weapon=plan.layers.find(l=>l.slot==='weapon');
 assert.equal(weapon.kind,'rigid-attachment');
 assert.deepEqual([weapon.sx,weapon.sy,weapon.width,weapon.height],[0,0,64,64]);
 assert.equal(weapon.offsetX,sockets.south[frameIndex].x-20);
 assert.equal(weapon.offsetY,sockets.south[frameIndex].y-36);
 assert.deepEqual(weapon.socket,sockets.south[frameIndex]);
 assert.equal(plan.layers.find(l=>l.slot==='body').sx,frameIndex*84);
}
const pose={animationId:'idle',direction:'south',frameIndex:1},calls=[];
const ctx={save(){},restore(){},drawImage:(...args)=>calls.push(args)};
assert(engine.draw(ctx,appearance,pose,42,65));
const weaponDraw=compositions.at(-1);
assert.deepEqual(weaponDraw.slice(1),[0,0,64,64,8,12,64,64]);
assert(engine.draw(ctx,appearance,pose,42,65));assert.equal(engine.stats().hits,1);
assert(engine.draw(ctx,appearance,pose,42,65,{hidden:['weapon']}));
assert.equal(compositions.at(-1)[0],images.get('body.png'));
const count=calls.length;
assert(!engine.draw(ctx,appearance,{...pose,direction:'north'},0,0));
assert(!engine.draw(ctx,appearance,{...pose,animationId:'walk'},0,0));
assert.equal(calls.length,count,'missing sockets or art must not draw partial anatomy');
for(const [mutate,code]of [
 [p=>delete p.animations.idle.sockets.south[3],'missing-socket'],
 [p=>p.animations.idle.sockets.south.pop(),'missing-socket'],
 [p=>p.animations.idle.sockets.south[0].x=.1,'missing-socket'],
 [p=>p.animations.idle.source.anchorX=65,'invalid-attachment-source'],
 [p=>p.animations.idle.source.width=0,'invalid-attachment-source'],
 [p=>p.animations.idle.kind='fake-animation','unsupported-layer-kind'],
 [p=>p.animations.idle.kind=0,'unsupported-layer-kind'],
 [p=>p.approved=false,'unapproved-piece']
]){
 const candidate=structuredClone(sword);mutate(candidate);engine.registerPiece(candidate);
 assert.equal(engine.resolve(appearance,pose).missing.at(-1).code,code);
}
engine.registerPiece({...sword,approved:false});
assert(engine.resolve(appearance,pose,{allowDraft:true}).valid);
const rigidBody=structuredClone(body);rigidBody.animations.idle=structuredClone(sword.animations.idle);
engine.registerPiece(rigidBody);
assert(engine.resolve(appearance,pose,{allowDraft:true}).missing.some(m=>m.code==='invalid-attachment-source'));
engine.registerPiece(body);engine.registerPiece(sword);
const other=structuredClone(sword);other.id='other';other.animations.idle.url='other.png';engine.registerPiece(other);
assert.equal(engine.resolve({...appearance,pieces:{...appearance.pieces,weapon:'other'}},pose).layers.at(-1).image,images.get('other.png'));
// Geometry-only fixture: direction depth is still honored for rigid weapons.
const northBody=structuredClone(body);northBody.animations.idle.directions=['south','north'];northBody.animations.idle.url='body-directions.png';
images.set('body-directions.png',{complete:true,naturalWidth:336,naturalHeight:168});
const northSword=structuredClone(sword);northSword.animations.idle.directions=['south','north'];
northSword.animations.idle.sockets.north=structuredClone(sockets.south);
northSword.animations.idle.directionOverrides={north:{zIndex:-10}};
engine.registerPiece(northBody);engine.registerPiece(northSword);
const north=engine.resolve(appearance,{...pose,direction:'north'});assert(north.valid);
assert.equal(north.layers[0].slot,'weapon');assert.equal(north.layers[0].zIndex,-10);
engine.registerPiece(body);engine.registerPiece(sword);
images.set('sword.png',{complete:true,naturalWidth:256,naturalHeight:64});
assert.equal(engine.resolve(appearance,pose).missing.at(-1).code,'invalid-sheet-size');
console.log('Rigid attachment passed: one image, four real sockets, no interpolation, cache/toggles, replacement, atomic fallback, invalid transforms and no rigid anatomy bypass.');
