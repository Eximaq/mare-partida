'use strict';
const assert=require('node:assert/strict');
global.Image=class {constructor(){this.complete=true;this.naturalWidth=1024;}addEventListener(){}set src(v){this.url=v;}};
const A=require('../zoan-art.js'),calls=[];
const c={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){},fillRect(){},drawImage(...a){calls.push(a)}};
A.drawVfx(c,'akuma_inu_dachshund',100,200,{time:.1});assert.ok(calls.at(-1)[0].url.includes('mordida-focal'));
A.drawVfx(c,'akuma_uma_uma',100,200,{time:.1});assert.ok(calls.at(-1)[0].url.includes('poeira'));
assert.equal(A.drawRework(c,'giraffe-back',100,200,5),false);assert.equal(A.drawRework(c,'giraffe-back',100,200,1),true);
assert.equal(A.drawRework(c,'leopard',100,200,.16),false);assert.equal(A.drawRework(c,'leopard',100,200,.07),true);
console.log('Zoan feedback: native bite/dust atlas selection and bounded buff/contact lifetimes passed');

assert.equal(A.drawRework(c,'wolf-trail',100,200,.1),true);
