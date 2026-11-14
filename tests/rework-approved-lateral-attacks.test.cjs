'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs');
test('approved lateral attacks select the matching weapon, torso, direction and appearance',async()=>{
 const hd=make();await hd.ready;
 for(const body of ['male','female'])for(const [weapon,action] of [[109,'attack-unarmed'],[117,'attack-unarmed'],[122,'attack-focus']])for(const torso of [151,158,165,179])for(const direction of ['east','west']){
  const appearance96={gender:body,hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'};
  const fitted=body==='female'?{legs:{def:154},boots:{def:155}}:{};
  const equipment={weapon:{def:weapon},coat:{def:torso},...fitted};
  const p={appearance96,equipment},o={action,direction,consumer:'world'};
  const independent=body==='male'&&[109,117].includes(weapon);
  const expected=independent?'separable-male-punch-source-sleeves-'+weapon+'-male-'+direction+'-weapon'+weapon+'-coat'+torso:'approved-lateral-'+body+'-'+weapon+'-'+torso+'-'+direction;
  const record=hd.select(p,o);
  if(independent){assert(record?.separableAttack);assert.deepEqual(record.equipmentContract,{weapon,coat:torso});}
  assert.equal(record?.id,expected);
  // Male109/117 use source-original independent sleeve profiles.
  // Female and122 retain their exact legacy routes.
  if(!independent)assert(!record.separableAttack);
  if(independent){const old=require('../tools/rework-weapon-layers-hd/index.json').records.find(r=>r.id==='approved-lateral-male-'+weapon+'-'+torso+'-'+direction);assert(old,'legacy source reference must remain available');}
  assert.equal(record.fps,12);
  assert.equal(record.timeline.length,20);
  assert.equal(record.states.length,8);
  const [w,pivot]=body==='female'?[512,[64,112]]:[640,[80,128]];
  assert.deepEqual(record.pivot,pivot);
  assert.notEqual(hd.select({...p,equipment:{...equipment,legs:{def:147}}},o)?.id,expected);
  assert.notEqual(hd.select({...p,equipment:{...equipment,head:{def:157}}},o)?.id,expected);
  assert.notEqual(hd.select({...p,appearance96:{...appearance96,hairColor:'blue'}},o)?.id,expected);
  assert(await hd.prepareClip(p,o));
  const canvas=cv.createCanvas(w,w);
  for(let n=0;n<8;n++)assert(hd.draw(canvas.getContext('2d'),p,{...o,progress:(n+0.1)/20,x:pivot[0]*4,y:pivot[1]*4}));
 }
});