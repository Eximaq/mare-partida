'use strict';
const assert=require('node:assert/strict');
global.Image=class {constructor(){this.complete=true;this.naturalWidth=1254;this.naturalHeight=1254;}set src(v){this.url=v;}};
const Z=require('../zoan-transition.js'),calls=[],c={globalAlpha:1,save(){},restore(){},drawImage(...a){calls.push(a)}};
const human={form:'human',width:74,height:74},phoenix={form:'akuma_tori_phoenix',width:128,height:128};
for(const [a,b]of [[human,phoenix],[phoenix,human]]){const s=Z.create();Z.observe(s,a,0);Z.observe(s,b,1);assert.equal(Z.draw(c,s,100,200,1.5),true);assert.match(calls.at(-1)[0].url,/reworks\/rank-s\/flame\.png$/);assert.equal(calls.at(-1)[3],313.5);assert.equal(calls.at(-1)[7],220);assert.equal(Z.draw(c,s,100,200,2.207),false);assert.equal(Z.bodyAlpha(s,2.207),1);}
const s=Z.create();Z.observe(s,human,0);Z.observe(s,{form:'akuma_ryu_ryu',width:128,height:128},1);Z.draw(c,s,100,200,1.5);assert.ok(!calls.at(-1)[0].url.includes('reworks/rank-s/flame'));
console.log('Phoenix-only cosmetic flame transition, both ways, identical 1207ms lifetime; other Zoans preserved.');
