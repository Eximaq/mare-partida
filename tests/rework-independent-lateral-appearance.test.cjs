'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {make}=require('./rework-integration-support.cjs');
const W=require('../paper-doll-96-lobby'),A=require('../character-appearance');
const C=require('../tools/paper-doll-96-v3/weapons.json');

test('removing a lateral punch coat leaves independently colored body and hair unchanged',async()=>{
 const rt=make();
 await rt.ready;
 for(const direction of ['east','west'])for(const def of [137,172])for(const [skinColor,hairColor] of [['light','black'],['ebony','blonde']]){
  const options={consumer:'world',action:'attack-unarmed',direction};
  const appearance96=A.normalize({gender:'masculino',skinColor,hairColor});
  const on={classId:'brawler',appearance96,equipment:{coat:{def}}};
  const off={classId:'brawler',appearance96,equipment:{}};
  const selected=W.selectWorldHDOnly(rt,C,on,options);
  const natural=W.selectWorldHDOnly(rt,C,off,options);
  assert(selected&&natural);
  const pack=selected.pack,d=pack.directions[direction];
  assert.equal(d.clip.frames,8);
  const garment=selected.independentPlan.passes.get('torso');
  assert(garment&&garment.source===selected.slotRoutes.coat.source);
  const ids=new Set(garment.layers.map(l=>l.id)),owner=l=>ids.has(l.id);
  const coatLayers=d.layers.filter(owner).map(l=>l.id);
  assert(coatLayers.length>0);
  const without={...selected,id:selected.id+':test-omit-coat',
    pack:{...pack,directions:{...pack.directions,[direction]:{...d,layers:d.layers.filter(l=>!owner(l))}}}};
  // The active compositor reads its mounted pack and per-layer matrices.
  const bank=selected.nativeSlotPack;
  assert.equal(bank.mounted.pack,pack);assert.equal(coatLayers.length,ids.size);
  without.nativeSlotPack={...bank,mounted:{...bank.mounted,pack:without.pack},
   phaseTransforms:bank.phaseTransforms.filter(f=>!owner(f.layer))};
  if(without.mirrorLayerIDs)without.mirrorLayerIDs=without.mirrorLayerIDs.filter(id=>!coatLayers.includes(id));
  const prepare=(player,source)=>rt.prepareConfiguration([{player,source,options}],{resolve:x=>x});
  const h1=await prepare(on,without);
  let h2,visible;
  try{
   h2=await prepare(off,natural);visible=await prepare(on,selected);
   for(let f=0;f<8;f++){
    function frame(handle,player){
     let canvas;
     assert(handle.draw({save(){},restore(){},drawImage(c){canvas=c}},player,{...options,progress:(f+.25)/8}));
     return Buffer.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);
    }
    const body=frame(h2,off);assert(!frame(visible,on).equals(body),'real equipped fabric changes the frame');
    assert(frame(h1,on).equals(body),`coat ${def} / ${direction} / ${skinColor} / phase ${f+1}`);
   }
  }finally{h1.release();h2?.release();visible?.release();}
 }
});
