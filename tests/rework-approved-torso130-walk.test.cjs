'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs');
test('130 female walk uses the four authored rigs only for the source outfit and appearance',async()=>{
 const hd=make();await hd.ready;
 const appearance96={gender:'feminino',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'};
 const equipment={coat:{def:130}},player={appearance96,equipment};
 for(const [direction,revision] of [['south','s36'],['north','n39'],['east','ew44'],['west','ew44']]){
  const options={direction,action:'walk',consumer:'world'};
  const source='approved-female130-walk-'+revision+'-'+direction;
  const record=hd.select(player,options);
  assert.equal(record?.id,source);
  assert.deepEqual(record.pack.pivot,{x:64,y:112});
  assert.deepEqual(record.pack.directions[direction].clip,{frames:40,fps:40,loop:true});
  assert.notEqual(hd.select({...player,appearance96:{...appearance96,skinColor:'dark'}},options)?.id,source);
  assert.notEqual(hd.select({...player,appearance96:{...appearance96,hairStyle:'hair-bob'}},options)?.id,source);
  assert.notEqual(hd.select({...player,equipment:{...equipment,boots:{def:155}}},options)?.id,source);
  assert(await hd.prepareClip(player,options));
  const ctx=cv.createCanvas(512,512).getContext('2d');
  for(let frame=0;frame<40;frame++)assert(hd.draw(ctx,player,{...options,time:(frame+.1)/40,x:256,y:448}));
 }
});
