'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs');
const archive='218ef49345deb0b68186a5d1f171f71697a541f5bbfa1b4edac4bdc2be3bc6f6';
test('approved Staff 128 NORTH keeps nine BASE127 states and the exact outfit on both bodies',async()=>{
 const hd=make();await hd.ready;
 for(const body of ['male','female'])for(const torso of [151,158,165,179]){
  const appearance96={gender:body,hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'};
  const other=body==='female'?{head:{def:150},legs:{def:147},boots:{def:155}}:{};
  const equipment={weapon:{def:128},coat:{def:torso},...other};
  const p={appearance96,equipment},o={action:'attack-focus',direction:'north',consumer:'world'};
  const expected='staff128-north-base127-'+body+'-'+torso+'-approved';
  const r=hd.select(p,o);
  assert.equal(r?.id,expected);
  assert.equal(r.sourceArchiveSHA256,archive);
  const [size,pivot]=body==='female'?[768,[96,144]]:[640,[80,128]];
  assert.deepEqual(r.nativeCanvas,[size,size]);
  assert.deepEqual(r.pivot,pivot);
  assert.equal(r.fps,12);
  const phases=Array.from({length:9},(_,i)=>String(i));
  assert.deepEqual(r.timeline,[...phases,...Array(6).fill('8')]);
  assert.deepEqual(r.states.map(s=>s.state),phases);
  assert.notEqual(hd.select({...p,appearance96:{...appearance96,hairColor:'blue'}},o)?.id,expected);
  assert.notEqual(hd.select({...p,equipment:{...equipment,head:{def:157}}},o)?.id,expected);
  assert.notEqual(hd.select(p,{...o,direction:'south'})?.id,expected);
  if(body==='female'){
   assert.notEqual(hd.select({...p,equipment:{...equipment,boots:undefined}},o)?.id,expected);
   assert.notEqual(hd.select({...p,preferences:{hideHeadgear:true}},o)?.id,expected);
  }
  assert(await hd.prepareClip(p,o));
  const ctx=cv.createCanvas(size,size).getContext('2d');
  for(let i=0;i<9;i++)assert(hd.draw(ctx,p,{...o,progress:(i+.1)/r.timeline.length,x:pivot[0]*4,y:pivot[1]*4}));
 }
});
