'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');

test('15 NORTH retains the closed-ring source for a saved character with separated hair and skin',async()=>{
 const api=make();
 await api.ready;
 const player={appearance96:{gender:'masculino',skinColor:'dark',hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'original',eyeColor:'blue'},equipment:{weapon:{def:15}}};
 const pose={action:'attack-unarmed',direction:'north',consumer:'world',x:200,y:180};
 const source=api.select(player,pose);
 assert.equal(source?.id,'cannon15-north-native-layers-appearance-bob');
 assert.equal(source.sourceArchiveSHA256,'46c48bda7cb4c92fc2a0fc2bbe9ebab3f8a86b3d971dbabb8237b00adeafc3b1');
 assert.deepEqual(source.states.map(s=>s.state),['0','1','2','3','4','5','6','7']);
 assert.equal(source.fps,12);
 assert.equal(source.basePack.pack.directions.north.layers.filter(l=>l.slot==='hair').length,1);
 assert.notEqual(source.basePack.pack.directions.north.layers.find(l=>l.slot==='hair').source,
  api.select({appearance96:{body:'male',hair:'original'},equipment:player.equipment},pose).basePack.pack.directions.north.layers.find(l=>l.slot==='hair').source);
 assert(await api.prepareClip(player,pose));
 const hashes=new Set();
 for(let frame=0;frame<8;frame++){
  const canvas=cv.createCanvas(400,340),ctx=canvas.getContext('2d');
  assert(api.draw(ctx,player,{...pose,progress:(frame+.1)/8}),JSON.stringify(api.snapshot().last));
  const frameInfo=api.snapshot().last;
  assert.equal(frameInfo.source,source.id);
  assert.equal(frameInfo.frame,frame);
  hashes.add(require('node:crypto').createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex'));
 }
 assert(hashes.size>=6);
 assert.notEqual(api.select({...player,equipment:{...player.equipment,coat:{def:151}}},pose)?.id,source.id);
});
