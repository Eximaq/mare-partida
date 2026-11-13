'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {make,cv} = require('./rework-integration-support.cjs');
test('historical male 151 idle owns only the approved appearance and slots', async () => {
 const hd=make(); await hd.ready;
 const player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'},equipment:{coat:{def:151}}};
 for(const direction of ['south','north','east','west']) {
  const options={direction,action:'idle',consumer:'world'};
  const expected='approved-male151-static-v1-'+direction;
  const actual=hd.select(player,options);
  assert.equal(actual?.id,expected);
  assert.deepEqual(actual.pack.pivot,{x:64,y:112});
  assert.equal(actual.pack.directions[direction].clip.frames,1);
  assert.notEqual(hd.select({...player,equipment:{...player.equipment,boots:{def:9}}},options)?.id,expected);
  assert.notEqual(hd.select({...player,appearance96:{...player.appearance96,hairColor:'blue'}},options)?.id,expected);
  assert(await hd.prepare(player,options));
  assert(hd.draw(cv.createCanvas(512,512).getContext('2d'),player,{...options,x:256,y:448}));
 }
});