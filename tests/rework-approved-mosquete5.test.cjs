'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');

test('5 SOUTH preserves the approved enlarged initial pose and the original return',async()=>{
 const api=make();
 await api.ready;
 const player={appearance96:{gender:'masculino',skinColor:'dark',hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'original',eyeColor:'blue'},equipment:{weapon:{def:5}}};
 const pose={action:'attack-firearm',direction:'south',consumer:'world',x:200,y:180};
 const source=api.select(player,pose);
 assert.equal(source?.id,'mosquete5-south-initial-v2-appearance-bob');
 assert.equal(source.sourceArchiveSHA256,'d0bdab20685518b5f81e2b8640845f06f672a1d01c1adcc676202b1c740fa212');
 assert.deepEqual(source.states.map(s=>s.state),Array.from({length:10},(_,i)=>String(i)));
 assert.equal(source.fps,24);
 assert.equal(source.timeline.length,32);
 assert.equal(source.basePack.pack.directions.south.layers.filter(l=>l.slot==='hair').length,1);
 assert.notEqual(source.basePack.pack.directions.south.layers.find(l=>l.slot==='hair').source,
  api.select({appearance96:{body:'male',hair:'original'},equipment:player.equipment},pose).basePack.pack.directions.south.layers.find(l=>l.slot==='hair').source);
 const original=api.select({...player,appearance96:{body:'male',hair:'original'}},pose);
 const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
 const weapon=global.MareReworkWeaponNativeHD.create({schema:'native-hd-weapon-layers-v1',records:[]},{makeCanvas:cv.createCanvas});
 assert.equal(original.id,'mosquete5-south-initial-v2-appearance-original');
 const images=new Map();
 for(const file of weapon.requiredFiles(original))images.set(file,await load(file));
 for(const state of original.states){
  const a=cv.createCanvas(640,640).getContext('2d'),b=cv.createCanvas(640,640).getContext('2d');
  weapon.render(a,original,images,{state:state.state});
  b.drawImage(await load('tools/rework-weapon-layers-hd/'+state.approved.url),0,0);
  assert(Buffer.from(a.getImageData(0,0,640,640).data).equals(Buffer.from(b.getImageData(0,0,640,640).data)),
   'Recomposition differs from the approved raster in '+state.state);
 }
 assert(await api.prepareClip(player,pose));
 const hashes=new Set();
 for(let frame=0;frame<source.states.length;frame++){
  const canvas=cv.createCanvas(400,340),ctx=canvas.getContext('2d');
  assert(api.draw(ctx,player,{...pose,progress:(source.timeline.indexOf(String(frame))+.1)/source.timeline.length}),JSON.stringify(api.snapshot().last));
  const frameInfo=api.snapshot().last;
  assert.equal(frameInfo.source,source.id);
  assert.equal(frameInfo.frame,frame);
  hashes.add(require('node:crypto').createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex'));
 }
 assert(hashes.size>=10);
 assert.notEqual(api.select({...player,equipment:{...player.equipment,coat:{def:151}}},pose)?.id,source.id);
});
