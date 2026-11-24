'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(path.join(root,f));
const {make,cv}=get('tests/rework-integration-support.cjs'), A=get('character-appearance.js'),
 load=get('tools/rework-hd-test-loader.cjs').create(root);
const registry=global.MareReworkModularOutfitsHD,lookups=[];
global.MareReworkModularOutfitsHD={...registry,createOwnLayerIndex(rows){
 const index=registry.createOwnLayerIndex(rows);
 return {...index,resolve(key){if(key.slot==='pants')lookups.push(key);return index.resolve(key);}};
}};
const api=make();
const opts={consumer:'world',direction:'north',action:'attack-firearm'},weapons=[4,5,113,115,116];
const actor=(def,skinColor,legs)=>({classId:'gunner',appearance96:A.normalize({gender:'masculino',skinColor}),equipment:{weapon:{def},...(legs?{legs:{def:legs}}:{})}});
const px=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const show=(r,p,o,k)=>{let c;assert(r.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...o,progress:(k+.25)/48}));return c;};
(async()=>{await api.ready;let renders=0,selections=0,shared;
 for(const d of weapons)for(const tone of Object.keys(A.skins)){
  const bare=actor(d,tone),on=actor(d,tone,21),save=JSON.stringify(on),base=api.selectVisual(bare,opts);
  lookups.length=0;
  const r=api.selectVisual(on,opts);
  assert(r?.fixedNorthFirearmPants,'no independent P21 for '+[d,tone]);
  const key={slot:'pants',item:21,body:'male',action:'attack-firearm',direction:'north'};
  // Strict picker first offers the existing W114 receiver; the distinct
  // rifle adapter must then perform its own common index lookup too.
  assert.deepEqual(lookups,[key,key],'rifle adapter must read registered own layer, not the pistol authority');
  assert.deepEqual(r.states,base.states);assert.deepEqual(r.timeline,base.timeline);assert.equal(r.timeline.length,48);
  assert.equal(r.fps,24);assert.deepEqual(r.colorAppearance,base.colorAppearance);
  assert.deepEqual(r.omitted,[]);assert.equal(r.slotRoutes.weapon.source,base.id);
  assert.equal(r.slotRoutes.legs.item,21);
  const pistol=api.selectVisual(actor(114,tone,21),opts);
  assert(pistol?.signedWeaponGarments&&!pistol.fixedNorthFirearmPants);
  assert.deepEqual(pistol.slotRoutes.legs,r.slotRoutes.legs,'own animation source must be independent from firearm and saved skin');
  assert.notEqual(pistol.slotRoutes.weapon.source,r.slotRoutes.weapon.source);
  assert.equal(pistol.fps,12);assert.equal(pistol.timeline.length,8);
  assert.deepEqual(r.signedWeaponGarments.phases[0],pistol.signedWeaponGarments.phases[6]);
  assert.deepEqual(pistol.signedWeaponGarments.phases[6],pistol.signedWeaponGarments.phases[7]);
  if(shared)assert.equal(r.slotRoutes.legs.source,shared);else shared=r.slotRoutes.legs.source;
  for(const action of ['attack','skill'])assert.equal(api.selectVisual(on,{...opts,action})?.id,r.id);
  assert(!api.selectVisual({...on,classId:'sword'},opts)?.fixedNorthFirearmPants);
  assert(!api.selectVisual(on,{...opts,weaponless:true})?.fixedNorthFirearmPants);
  assert(!api.selectVisual(actor(d,tone,22),opts)?.fixedNorthFirearmPants);
  assert(!api.selectVisual({...on,equipment:{...on.equipment,boots:{def:9}}},opts)?.fixedNorthFirearmPants);
  selections++;
  if(!['light','ebony'].includes(tone))continue;
  const a=await api.prepareConfiguration([{player:bare,options:opts}]),b=await api.prepareConfiguration([{player:on,options:opts}]),
   sheet=cv.createCanvas(640,640),ctx=sheet.getContext('2d'),l=r.signedWeaponGarments.phases[0];
  try{
   const part=await load('tools/rework-weapon-layers-hd/assets/'+l.front[0]+'.png');
   assert.equal(l.rear.length,0);assert.equal(l.front.length,1);
   ctx.drawImage(part,0,0);const own=px(sheet);
   for(const state of base.states){
    const w=await load('tools/rework-weapon-layers-hd/'+state.layers.find(x=>x.role==='weapon').url);
    ctx.clearRect(0,0,640,640);ctx.drawImage(w,0,0);assert(!px(sheet).some((v,k)=>(v>>>24)>0&&(own[k]>>>24)>0),'weapon/cloth overlap '+d);
   }
   for(let k=0;k<48;k++){
    const s=Number(base.timeline[k]);assert.deepEqual(r.signedWeaponGarments.phases[s],l);
    const baseFrame=show(a,bare,opts,k),bareRGBA=px(baseFrame),withRGBA=px(show(b,on,opts,k));
    ctx.clearRect(0,0,640,640);ctx.drawImage(baseFrame,0,0);ctx.drawImage(part,0,0);
    const expected=px(sheet);let diffs=0;
    for(let j=0;j<expected.length;j++){
     if(expected[j]!==withRGBA[j])assert.fail('not exact own cloth over rifle at '+[d,tone,k,j]);
     if(bareRGBA[j]===withRGBA[j])continue;
     if(!(own[j]>>>24))assert.fail('body/material changed outside cloth at '+[d,tone,k,j]);diffs++;
    }
    assert(diffs>1000);renders++;
   }
   assert.equal(JSON.stringify(on),save);
  }finally{a.release();b.release();sheet.width=1;global.gc?.();}
 }
 console.log('PASS North P21 signed lower pose, 5 independently selected rifles,',selections,'selections and',renders,'actual Canvas ticks in light/ebony');
})().catch(e=>{console.error(e);process.exitCode=1});
