'use strict';
const assert=require('node:assert/strict');
require('../sprite-combat-v2-data.js');require('../ryu-system.js');require('../wolf-system.js');require('../zoan-art.js');require('../sprite-combat-v2.js');
const S=globalThis.MareSpriteCombatV2,D=globalThis.MareSpriteCombatV2Data;
const calls=[];
global.Image=class {constructor(){this.complete=true;}addEventListener(){}set src(url){this.url=url;const c=Object.values(D).flatMap(e=>Object.values(e.clips).flatMap(ds=>Object.values(ds))).find(c=>c.image===url);this.naturalWidth=c?c.size*c.frames:768;this.naturalHeight=c?c.size:384;}};
const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){calls.push(args)}};
for(const direction of ['north','south','east','west']){
 const p=S.resolve('phoenix','idle',direction);assert.equal(p.clip.image,D.phoenix.clips.walk[direction].image,'stationary phoenix must flap using the authored walking strip');
 S.draw(ctx,'phoenix',200,300,{action:'idle',direction,time:.2});assert.ok(calls.at(-1)[1]>0,'idle advances beyond first wing pose');
 const w=S.resolve('ryu','walk',direction).clip;assert.equal(S.frameAt(w,{time:0}),0);assert.equal(S.frameAt(w,{time:.875}),7);assert.equal(S.frameAt(w,{time:1}),0,'eight-frame walk loops without old standing intro');
}
for(const [action,hit] of [['attack',19],['bite',19],['tail',16]]){const p=S.resolve('ryu',action,'north').clip;assert.equal(p.size,160);assert.equal(S.frameAt(p,{progress:.6,hitRatio:.6}),hit);}
assert.equal(globalThis.MareRyu.timing('1','north').impact,1);assert.equal(globalThis.MareRyu.timing('2','north').impact,1);
const W=globalThis.MareWolf;W.drawEffect(ctx,'aura',200,300,1000);let a=calls.at(-1);assert.equal(a[5],152);assert.equal(a[6],176,'aura anchored at feet, not lifted by old 72px offset');assert.equal(a[7],96);assert.equal(a[8],128);
let n=calls.length;assert.equal(W.drawEffect(ctx,'aura',200,300,6000),false);assert.equal(calls.length,n,'expired aura has no residue');
console.log('Zoan reworks: directional Ryu walk/contact, Phoenix idle and Wolf grounding/expiry pass');
