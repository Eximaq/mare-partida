'use strict';
const assert=require('node:assert/strict'), path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make}=require('./rework-integration-support.cjs');
const {weapons,gear,complete}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')), appearance=require(path.join(root,'character-appearance.js'));
const catalog=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const outfits={coat:137,legs:22,boots:162,gloves:159}, options=(action,direction)=>({consumer:'world',action,direction});
async function main(){
 const api=make();await api.ready;
 const sample=[[0,'walk','east',18],[110,'walk','west',19],[2,'walk','north',129],[124,'walk','south',157],[119,'idle','north',164]];
 function select(weapon,pose,head,hidden=false,eyeStyle='original',hairStyle='hair-cropped'){
  const {id,role}=weapon,clothes={...outfits,...(head==null?{}:{head})};
  const equipment=Object.fromEntries(Object.entries({...clothes,weapon:id}).map(([k,def])=>[k,{def}]));
  const p=appearance.commit({classId:role,equipment,preferences:{hideHeadgear:hidden}}, {
   gender:'masculino',skinColor:'ebony',eyeColor:'green',hairColor:'blue',eyeStyle,hairStyle
  },()=>true);
  const r=world.selectWorldHDOnly(api,catalog,p,pose),shown=Object.entries(hidden?outfits:clothes);
  assert(complete(r,shown,id,pose),JSON.stringify([id,pose,head,hidden,r?.omitted]));
  if(hidden)assert.equal(r.slotRoutes?.head,undefined);
  return {p,r};
 }
 let count=0,frames=0;
 for(const w of weapons)for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  for(const h of [null,...gear[4]]){select(w,options(action,direction),h);count++;}
  select(w,options(action,direction),157,false,'face-calm','hair-long');
 }
 assert.equal(count,42*4*2*11);
 for(const [id,action,direction,helmet] of sample){
  const w=weapons.find(w=>w.id===id),o=options(action,direction);
  async function rasters(head,hide,face){
   const {p,r}=select(w,o,head,hide,face);
   const bundle=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
   try{
    const trace=bundle.coverage[0];assert.deepEqual(trace.omitted,[]);assert.equal(trace.source,r.id);
    const data=[];
    for(let n=0;n<trace.frames;n++){
     let im;assert(bundle.draw({save(){},restore(){},drawImage(i){im=i;}},p,{...o,progress:(n+.25)/trace.frames}));
     data.push(new Uint32Array(im.getContext('2d').getImageData(0,0,im.width,im.height).data.buffer));
    }
    return data;
   }finally{bundle.release();}
  }
  const bare=await rasters(null),on=await rasters(helmet),hidden=await rasters(helmet,true);
  const calm=await rasters(null,false,'face-calm');
  const receiver=select(w,o,null).r.independentPlan.base,pack=receiver.base.pack,dir=pack.directions[direction];
  const iris=global.MareReworkEyeStylesHD.maleSource(receiver.base);assert(iris);
  assert.equal(on.length,action==='walk'?16:1);assert.equal(bare.length,on.length);assert.equal(hidden.length,on.length);
  for(let n=0;n<bare.length;n++){
   const width=Math.sqrt(bare[n].length),pad=(width-512)/2;
   assert(Buffer.from(bare[n].buffer).equals(Buffer.from(hidden[n].buffer)),[id,n,'hide helmet']);
   let changed=0;
   for(let i=0;i<bare[n].length;i++)if(bare[n][i]!==on[n][i]){
    assert(Math.floor(i/width)-pad<256,[id,n,'helmet changed the lower body']);changed++;
   }
   assert(changed>30,[id,n,'helmet must draw']);
   if(iris.north)assert(Buffer.from(bare[n].buffer).equals(Buffer.from(calm[n].buffer)),[id,n,'back of head']);
   else{
    // Carry face layers follow the native NECK/NOSE bone, then reuse the
    // whole-body mirror for West and the physical padding of this weapon.
    const clock=dir.poses[n],m=global.ReworkAccessoryVendor.compositor.rigid(dir.rest.NECK,dir.rest.NOSE,clock.NECK,clock.NOSE);
    const boxes=iris.boxes.map(([l,t,r,b])=>{
     const corners=[[l,t],[r,t],[r,b],[l,b]].map(([x,y])=>{
      const u=m[0]*x+m[2]*y+4*m[4],v=m[1]*x+m[3]*y+4*m[5];
      return [pad+(receiver.base.mirrorX?512-u:u),pad+v];
     });
     return [Math.floor(Math.min(...corners.map(p=>p[0])))-2,Math.floor(Math.min(...corners.map(p=>p[1])))-2,
      Math.ceil(Math.max(...corners.map(p=>p[0])))+2,Math.ceil(Math.max(...corners.map(p=>p[1])))+2];
    });
    let eyes=0;
    for(let i=0;i<bare[n].length;i++)if(bare[n][i]!==calm[n][i]){
     const x=i%width,y=Math.floor(i/width);assert(boxes.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b),[id,n,x,y,'outside saved eyes']);eyes++;
    }
    assert(eyes>5,[id,n,'visible eye expression']);
   }
   frames++;
  }
 }
 assert.equal(frames,65);
 console.log(JSON.stringify({selected:count,comparedPhases:frames,rasters:frames*4,additionalSavedExpressions:42*8}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
