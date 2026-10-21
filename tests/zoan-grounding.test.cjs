'use strict';
const assert=require('node:assert/strict');

global.Image=class {
  constructor(){this.complete=true;this.naturalWidth=48;}
  set src(url){this.url=url;this.naturalWidth=url.includes('-idle-')?48:432;}
};
const art=require('../zoan-art.js');
const calls=[];
const ctx={save(){},restore(){},drawImage(...args){calls.push(args);}};
const y=200,scale=74/48;
for(const [action,direction,time,foot] of [
  ['idle','front',0,43],['idle','left',0,38],['idle','right',0,38],['idle','back',0,44],
  ['walk','front',.7,46],['walk','left',.5,44],['walk','right',.8,44],['walk','back',.4,45],
  ['attack','front',.25,47],['attack','left',.25,45],['attack','right',.25,44],['attack','back',.25,48]
]){
  assert.equal(art.draw(ctx,'akuma_inu_dachshund',100,y,{action,direction,time,scale}),true);
  const call=calls.pop();
  assert.equal(call[6],Math.round(y-foot*scale),`${action}/${direction} keeps visible paws on the ground`);
  assert.equal(call[8],Math.round(48*scale));
}
art.draw(ctx,'akuma_tori_albatroz',100,y,{action:'idle',direction:'left',scale});
assert.equal(calls.pop()[6],Math.round(y-48*scale),'other Zoans retain their existing anchor');
console.log('Dachshund idle, walk and attack frames remain grounded in four directions.');
