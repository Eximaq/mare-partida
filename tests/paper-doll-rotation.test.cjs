'use strict';
// Rendering fixture only; no character art is approved or generated here.
const assert=require('node:assert/strict'),{create}=require('../paper-doll.js');
const calls=[],image={complete:true,naturalWidth:24,naturalHeight:32};
const ctx={save(){calls.push(['save']);},restore(){calls.push(['restore']);},translate(...v){calls.push(['translate',...v]);},rotate(v){calls.push(['rotate',v]);},drawImage(...v){calls.push(['draw',...v]);}};
const runtime=create({getImage:()=>image,validatePixels:()=>null,createCanvas:(width,height)=>({width,height,getContext:()=>ctx})});
const clip={frames:4,fps:6,loop:false,directions:['south']};
runtime.registerRig({id:'rotation-fixture',frameWidth:84,frameHeight:84,pivotX:42,pivotY:65,scale:1,requiredSlots:['weapon'],animations:{attack:clip}});
const piece={id:'blade',slot:'weapon',rigId:'rotation-fixture',approved:true,animations:{attack:{...clip,frameWidth:84,frameHeight:84,kind:'rigid-attachment',url:'blade.png',source:{width:24,height:32,anchorX:8,anchorY:20},sockets:{south:[0,1,2,3].map(quarterTurns=>({x:42,y:42,quarterTurns}))}}}};
runtime.registerPiece(piece);
const look={rigId:'rotation-fixture',pieces:{weapon:'blade'}},anchors=[[8,20],[11,8],[15,11],[20,15]],out={save(){},restore(){},drawImage(){}};
for(let i=0;i<4;i++){
 const pose={animationId:'attack',direction:'south',frameIndex:i},l=runtime.resolve(look,pose).layers[0];
 assert.equal(l.quarterTurns,i);assert.deepEqual([l.offsetX,l.offsetY],[42-anchors[i][0],42-anchors[i][1]]);
 assert.deepEqual([l.width,l.height],[24,32],'native source is never resized');
 assert(runtime.draw(out,look,pose,42,65));
 const before=calls.length;assert(runtime.draw(out,look,pose,42,65));assert.equal(calls.length,before,'quarter-turned composite is cached');
 if(i)assert(calls.some(c=>c[0]==='rotate'&&c[1]===i*Math.PI/2));
}
assert.equal(runtime.stats().compositions,4);assert.equal(runtime.stats().hits,4);
for(const invalid of [-1,4,.5,NaN,'1',null]){
 const copy=structuredClone(piece);copy.animations.attack.sockets.south[3].quarterTurns=invalid;runtime.registerPiece(copy);
 assert.equal(runtime.resolve(look,{animationId:'attack',direction:'south',frameIndex:0}).missing[0].code,'missing-socket','all poses are validated atomically');
}
const unchanged=structuredClone(piece);delete unchanged.animations.attack.sockets.south[0].quarterTurns;runtime.registerPiece(unchanged);
assert.equal(runtime.resolve(look,{animationId:'attack',direction:'south',frameIndex:0}).layers[0].quarterTurns,0);
console.log('Rigid weapon quarter-turns: native rectangular bounds, grip pivot, four exact orientations, cache and invalid-sequence fallback passed.');
