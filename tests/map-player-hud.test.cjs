'use strict';
const assert=require('node:assert/strict');
const HUD=require('../map-player-hud.js');

const rectangles=[], labels=[], strokes=[];
const context={
  save(){},restore(){},measureText:name=>({width:name.length*8}),
  beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},
  stroke(){strokes.push(this.strokeStyle);},
  fillText(name){labels.push(name);},
  fillRect(x,y,width,height){rectangles.push({x,y,width,height,color:this.fillStyle});}
};

const name='[MARE] NaveganteSul';
const peer=HUD.draw(context,120,40,name,{faction:'marine',tier:3});
assert.deepEqual(labels,[name]);
assert(peer.left<120-name.length*4,'long name and crew tag fit inside the border');
assert.equal(rectangles.length,0,'peer nameplates never draw resource bars');
const marine=strokes.at(-1);
HUD.draw(context,120,40,'Navegante',{faction:'pirate',tier:3});
assert.notEqual(strokes.at(-1),marine,'peer faction has its own rim');
HUD.draw(context,120,40,'Sem título',{faction:'marine'});
const neutral=strokes.at(-1);
HUD.draw(context,120,40,'Sem título',{faction:'pirate',tier:0});
assert.equal(strokes.at(-1),neutral,'missing titles use the same neutral rim');
HUD.draw(context,120,40,'Navegante',{resources:{hp:25,maxHP:100,energy:50,maxEnergy:50}});
assert.equal(rectangles.length,4);
assert(rectangles.every(rect=>rect.y>peer.bottom),'resources are below the name frame');
assert.equal(rectangles[1].width,rectangles[0].width/4);
assert.equal(rectangles[3].width,rectangles[2].width);
assert.equal(rectangles[1].color,'#e25069');
assert.equal(rectangles[3].color,'#9e71e5');
assert(rectangles[3].height<rectangles[1].height);
rectangles.length=0;
HUD.draw(context,120,40,'Navegante',{resources:{hp:0,maxHP:100,energy:0,maxEnergy:0}});
assert.equal(rectangles.length,2,'zero resources leave only the empty tracks');
