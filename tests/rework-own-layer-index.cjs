'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {createOwnLayerIndex}=require('../player-rework-modular-outfits-hd.js');
const north={slot:'pants',item:30,body:'male',action:'attack-sword',direction:'north'};
const east={slot:'boots',item:8,body:'female',action:'attack-sword',direction:'east'};
const west={...east,direction:'west'};
const rows=(k,source)=>({...k,source});
test('own source cannot be chosen by weapon, siblings, actor, or saved face/hair/skin',()=>{
 const cloth=Object.freeze({asset:'pants30-north-male',attachment:'legs'}),other=Object.freeze({asset:'pants30-north-female',attachment:'legs'});
 const ix=createOwnLayerIndex([rows(north,cloth),rows({...north,body:'female'},other)]);
 const before=ix.resolve(north);
 a.equal(before.source,cloth);a.equal(before.sourceDirection,'north');a.equal(before.mirrorX,false);
 for(const [def,tone,pants,boots,actorId] of [[0,'light',21,9,1],[69,'ebony',182,148,2],[124,'warm',null,null,3]])
  a.deepEqual(ix.resolve({...north,body:'masculino',def,actorId,appearance96:{skinColor:tone,hairStyle:'different'},equipment:{weapon:{def},legs:pants,boots}}),before);
 a.equal(ix.resolve({...north,body:'feminino'}).source,other);
 a.equal(ix.resolve({...north,slot:'boots'}).state,'unknown');
 a.equal(ix.resolve({...north,action:'walk'}).state,'unknown');
 a.equal(ix.resolve({...north,item:31}).state,'unknown');
 const idle={asset:'pants30-idle-north',frames:['standing']};
 const walk={asset:'pants30-walk-north',frames:['step-a','step-b']};
 const actionIndex=createOwnLayerIndex([rows(north,cloth),rows({...north,action:'idle'},idle),rows({...north,action:'walk'},walk)]);
 a.equal(actionIndex.resolve(north).source,cloth);
 a.equal(actionIndex.resolve({...north,action:'idle'}).source,idle);
 a.equal(actionIndex.resolve({...north,action:'walk'}).source,walk);
});
test('use West authored first, otherwise mirror the exact same East selection',()=>{
 const fromEast={asset:'boot8-east-female',attachment:'feet'};
 const eastOnly=createOwnLayerIndex([rows(east,fromEast)]);
 a.deepEqual(eastOnly.resolve(west),{state:'available',source:fromEast,sourceDirection:'east',mirrorX:true,key:JSON.stringify(['boots',8,'female','attack-sword','west'])});
 a.equal(eastOnly.resolve({...west,body:'male'}).state,'unknown');
 a.equal(eastOnly.resolve({...west,action:'idle'}).state,'unknown');
 a.equal(eastOnly.resolve({...west,item:148}).state,'unknown');
 a.equal(eastOnly.resolve({...west,direction:'south'}).state,'unknown');
 const fromWest={asset:'boot8-west-female',attachment:'feet'};
 const exact=createOwnLayerIndex([rows(east,fromEast),rows(west,fromWest)]);
 a.equal(exact.resolve(west).source,fromWest);a.equal(exact.resolve(west).mirrorX,false);
 a.equal(createOwnLayerIndex([rows(west,fromWest)]).resolve(east).state,'unknown');
});
test('conflicts and incomplete own sources are not personal substitutions or omissions',()=>{
 const source={asset:'valid'};
 const exactConflict=createOwnLayerIndex([rows(east,source),rows(west,source),rows(west,{asset:'different'})]);
 a.equal(exactConflict.resolve(west).state,'conflict');
 a.equal(createOwnLayerIndex([rows(east,source),rows(east,{asset:'different'})]).resolve(west).state,'conflict');
 a.equal(exactConflict.resolve({...east,direction:'up'}).state,'unknown');
 a.throws(()=>createOwnLayerIndex([rows(east,null)]),/Invalid owned/);
 a.equal(createOwnLayerIndex([rows({...north,item:0,slot:'weapon'},source)]).resolve({...north,item:0,slot:'weapon'}).source,source);
});
test('missing West reflects only the item at its own local attachment',()=>{
 const {createCanvas}=require('@napi-rs/canvas'),{drawOwnLayerAt}=require('../player-rework-modular-outfits-hd.js');
 const eastFrame=createCanvas(3,1),f=eastFrame.getContext('2d');
 for(const [x,color] of ['#e00000','#00a000','#0000e0'].entries()){f.fillStyle=color;f.fillRect(x,0,1,1);}
 const ix=createOwnLayerIndex([rows(east,{asset:'same-existing-east-only'})]);
 const paint=selection=>{
  const dst=createCanvas(12,3),c=dst.getContext('2d');
  c.fillStyle='#b0a030';c.fillRect(0,0,12,3);
  const anchor={sourceAnchor:{x:1,y:0},targetAttachment:{x:6,y:1}};
  a.equal(drawOwnLayerAt(c,selection,eastFrame,anchor),true);
  a.equal(c.imageSmoothingEnabled,true);
  return c.getImageData(0,0,12,3).data;
 };
 const e=paint(ix.resolve(east)),w=paint(ix.resolve(west));
 const px=(r,x,y)=>Array.from(r.subarray((y*12+x)*4,(y*12+x)*4+4));
 for(let y=0;y<3;y++)for(let x=0;x<12;x++)a.deepEqual(px(w,x,y),px(e,11-x,y));
 a.deepEqual(px(w,6,1),[224,0,0,255]);
 a.deepEqual(px(w,1,1),[176,160,48,255]);
 a.equal(drawOwnLayerAt({},ix.resolve({...west,action:'idle'}),eastFrame),false);
});
