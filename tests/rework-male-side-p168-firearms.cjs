'use strict';
const a=require('node:assert/strict'),path=require('node:path'),R=path.resolve(process.env.PROOF_STAGE||path.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),api=make();
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),V=global.ReworkAccessoryVendor.compositor;
const items=require(R+'/item-catalog').create({forge:require(R+'/forge-system'),prison:require(R+'/prison-system'),haki:require(R+'/haki-system'),akuma:require(R+'/akuma-system'),hakiProgression:require(R+'/haki-progression')}).items;
const released=new Set([0,1,2,3,4,5,14,15,16,17,31,32,67,68,69,70,110,113,115,116,117,118,119,120,121,122,123,124,125,126,127,128]),
 ids=Object.fromEntries(items.flatMap((x,i)=>x.slot==='weapon'?[[i,x.type]]:[]));
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
function save(item,tone,pants){return JSON.parse(JSON.stringify(A.commit({classId:ids[item],equipment:{weapon:{def:item},...(pants?{legs:{def:pants}}:{})}},{gender:'masculino',skinStyle:'natural',skinColor:tone,hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'},()=>true)))}
if(!process.env.P168_TEST){
 const {spawnSync}=require('node:child_process');
 const stages=[{P168_TEST:'select'},...[4,5,113,115,116,0,67,17,31,14,119,128].flatMap(weapon=>
   ['east','west'].flatMap(dir=>['walk','idle'].map(action=>({P168_TEST:'render',ITEM:String(weapon),DIR:dir,ACTION:action}))))];
 for(const env of stages){
  const child=spawnSync(process.execPath,[...process.execArgv,__filename],{env:{...process.env,...env},stdio:'inherit'});
  a.equal(child.status,0,JSON.stringify(env));
 }
 console.log('PASS aggregate 48 independent clip proofs and complete eight-tone selector matrix');
}else (async()=>{await api.ready;let renders=0,selects=0,controls=0;
 for(const pantsId of [168])for(const item of Object.keys(ids).map(Number))for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  if(process.env.ITEM!=null&&(Number(process.env.ITEM)!==item||direction!==process.env.DIR||action!==process.env.ACTION))continue;
  const held=!released.has(item)||['north','south'].includes(direction);
  const options={consumer:'world',direction,action};
  const world=(p)=>require(R+'/paper-doll-96-lobby').selectWorldHD(api,require(R+'/tools/paper-doll-96-v3/weapons.json'),p,options);
  for(const tone of Object.keys(A.skins)){
   const off=save(item,tone),on=save(item,tone,pantsId),old=world(off),r=world(on);
   const selected=x=>x?.outfitOverlay?.item===168;
   if(held){a(!selected(r));controls++;continue;}
   a.equal(r?.hdKind,'outfit-carry',`missing P168+${item}/${direction}/${action}/${tone}`);
   a(selected(r));a.equal(r.slotRoutes?.legs.item,168);a.equal(r.slotRoutes?.weapon.item,item);
   a.deepEqual(r.plan,old.plan);a.equal(r.base.sourcePackSHA256,old.base.sourcePackSHA256);a.deepEqual(r.colorAppearance,old.colorAppearance);a(!r.omitted?.length);
   const od=old.base.pack.directions[direction],d=r.base.pack.directions[direction],p=r.base.pack;
   a.deepEqual(d.layers.filter(l=>!l.id.startsWith('pants168-')),od.layers.filter(l=>!l.id.startsWith('pants168-')));
   const lower=d.layers.filter(l=>l.id.startsWith('pants168-'));
   for(const part of r.plan.parts){
    const hand=d.layers.find(l=>l.binding?.a===part.binding.a&&l.binding?.b===part.binding.b);a(hand);
    a(lower.every(l=>l.depth<hand.depth+(part.depthOffset??.1)),'lower cannot hide own weapon');
   }
   a.deepEqual([d.clip,d.rest,d.poses,p.pivot,p.frame,r.base.mirrorX],[od.clip,od.rest,od.poses,old.base.pack.pivot,old.base.pack.frame,old.base.mirrorX]);
   for(const bad of [{...on,equipment:{...on.equipment,gloves:{def:25}}},{...on,equipment:{...on.equipment,legs:{def:168,variant:'unknown'}}}])a(!selected(world(bad)));
   selects++;
   if(tone!=='ebony'||process.env.P168_TEST!=='render')continue;
   const frames=d.clip.frames,pad=r.plan.paddingPhysical??0,s=p.frame.width*4;
   const draw=(bundle,actor,f)=>{let im;a(bundle.draw({save(){},restore(){},drawImage(v){im=v;}},actor,{...options,progress:(f+.25)/frames}));return im;};
   const z=require('node:zlib'),before=[], b=await api.prepareConfiguration([{player:off,options}]);
   for(let f=0;f<frames;f++){const x=draw(b,off,f);before.push({width:x.width,height:x.height,data:z.deflateSync(pixels(x))});}
   b.release();global.gc?.();
   const w=await api.prepareConfiguration([{player:on,options}]);
   a.equal(lower.length,2);
   for(let f=0;f<frames;f++){
    const x=before[f],y=draw(w,on,f);a.equal(x.width,y.width);a.equal(x.height,y.height);
    const mask=cv.createCanvas(x.width,x.height),mc=mask.getContext('2d');
    for(const l of lower){
     const sha=l.frames?.[f]||l.source,prefix=r.outfitOverlay.sourceRefs.includes(sha)?'tools/rework-modular-outfits-hd':'tools/rework-base-hd',im=await load(prefix+'/assets/'+sha+'.png');
     const single={...p,directions:{[direction]:{...d,layers:[l]}}},tile=cv.createCanvas(s,s);
     V.render(tile.getContext('2d'),single,new Map([[sha,im]]),{direction,frame:f,density:4});
     mc.save();if(r.base.mirrorX&&!r.preMirroredLayers?.includes(l.id)){mc.translate(mask.width,0);mc.scale(-1,1);}mc.drawImage(tile,pad,pad);mc.restore();tile.width=1;
    }
    const u=z.inflateSync(x.data),v=pixels(y),m=pixels(mask);let change=0;
    for(let i=0;i<u.length;i+=4)if(u.readUInt32LE(i)!==v.readUInt32LE(i)){
     a(m[i+3],`outside exact own lower alpha ${item}/${direction}/${action}/${tone}/${f} ${i/4%x.width},${i/4/x.width|0}`);change++;
    }
    a(change>500);mask.width=1;renders++;
   }
   w.release();global.gc?.();
  }
  console.log(item,direction,action,renders,selects,controls);
 }
 if(process.env.P168_TEST==='render'){
  a.deepEqual({renders,selects,controls},{renders:process.env.ACTION==='walk'?16:1,selects:8,controls:0});
 }else a.deepEqual({renders,selects,controls},{renders:0,selects:1024,controls:1664});
 console.log('PASS',{renders,selects,controls});
})().catch(e=>{console.error(e);process.exit(1)})
