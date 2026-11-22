'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
test('female isolated torsos preserve authored garment layers with saved skin and head',async()=>{
 const api=make();await api.ready;
 for(const def of [6,7,130,137,144,151,158,165,172,179]){
  const player={appearance96:{gender:'feminino',skinColor:'dark',hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'},equipment:{coat:{def}}};
  const original={...player,appearance96:{gender:'feminino',skinColor:'original',hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original'}};
  for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack-unarmed']){
   const pose={direction,action,consumer:'world',x:160,y:190,preview:true};
   const source=api.select(player,pose);
   const expected=api.select(original,pose);
   // South walking has a second, intentionally registered, 40-tick outfit
   // route. Assert the actual coat and head sources inside it, not its outer ID.
   if(direction==='south'&&action==='walk'&&source?.hdKind==='authored-pants'){
    const plan=source.authoredPantsLayer,head=source.anatomyBase?.femaleNamedHairRecord;
    assert.equal(source.equipment.coat,def);
    assert.equal(plan.item,null,'do not substitute a pants preset for the coat');
    assert.equal(source.pack.directions.south.clip.frames,40);
    assert.equal(source.pack.directions.south.clip.fps,40);
    assert.equal(head?.skinColor,'dark');assert.equal(head?.style,'bob');
    assert.equal(head?.hairColor,'pink');assert.equal(head?.eyeColor,'green');assert.equal(head?.eyeStyle,'face-calm');
    if(plan.mappedCoat){
     assert.equal(plan.mappedCoat.sourceId,expected.id);
     assert.deepEqual(plan.mappedCoat.pack.directions.south.layers,expected.pack.directions.south.layers);
    }else{
     assert.equal(expected.hdKind,'authored-pants');
     assert(plan.layers.some(l=>l.slot==='coat'&&(l.item??151)===def));
     assert.deepEqual(plan.layers,expected.authoredPantsLayer.layers);
    }
    if([6,130,151].includes(def)){
     const live={...player,appearance96:MareCharacterAppearance.normalize(player.appearance96)};
     const options={direction,action,consumer:'world'};
     const kit=await api.prepareConfiguration([{player:live,options}]);
     try{
      const trace=kit.coverage[0];
      assert.equal(trace.frames,40);assert.deepEqual(trace.omitted,[]);
      assert(trace.source.startsWith('authored-female-south:'));
      const hashes=new Set();
      for(const frame of [0,5,15,30,39]){
       const c=cv.createCanvas(512,512),ctx=c.getContext('2d');
       assert(kit.draw(ctx,live,{...options,progress:(frame+.25)/40,x:256,y:400}));
       const rgba=ctx.getImageData(0,0,c.width,c.height).data;
       assert(rgba.some((v,i)=>i%4===3&&v>0));
       hashes.add(require('node:crypto').createHash('sha256').update(rgba).digest('hex'));c.width=1;
      }
      assert(hashes.size>2,'the mapped walking animation must visibly advance');
     }finally{kit.release();}
    }
    continue;
   }
   assert.equal(source?.sourceId,expected.id,[def,direction,action].join('/'));
   assert.equal(source.femaleNamedHairRecord.skinColor,'dark');
   assert.equal(source.femaleNamedHairRecord.style,'bob');
   assert(Object.keys(source.baseMaterialSources).length>0);
   const pack=source.pack.directions[direction];
   const cloth=pack.layers.filter(layer=>!layer.id.startsWith('base:'));
   assert.deepEqual(cloth,expected.pack.directions[direction].layers.filter(layer=>!layer.id.startsWith('base:')));
   if(def===130){
    assert(await api.prepare(player,pose),source.id);
    assert(api.draw(cv.createCanvas(700,700).getContext('2d'),player,pose),JSON.stringify(api.snapshot().last));
   }
  }
 }
});
