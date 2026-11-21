'use strict';
const assert=require('node:assert/strict'),p=require('node:path'),{test}=require('node:test');
const root=__dirname;
const {make}=require(p.join(root,'tests/rework-integration-support.cjs'));
const target=p.join(__dirname,'player-rework-female-equipment-hd.js');
const pose={action:'attack-firearm',direction:'north',consumer:'world'},items=[113,114];
const raw={gender:'feminino',skinColor:'original',hairStyle:'original',hairColor:'original',eyeColor:'original',eyeStyle:'original'};
const player=(id,appearance96)=>({classId:'shooter',appearance96,equipment:{weapon:{def:id}}});
const makeProfiles=()=>[global.MareCharacterAppearance.normalize({gender:'feminino'}),global.MareCharacterAppearance.normalize({gender:'feminino',skinColor:'ebony',hairStyle:'hair-cropped',hairColor:'blonde',eyeColor:'amber'})];
const bundle=(api,player,source)=>api.prepareConfiguration([{player,options:pose,source}],{resolve:x=>x});
const take=(q,p,i)=>{let canvas;assert(q.draw({save(){},restore(){},drawImage(c){canvas=c;}},p,{...pose,progress:(i+.2)/8}));return Buffer.from(canvas.getContext('2d').getImageData(0,0,640,640).data.buffer);};
test('W113/W114 North exact body and weapon with personalized recoil head 9 native px only at contact',async()=>{
 const provider=global.MareReworkFemaleEquipmentHD;
 const previous=process.env.KAIZOKU_FEMALE_PRIOR;
 if(previous)global.MareReworkFemaleEquipmentHD=require(previous);
 const before=make();await before.ready;
 global.MareReworkFemaleEquipmentHD=require(target);
 const after=make();await after.ready;global.MareReworkFemaleEquipmentHD=provider;
 let original=0,custom=0;
 for(const id of items){
  const actor=player(id,raw),legacy=before.selectVisual(actor,pose),newOriginal=after.selectVisual(actor,pose);
  assert.deepEqual(legacy,newOriginal);
  const [a,b]=await Promise.all([bundle(before,actor,legacy),bundle(after,actor,newOriginal)]);
  for(let i=0;i<8;i++){assert(take(a,actor,i).equals(take(b,actor,i)));original++;}
  a.release();b.release();
  for(const appearance of makeProfiles()){
   const act=player(id,appearance),json=JSON.stringify(act),r=after.selectVisual(act,pose);assert(r);if(previous)assert(!before.selectVisual(act,pose));
   assert.deepEqual(r.states,legacy.states);assert.deepEqual(r.pack,legacy.pack);
   assert.equal(r.material.skinColor,appearance.skinColor);
   assert.equal(r.material.hairColor,appearance.hairColor);
   assert.deepEqual(r.northFirearmHeadRecoil,[0,0,0,0,9,0,0,0]);
   const moved=await bundle(after,act,r),frozen=await bundle(after,act,{...r,id:r.id+':control',northFirearmHeadRecoil:undefined});
   for(let i=0;i<8;i++){
    const a=take(moved,act,i),b=take(frozen,act,i);
    if(i!==4)assert(a.equals(b));
    else {
     let diff=0;
     for(let k=0;k<b.length;k+=4)if(a.readUInt32LE(k)!==b.readUInt32LE(k)){
      diff++;const x=(k/4)%640,y=Math.floor(k/4/640);
      assert(y>=110&&y<=270&&x>=208&&x<=419,'recoil changed pixel outside head ROI');
     }
     assert(diff>100);
    }
    custom++;
   }
   moved.release();frozen.release();assert.equal(JSON.stringify(act),json);
  }
 }
 assert.equal(original,16);assert.equal(custom,32);
});
