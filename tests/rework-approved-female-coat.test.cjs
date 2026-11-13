'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
test('female isolated torsos preserve authored garment layers with saved skin and head',async()=>{
 const api=make();await api.ready;
 for(const def of [6,7,130,137,144,151,158,165,172,179]){
  const player={appearance96:{gender:'feminino',skinColor:'dark',hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'},equipment:{coat:{def}}};
  const original={...player,appearance96:{gender:'feminino',skinColor:'original',hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original'}};
  for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack-unarmed']){
   const pose={direction,action,consumer:'world',x:160,y:190,preview:true};
   const source=api.select(player,pose);
   const expected=api.select(original,pose);
   assert.equal(source?.sourceId,expected.id,[def,direction,action].join('/'));
   assert.equal(source.femaleNamedHairRecord.skinColor,'dark');
   assert.equal(source.femaleNamedHairRecord.style,'bob');
   assert(source.skinAnatomySources.length>0);
   const pack=source.pack.directions[direction];
   const cloth=pack.layers.filter(layer=>!layer.id.startsWith('base:'));
   assert.deepEqual(cloth,expected.pack.directions[direction].layers.filter(layer=>!layer.id.startsWith('base:')));
   if(def===130){
    assert(await api.prepare(player,pose),source.id);
    assert(api.draw(cv.createCanvas(700,700).getContext('2d'),player,pose),JSON.stringify(api.snapshot().last));
   }
  }
 }
});
