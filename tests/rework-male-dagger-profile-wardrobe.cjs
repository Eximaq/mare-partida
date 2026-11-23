'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs');
const {complete}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=require('../paper-doll-96-lobby'),appearance=require('../character-appearance');
const weapons=require('../tools/paper-doll-96-v3/weapons.json');
const outfits=require('../tools/rework-modular-outfits-hd/index.json');
const load=require('../tools/rework-hd-test-loader.cjs').create(path.join(__dirname,'..'));
const loadOwned=hash=>load('tools/rework-modular-outfits-hd/assets/'+hash+'.png');
const gear=[['coat',151],['legs',168],['boots',134],['gloves',25],['head',18]];
const actor=parts=>appearance.commit({classId:'rogue',equipment:Object.fromEntries(
 [['weapon',12],...parts].map(([slot,def])=>[slot,{def}]))},
 {gender:'masculino',hairStyle:'original',hairColor:'blue',eyeStyle:'original',eyeColor:'green',skinColor:'ebony'},()=>true);
const rgba=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
async function main(){
 const api=make();await api.ready;let phases=0,changed=0;
 for(const direction of ['east','west']){
  const o={consumer:'world',action:'walk',direction};
  async function prepare(parts){
   const p=actor(parts),record=world.selectWorldHDOnly(api,weapons,p,o);
   assert(complete(record,parts,12,o));
   const bundle=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:record})});
   assert.equal(bundle.coverage[0].frames,16);assert.deepEqual(bundle.coverage[0].omitted||[],[]);
   return {record,bundle,pixels(frame){
    let canvas;assert(bundle.draw({save(){},restore(){},drawImage(c){canvas=c;}},p,{...o,progress:(frame+.25)/16}));
    assert.equal(canvas.width,512);assert.equal(canvas.height,512);return rgba(canvas);
   }};
  }
  const full=await prepare(gear);
  try{
   for(const [slot,id] of gear.filter(([slot])=>['gloves','legs'].includes(slot))){
    const control=await prepare(gear.filter(([s])=>s!==slot));
    try{
     const source=outfits.records.find(row=>row.id===full.record.slotRoutes[slot].source);
     assert.equal(source.equipment[slot==='legs'?'pants':slot],id);
     const layers=source.pack.directions[direction].layers.filter(l=>slot==='legs'?l.id.startsWith('pants'+id+'-'):
      direction==='west'?l.id==='explicit-native-glove-west-mirror':l.id==='equip-glove-'+id||l.id==='equip-glove-'+id+'-native');
     assert.equal(layers.length,slot==='legs'?2:1);
     const ctx=cv.createCanvas(512,512).getContext('2d');ctx.imageSmoothingEnabled=false;
     for(let frame=0;frame<16;frame++){
      ctx.clearRect(0,0,512,512);
      for(const layer of layers){
       const hash=layer.frames?.[frame]||layer.source;assert(source.sourceRefs.includes(hash));
       const art=await loadOwned(hash);assert.equal(art.width,512);assert.equal(art.height,512);
       ctx.save();
       if(slot==='gloves'){
        const pass=full.record.nativeSlotPack.phaseTransforms.find(p=>p.layer.id===layer.id);
        assert(pass);if(direction==='west'){ctx.translate(512,0);ctx.scale(-1,1);}
        ctx.transform(...pass.matrices[frame]);
       }
       ctx.drawImage(art,0,0);ctx.restore();
      }
      const mask=rgba(ctx.canvas),on=full.pixels(frame),off=control.pixels(frame);let delta=0;
      for(let i=0;i<on.length;i+=4){
       if(on[i]===off[i]&&on[i+1]===off[i+1]&&on[i+2]===off[i+2]&&on[i+3]===off[i+3])continue;
       assert(mask[i+3]>0,'Outside owned '+slot+' art in '+direction+' phase '+frame+' pixel '+i/4);
       delta++;
      }
      assert(delta>0,'Invisible '+slot+' in '+direction+' phase '+frame);changed+=delta;phases++;
     }
    }finally{control.bundle.release();}
   }
  }finally{full.bundle.release();}
 }
 assert.equal(phases,64);console.log(JSON.stringify({phases,changedPixels:changed}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
