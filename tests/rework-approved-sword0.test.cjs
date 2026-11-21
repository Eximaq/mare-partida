'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');

test('0 SOUTH draws all nine historical phases after loading the normalized save',async()=>{
 const api=make();
 await api.ready;
 const player={appearance96:{gender:'masculino',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'},equipment:{weapon:{def:0}}};
 const pose={action:'attack-sword',direction:'south',consumer:'world',x:200,y:180};
 const source=api.select(player,pose);
 assert.equal(source?.id,'sword0-south-historical-layers-appearance-original');
 assert.equal(source.sourceArchiveSHA256,'9e95e9dcea550cadf43c3aa36bd12a6604d92c287a1058bf0d8c210baf8c5991');
 assert.deepEqual(source.states.map(s=>s.state),Array.from({length:9},(_,i)=>String(i)));
 assert.equal(source.fps,24);
 assert.equal(source.timeline.length,16);
 assert.equal(source.basePack.pack.directions.south.layers.filter(l=>l.slot==='hair').length,1);

 const original={...source,colorAppearance:{}};
 const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
 const weapon=global.MareReworkWeaponNativeHD.create({schema:'native-hd-weapon-layers-v1',records:[]},{makeCanvas:cv.createCanvas});
 assert.equal(original.id,'sword0-south-historical-layers-appearance-original');
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
 assert(hashes.size>=8);
 assert.notEqual(api.select({...player,equipment:{...player.equipment,coat:{def:151}}},pose)?.id,source.id);
});
