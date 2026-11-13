'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs');
test('approved male lateral attacks select the matching weapon, torso, direction and appearance',async()=>{
 const hd=make();await hd.ready;
 const appearance96={gender:'masculino',hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'};
 for(const [weapon,action] of [[109,'attack-unarmed'],[117,'attack-unarmed'],[122,'attack-focus']])for(const torso of [151,158,165,179])for(const direction of ['east','west']){
  const equipment={weapon:{def:weapon},coat:{def:torso}};
  const p={appearance96,equipment},o={action,direction,consumer:'world'};
  const expected='approved-lateral-male-'+weapon+'-'+torso+'-'+direction;
  const record=hd.select(p,o);
  assert.equal(record?.id,expected);
  assert.equal(record.fps,12);
  assert.equal(record.timeline.length,20);
  assert.equal(record.states.length,8);
  assert.deepEqual(record.pivot,[80,128]);
  assert.notEqual(hd.select({...p,equipment:{...equipment,head:{def:157}}},o)?.id,expected);
  assert.notEqual(hd.select({...p,appearance96:{...appearance96,hairColor:'blue'}},o)?.id,expected);
  assert(await hd.prepareClip(p,o));
  const canvas=cv.createCanvas(640,640);
  for(let n=0;n<8;n++)assert(hd.draw(canvas.getContext('2d'),p,{...o,progress:(n+0.1)/20,x:320,y:512}));
 }
});