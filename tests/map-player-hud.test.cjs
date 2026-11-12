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
assert.equal(rectangles.find(rect=>rect.color==='#e24562').height,9,'life has a substantial fill');
assert.equal(rectangles.find(rect=>rect.color==='#a16bea').height,7,'energy remains easy to see');
assert.equal(rectangles.find(rect=>rect.color==='#e24562').width,15);
assert.equal(rectangles.find(rect=>rect.color==='#a16bea').width,60);
rectangles.length=0;
HUD.draw(context,120,40,'Navegante',{hp:0,maxHP:100,energy:0,maxEnergy:0});
assert.equal(rectangles.length,0,'empty tracks have no colored fill');

labels.length=0;
outlinedLabels.length=0;
tracks.length=0;
HUD.drawEnemy(context,120,40,'Marinheiro · Nv.8',{hp:25,maxHP:100,width:66});
assert.deepEqual(labels,['Marinheiro · Nv.8']);
assert.deepEqual(outlinedLabels,labels);
assert.deepEqual(tracks.map(track=>track.slice(0,4)),[[87.5,43.5,65,10]]);
assert.equal(rectangles.find(rect=>rect.color==='#e24562').width,16);

tracks.length=0;
rectangles.length=0;
HUD.drawEnemy(context,120,40,'César · Nv.5',{hp:120,maxHP:100,width:88,targeted:true});
assert.deepEqual(tracks.map(track=>track.slice(0,4)),[[76.5,43.5,87,10]]);
assert.equal(rectangles.find(rect=>rect.color==='#e24562').width,86);
assert.equal(context.strokeStyle,'#f3ca80','the selected enemy has a gold life rim');

const names=[];
const nameContext={
 save(){},restore(){},
 strokeText(text,x,y){names.push({text,x,y,font:this.font,join:this.lineJoin,width:this.lineWidth,outline:this.strokeStyle});},
 fillText(text,x,y){names.at(-1).fill=this.fillStyle;},
};
HUD.draw(nameContext,120,40,'Navegante');
HUD.drawNPCName(nameContext,120,40,'Shimotsuki Kozaburo');
assert.deepEqual(names[1],{...names[0],text:'Shimotsuki Kozaburo',fill:'#d27525'});
