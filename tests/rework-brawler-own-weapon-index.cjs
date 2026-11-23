'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(R+'/'+f);
const {make}=get('tests/rework-integration-support.cjs'),A=get('character-appearance.js');
const index=get('tools/rework-weapon-layers-hd/index.json');
const indexAPI=global.MareReworkModularOutfitsHD,seen=[];
global.MareReworkModularOutfitsHD={...indexAPI,createOwnLayerIndex(rows){
 const registry=indexAPI.createOwnLayerIndex(rows);
 return {...registry,resolve(key){const found=registry.resolve(key);
  if(key.slot==='weapon'&&[110,111,112].includes(key.item))seen.push([key,found]);
  return found;}};
}};
const api=make();
(async()=>{
 await api.ready;let samples=0,coats=0;
 for(const item of [110,111,112]){
  const spec=index.separableAttackRigs.find(r=>r.rig===`male-authored-gauntlet${item}-eight`);
  for(const direction of item===110?['north','east','west']:['east','west']){
   const o={consumer:'world',direction,action:'attack-unarmed'},want={slot:'weapon',item,body:'male',action:'attack-unarmed',direction};
   for(const skinColor of Object.keys(A.skins)){
    const appearance96=A.normalize({gender:'masculino',skinColor,hairColor:'black',eyeColor:'blue'}),
     p={classId:'brawler',appearance96,equipment:{weapon:{def:item}}};
    const check=(player,coat)=>{
     const save=JSON.stringify(player);seen.length=0;const r=api.selectVisual(player,o);
     assert(r?.separableAttack&&r.item===item);
     const [key,found]=seen[0]||[];assert.deepEqual(key,want);assert.equal(found.state,'available');
     assert.equal(found.mirrorX,item===110&&direction==='west');
     assert.equal(found.sourceDirection,found.mirrorX?'east':direction);
     assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);assert.equal(r.fps,12);
     for(let i=0;i<8;i++){
      const part=r.states[i].layers.at(-1),own=found.source[i];
      assert.deepEqual(Object.keys(own).sort(),['sha256','size','url']);
      assert.equal(part.sha256,own.sha256);assert.equal(part.url,own.url);assert.deepEqual(part.size,own.size);
      assert.equal(!!part.mirrorX,found.mirrorX);assert.equal(part.depth,coat?2:1);
      if(spec)assert.deepEqual(own,spec.directions[direction].weapons[item][i]);
     }
     assert.equal(api.selectVisual(player,{...o,action:'attack'})?.id,r.id);
     assert(!api.selectVisual({...player,classId:'sword'},o)?.[item===110?'w110OwnDirectionalAttack':'ownedGauntletSide']);
     assert.equal(JSON.stringify(player),save);return r;
    };
    const bare=check(p,false);samples++;
    if(item!==110&&skinColor==='light'){
     const r=check({...p,equipment:{...p.equipment,coat:{def:151}}},true);
     assert.equal(r.equipmentContract.coat,151);
     assert.deepEqual(bare.colorAppearance,r.colorAppearance);coats++;
    }
   }
  }
 }
 assert.equal(samples,56);assert.equal(coats,4);
 console.log('PASS W110/111/112 detached weapon own lookup:',samples,'saved profiles and',coats,'unchanged coated mounts');
})().catch(e=>{console.error(e);process.exitCode=1});
