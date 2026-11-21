'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs');

const source='mosquete4-v3-south-native-layers';
const player=()=>({
 appearance96:{gender:'masculino',skinColor:'light',eyeStyle:'original',eyeColor:'blue',hairStyle:'hair-spiky',hairColor:'black'},
 equipment:{weapon:{def:4},coat:{def:151},head:{def:157}}
});
const attack={action:'attack-firearm',direction:'south'};

test('4 SOUTH uses the approved frontal muzzle in the exact M151/157 outfit',async()=>{
 const api=make();
 await api.ready;
 const p=player(),before=JSON.stringify(p);
 const selected=api.select(p,attack);
 assert.equal(selected?.id,source);
 assert.equal(selected.exactComposite,true);
 assert.equal(selected.sourceArchiveSHA256,'dd5451526cce4f6e666ad568bf11dcfa39288eb99af4ba110f1256541364df99');
 assert.deepEqual(selected.nativeCanvas,[640,640]);
 assert.deepEqual(selected.pivot,[80,128]);
 assert.equal(selected.fps,24);
 assert.deepEqual(selected.timeline,['0','1','2','4','R','4','2','1','0'].flatMap((state,i)=>Array([8,3,3,4,2,3,4,4,12][i]).fill(state)));
 const idle=api.select(p,{...attack,action:'idle'});
 assert.equal(idle?.id,source);
 assert.deepEqual(idle.timeline,['0']);
 assert.notEqual(api.select(p,{...attack,action:'walk'})?.id,source);
 assert.equal(JSON.stringify(p),before);

 const index=JSON.parse(fs.readFileSync(path.join(__dirname,'../tools/rework-weapon-layers-hd/index.json')));
 const load=require('../tools/rework-hd-test-loader.cjs').create(path.join(__dirname,'..'));
 const weapon=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const images=new Map(await Promise.all(weapon.requiredFiles(selected).map(async p=>[p,await load(p)])));
 for(const state of selected.states){
  const rendered=cv.createCanvas(640,640).getContext('2d'),approved=cv.createCanvas(640,640).getContext('2d');
  weapon.render(rendered,selected,images,{state:state.state});
  approved.drawImage(await load('tools/rework-weapon-layers-hd/'+state.approved.url),0,0);
  const actual=Buffer.from(rendered.getImageData(0,0,640,640).data);
  const expected=Buffer.from(approved.getImageData(0,0,640,640).data);
  assert(actual.equals(expected),'Pixel mismatch in state '+state.state);
 }
});

test('4 SOUTH cannot borrow the approved 151/157 composition for other identities',async()=>{
 const api=make();
 await api.ready;
 for(const edit of [
  p=>delete p.equipment.head,p=>p.preferences={hideHeadgear:true},
  p=>p.equipment.coat.def=158,p=>p.equipment.legs={def:133},
  p=>p.appearance96.gender='feminino',p=>p.appearance96.hairColor='pink',
  p=>p.appearance96.skinColor='dark',p=>p.__reworkSubset=true
 ]){
  const p=player();edit(p);
  assert.notEqual(api.select(p,attack)?.id,source);
 }
 assert.notEqual(api.select(player(),{...attack,direction:'east'})?.id,source);
});
