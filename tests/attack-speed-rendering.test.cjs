'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={Image:class{constructor(){this.complete=true;this.naturalWidth=400;this.naturalHeight=100;}addEventListener(){}},window:{dispatchEvent(){}},Event:class{}};
vm.createContext(scope);vm.runInContext(fs.readFileSync(require.resolve('../faction-sprites.js'),'utf8'),scope);const F=scope.MareFactionSprites;
F.register({test:{directions:['south'],frame_size:[100,100],anchor:[50,80],reference_height:80,render_scale:1,animations:{attack:{url:'attack.png',frames:4,fps:1,loop:false}}}});
for(const [p,want]of [[0,0],[.249,0],[.25,1],[.5,2],[.999,3],[1,3]])assert.equal(F.frame('test','attack','south',999,p).index,want);
const P=require('../paper-doll.js').create({getImage(){return null;}});P.registerRig({id:'r',frameWidth:16,frameHeight:16,pivotX:8,pivotY:16,scale:1,animations:{attack:{frames:4,fps:1,loop:false,directions:['south']}}});assert.equal(P.sample('r','attack','south',999,{progress:.25}).frameIndex,1);
global.Image=class{constructor(){this.complete=true;this.naturalWidth=1024;}addEventListener(){}};
const calls=[],ctx={save(){},restore(){},drawImage(...a){calls.push(a)}};
for(const system of [require('../neko-system.js'),require('../ushi-system.js'),require('../wolf-system.js')])for(const direction of ['south','north','west','east'])for(const progress of [0,.25,.5,.75,1]){
 calls.length=0;const clip=system.clips.attack[direction];assert(system.drawActor(ctx,0,0,{action:'attack',direction,time:999,progress}));assert.equal(calls[0][1],Math.min(clip.frames-1,Math.floor(progress*clip.frames))*clip.size);
}
delete global.Image;
console.log('Attack rendering: native FPS cannot override normalized frames in human, Paper Doll or Zoan renderers');
