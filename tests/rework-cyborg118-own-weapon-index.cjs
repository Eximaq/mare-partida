'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(R+'/'+f);
const {make,cv}=get('tests/rework-integration-support.cjs'),A=get('character-appearance.js');
const index=get('tools/rework-weapon-layers-hd/index.json'),rig=index.separableAttackRigs.find(r=>r.rig==='male-punch-native-right-cuff');
const registry=global.MareReworkModularOutfitsHD,lookups=[];
global.MareReworkModularOutfitsHD={...registry,createOwnLayerIndex(rows){
 const own=registry.createOwnLayerIndex(rows);
 for(const row of rows.filter(r=>r.slot==='weapon'&&r.item===118&&r.action==='attack-unarmed'))
  assert(row.source.every(f=>Object.keys(f).sort().join()==='sha256,size,url'),'cuff/body may not leak into weapon pixels');
 return {...own,resolve(key){if(key.slot==='weapon'&&key.item===118)lookups.push(key);return own.resolve(key);}};
}};
const api=make(),direct=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
(async()=>{
 await api.ready;let checks=0;
 for(const direction of ['east','west']){
  const opts={consumer:'world',direction,action:'attack-unarmed'},clip=rig.directions[direction],wanted={slot:'weapon',item:118,body:'male',action:'attack-unarmed',direction};
  for(const coat of [undefined,151,158,165,179]){
   lookups.length=0;
   const r=direct.resolveSeparable({item:118,body:'male',action:'attack-unarmed',direction,appearance:rig.approvedAppearance,equipment:coat?{coat}:{}});
   assert(r?.separableAttack);assert.deepEqual(lookups[0],wanted);
   for(let i=0;i<8;i++){
    const part=clip.weapons[118][i],socket=coat&&clip.coats[coat][i].socket,weapon=r.states[i].layers.at(-1);
    assert.equal(weapon.sha256,part.sha256);assert.deepEqual(weapon.attachment,part.attachment);
    assert.deepEqual(weapon.offset,socket?socket.position.map((v,k)=>v-part.attachment.anchor[k]):part.attachment.fallbackOffset);
   }
  }
  for(const skinColor of Object.keys(A.skins)){
   const appearance96=A.normalize({gender:'masculino',skinColor,hairColor:'black',eyeColor:'blue'}),p={classId:'cyborg',appearance96,equipment:{weapon:{def:118}}},
    g={...p,equipment:{...p.equipment,legs:{def:22}}},saved=JSON.stringify(g);
   lookups.length=0;
   const naked=api.selectVisual(p,opts),worn=api.selectVisual(g,opts);
   assert(naked?.ownedArm118SideAttack&&worn?.id.includes(':own-p22:'));
   assert.deepEqual(lookups[0],wanted);assert.deepEqual(naked.timeline,rig.timeline);assert.deepEqual(worn.timeline,naked.timeline);
   for(let i=0;i<8;i++){
    const blade=naked.states[i].layers.at(-1);assert.equal(blade.sha256,clip.weapons[118][i].sha256);
    assert.deepEqual(worn.states[i].layers.at(-1),blade);
   }
   assert.deepEqual(worn.colorAppearance,naked.colorAppearance);
   assert(!api.selectVisual({...g,classId:'sword'},opts)?.ownedArm118SideAttack);
   assert(!api.selectVisual(g,{...opts,weaponless:true})?.ownedArm118SideAttack);
   assert.equal(JSON.stringify(g),saved);checks++;
  }
 }
 assert.equal(checks,16);console.log('PASS W118 weapon ownership, 16 actual saved looks + 10 original cuff/coat poses');
})().catch(e=>{console.error(e);process.exitCode=1});
