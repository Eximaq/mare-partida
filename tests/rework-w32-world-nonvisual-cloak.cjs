'use strict';
const a=require('node:assert/strict'),path=require('node:path'),R=process.env.STAGE||path.resolve(__dirname,'..'),req=f=>require(path.join(R,f));
const {make}=req('tests/rework-integration-support.cjs'),A=req('character-appearance'),{selectWorldHD,outfit,defaults}=req('paper-doll-96-lobby');
const weapons=req('tools/paper-doll-96-v3/weapons.json'),paint=req('tools/paper-doll-96-v3/weapons.js').composition;
const wardrobe=req('tools/paper-doll-96-v3/appearance-catalog.json'),api=make();
const actor=(skinColor,coat)=>A.commit({classId:'healer',equipment:{weapon:{def:32},coat:coat==null?null:{def:coat},cloak:null,head:null,gloves:null,legs:null,boots:null}},{gender:'masculino',skinColor},()=>true);
const equip=(p,extras)=>({...p,equipment:{...p.equipment,...extras}}),withCloak=p=>equip(p,{cloak:{def:23}});
const select=(p,o)=>selectWorldHD(api,weapons,p,o),pixa=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function frames(p,o,source){
 const bundle=await api.prepareConfiguration([{player:p,options:o,source}],{resolve:x=>x}),result=[];
 try{for(let f=0;f<8;f++){
  let c;
  a(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...o,progress:(f+.125)/8}));
  const pixels=pixa(c);
  a(pixels.some(x=>x));
  result.push(require('node:crypto').createHash('sha256').update(pixels).digest('hex'));
 }}finally{bundle.release();global.gc?.();}
 return result;
}
(async()=>{
 await api.ready;
 a(!paint.rendersSlot('cloak')&&!paint.rendersSlot('cloakFront')&&paint.rendersSlot('torso'));
 let configured=0,pixels=0;
 for(const skinColor of ['light','ebony'])for(const coat of [null,151,158,165,179])for(const direction of ['east','west']){
  const p=actor(skinColor,coat),cloaked=withCloak(p),saved=JSON.stringify(cloaked);
  a.deepEqual(outfit(wardrobe,p,defaults,{production:true}),outfit(wardrobe,cloaked,defaults,{production:true}));
  for(const action of ['attack-focus','attack','skill']){
   const o={consumer:'world',direction,action},base=select(p,o),candidate=select(cloaked,o);
   a(base?.relic32SideBlue,'fixture lacks signed W32');
   a.deepEqual(base.equipmentContract,{weapon:32,...(coat==null?{}:{coat})});
   a.deepEqual(candidate,base,'the excluded cloak slot must not displace signed art');
   configured++;
   if(coat===165&&(skinColor==='light'?direction==='east':direction==='west')){
    a.deepEqual(await frames(cloaked,o,candidate),await frames(p,o,base));
    pixels+=8;
   }
   a(!select(equip(cloaked,{boots:{def:9}}),o)?.relic32SideBlue);
   a(!select(equip(cloaked,{head:{def:18}}),o)?.relic32SideBlue);
   a(!select(equip(cloaked,{visual_completo:{def:999}}),o)?.relic32SideBlue);
   a(!select(equip(cloaked,{weapon:{def:32,variant:'unproved'}}),o)?.relic32SideBlue);
   if(coat!=null)a(!select(equip(cloaked,{coat:{def:coat,variant:'unproved'}}),o)?.relic32SideBlue);
  }
  a.equal(JSON.stringify(cloaked),saved,'preview does not unequip or mutate the saved cloak');
 }
 a.equal(configured,60);a.equal(pixels,48);
 console.log('PASS 60 W32 World cloak toggle source comparisons, 48 matched Canvas frames, including C165 authored cape');
})().catch(e=>{console.error(e);process.exitCode=1});
