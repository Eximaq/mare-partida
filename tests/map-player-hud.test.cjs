'use strict';
const assert=require('node:assert/strict');
const HUD=require('../map-player-hud.js');

const rectangles=[], labels=[], outlinedLabels=[], tracks=[];
let shapeStrokes=0;
const context={
  save(){},restore(){},measureText:name=>({width:name.length*8}),
  beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},closePath(){},fill(){},clip(){},
  stroke(){shapeStrokes++;},
  roundRect(...args){tracks.push(args);},
  strokeText(name){outlinedLabels.push(name);},
  fillText(name){labels.push(name);},
  fillRect(x,y,width,height){rectangles.push({x,y,width,height,color:this.fillStyle});}
};

const name='NaveganteSul';
HUD.draw(context,120,40,name);
assert.deepEqual(labels,[name]);
assert.deepEqual(outlinedLabels,[name]);
assert.equal(tracks.length,0,'a remote player draws only text');
assert.equal(rectangles.length,0);
assert.equal(shapeStrokes,0);

HUD.draw(context,120,40,'Navegante',{hp:25,maxHP:100,energy:60,maxEnergy:50});
assert(tracks.every(track=>track[1]>40),'resource tracks sit below the nickname');
assert.equal(tracks[0][2],tracks[1][2]);
assert(tracks[1][3]<tracks[0][3]);
assert.equal(rectangles.find(rect=>rect.color==='#e24562').width,15);
assert.equal(rectangles.find(rect=>rect.color==='#a16bea').width,60);
rectangles.length=0;
HUD.draw(context,120,40,'Navegante',{hp:0,maxHP:100,energy:0,maxEnergy:0});
assert.equal(rectangles.length,0,'empty tracks have no colored fill');
