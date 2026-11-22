'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(R+'/'+f);
const {make}=get('tests/rework-integration-support.cjs'),A=get('character-appearance.js');
const index=get('tools/rework-weapon-layers-hd/index.json'),rig=index.separableAttackRigs.find(r=>r.rig==='male-focus-east-modular8');
const registry=global.MareReworkModularOutfitsHD,lookups=[];
global.MareReworkModularOutfitsHD={...registry,createOwnLayerIndex(rows){
 const own=registry.createOwnLayerIndex(rows);
 if(!rows.some(r=>r.slot==='weapon'&&r.action==='attack-focus'&&r.item===32))return own;
 return {...own,resolve(key){lookups.push(key);return own.resolve(key);}};
}};
const api=make();
(async()=>{
 await api.ready;let checks=0;
 for(const direction of ['east','west'])for(const skinColor of Object.keys(A.skins)){
  const opts={consumer:'world',direction,action:'attack-focus'},gear=rig.directions[direction].weapons[32],wanted={slot:'weapon',item:32,body:'male',action:'attack-focus',direction};
  const appearance96=A.normalize({gender:'masculino',skinColor,hairColor:'black',eyeColor:'blue'}),actor=equipment=>({classId:'healer',appearance96,
   equipment:{weapon:{def:32},...equipment}});
  for(const coat of [undefined,151,158,165,179]){
   const p=actor(coat?{coat:{def:coat}}:{}),save=JSON.stringify(p);
   lookups.length=0;const record=api.selectVisual(p,opts);
   assert(record?.relic32SideBlue,'expected existing compound focus profile');
   assert.deepEqual(lookups[0],wanted,'actual focus resolver must retrieve independent weapon source');
   assert.deepEqual(record.timeline,rig.timeline);assert.equal(record.fps,rig.fps);assert.equal(record.contactTick,4);
   assert.equal(record.states.length,8);assert.equal(record.equipmentContract.weapon,32);
   for(let i=0;i<8;i++){
    const l=record.states[i].layers.at(-1);assert.equal(l.sha256,gear[i].sha256);assert.equal(l.url,gear[i].url);
    assert.equal(l.depth,coat?2:1);assert.deepEqual(l.size,gear[i].size);
   }
   assert.equal(api.selectVisual(p,{...opts,action:'attack'})?.id,record.id);
   assert(!api.selectVisual({...p,classId:'sword'},opts)?.relic32SideBlue);
   assert(!api.selectVisual(p,{...opts,weaponless:true})?.relic32SideBlue);
   assert.equal(JSON.stringify(p),save);checks++;
  }
 }
 assert.equal(checks,80);
 console.log('PASS 80 Relicario 32 owned key, archived weapon phase, coat, palette and timeline selections');
})().catch(e=>{console.error(e);process.exitCode=1});
