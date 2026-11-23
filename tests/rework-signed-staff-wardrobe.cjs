'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs');
const look=require('../character-appearance.js'),world=require('../paper-doll-96-lobby.js');
const weapons=require('../tools/paper-doll-96-v3/weapons.json');
const library=path.join(__dirname,'../docs/native-hd/editable-male-equipment/sources');
const source=JSON.parse(fs.readFileSync(path.join(library,'cetros-equipamentos-aprovados.json')));
const read=(ctx)=>Buffer.from(ctx.getImageData(0,0,640,640).data);
async function main(){
 const zip=await global.MareReworkZip.loadArchive(fs.readFileSync(path.join(library,'cetros-equipamentos-aprovados.zip')),
  'a6a2392ac2b4601b9ded078e322c5201aacaa497ab7825b65f4357660cc46afb');
 const api=make();await api.ready;const images=new Map();let ticks=0;
 const image=async p=>{if(!images.has(p))images.set(p,await cv.loadImage(Buffer.from(await zip.read(p))));return images.get(p);};
 for(const row of source.routes)for(const tone of ['light','ebony']){
  const o={consumer:'world',action:row.action,direction:row.direction};
  const sets=row.weapon===123?[['torso'],['gloves'],['torso','gloves']]:[['boots']];
  for(const slots of sets){
   const key=s=>s==='torso'?'coat':s;
   const actor=xs=>look.commit({classId:row.weapon===123?'strategist':'healer',equipment:Object.fromEntries([
    ['weapon',{def:row.weapon}],...xs.map(s=>[key(s),{def:row.frames[0].slots[s].id}])])},
    {gender:'masculino',skinColor:tone,hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'},()=>true);
   const on=actor(slots),off=actor([]),saved=JSON.stringify(on);
   const select=p=>world.selectWorldHDOnly(api,weapons,p,o),mount=async p=>api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:select(p)})});
   const r=select(on);assert.deepEqual(r.omitted,[]);assert.deepEqual(r.timeline,row.timeline);
   assert.equal(select(actor([...slots].reverse())).id,r.id);
   for(const s of slots)assert.equal(r.slotRoutes[key(s)].item,row.frames[0].slots[s].id);
   const full=await mount(on),bare=await mount(off);
   try{
    for(const [tick,phase] of row.timeline.entries()){
     const draw=(bundle,p)=>{let result;assert(bundle.draw({save(){},restore(){},drawImage(c){result=c;}},p,{...o,progress:(tick+.25)/row.timeline.length}));return result;};
     const base=draw(bare,off),actual=draw(full,on),canvas=cv.createCanvas(640,640),ctx=canvas.getContext('2d');
     const passes=slots.flatMap(s=>row.frames[Number(phase)].slots[s].passes);
     for(const p of passes.filter(p=>p.stage==='under-base'))ctx.drawImage(await image(p.path),0,0);
     ctx.drawImage(base,0,0);
     for(const p of passes.filter(p=>p.stage==='over-base')){
      if(p.operation==='source-over'){ctx.drawImage(await image(p.path),0,0);continue;}
      assert.equal(p.operation,'replace-rgb-where-mask-preserve-alpha');
      const tile=cv.createCanvas(640,640),tc=tile.getContext('2d');tc.drawImage(await image(p.path),0,0);
      const mask=read(tc),pixels=ctx.getImageData(0,0,640,640);
      for(let i=0;i<mask.length;i+=4)if(mask[i+3]&&pixels.data[i+3])pixels.data.set(mask.subarray(i,i+3),i);
      ctx.putImageData(pixels,0,0);tile.width=1;
     }
     const painted=read(actual.getContext('2d'));
     assert(painted.equals(read(ctx)),JSON.stringify([row.weapon,slots,tick,tone]));
     assert(!painted.equals(read(base.getContext('2d'))));canvas.width=1;ticks++;
    }
   }finally{full.release();bare.release();}
   assert.equal(JSON.stringify(on),saved);global.gc?.();
  }
 }
 assert.equal(ticks,66);console.log('66 staff ticks match the editable slot plates and the saved body');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
