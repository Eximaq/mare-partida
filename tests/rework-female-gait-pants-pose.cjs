'use strict';
const path=require('node:path'),a=require('node:assert/strict'),R=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),api=make();
const I=require(R+'/item-catalog').create({forge:require(R+'/forge-system'),prison:require(R+'/prison-system'),haki:require(R+'/haki-system'),akuma:require(R+'/akuma-system'),hakiProgression:require(R+'/haki-progression')}).items;
const J=f=>require(R+'/'+f),B=J('tools/rework-base-hd/index.json'),V=J('tools/rework-weapon-layers-hd/index.json');
const heads=global.MareFemaleNamedHairHD.create(J('tools/rework-accessories/head-layer-index.json'),J('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(B),makeCanvas:cv.createCanvas});
const reg=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:V.femaleRegistrations},{makeCanvas:cv.createCanvas,appearanceRegistry:heads});
const dims=c=>[c.width,c.height], px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const outfit='tools/rework-modular-outfits-hd/assets/',base='tools/rework-base-hd/assets/';
const src=(l,f)=>l.frames?.[f]||l.source;
const actor=(w,t,p)=>A.commit({classId:I[w].type,equipment:{weapon:{def:w},...(p==null?{}:{legs:{def:p}})}},{gender:'feminino',skinColor:t,hairColor:t==='ebony'?'blue':'black',eyeColor:'blue'},()=>true);
(async()=>{await api.ready;let total=0;
 for(const action of (process.env.PROOF_ACTION?[process.env.PROOF_ACTION]:['idle','walk']))for(const direction of (process.env.PROOF_DIRECTION?[process.env.PROOF_DIRECTION]:['north','south','east','west']))for(const w of (process.env.PROOF_WEAPON?[+process.env.PROOF_WEAPON]:[112,114,116,119,128])){
  const o={consumer:'world',action,direction}, cache=new Map();
  function img(f){if(!cache.has(f))cache.set(f,load(f));return cache.get(f);}
  for(const t of ['light','ebony']){
   const b=actor(w,t),p=actor(w,t,w===119?182:140),q=api.selectVisual(p,o),r=api.selectVisual(b,o);
   a(q?.id.includes(':own-gait-pants:'),['new signed route unavailable',action,direction,w,t].join(' '));a.deepEqual(q.material,r.material);
   a.deepEqual(q.states,r.states);a.equal(q.paddingPhysical,r.paddingPhysical);a.equal(q.slotRoutes.legs.item,p.equipment.legs.def);
   const stable=z=>z.pack.directions[direction].layers.filter(l=>l.slot!=='pants');
   a.deepEqual(stable(q),stable(r));const old=r.pack.directions[direction].layers.find(l=>l.slot==='pants'),cloth=q.pack.directions[direction].layers.find(l=>l.slot==='pants');
   a.equal(cloth.depth,old.depth);a.deepEqual(cloth.binding,old.binding);const saved=JSON.stringify(p);
   const n=q.states.length;for(let f=0;f<n;f++){
    const [co,cn,m,bm,cc]=Array.from({length:5},()=>cv.createCanvas(1,1));let hue;
    const before=new Map(await Promise.all(reg.requiredFiles(r,{frame:f}).map(async u=>[u,await img(u)]))),after=new Map(await Promise.all(reg.requiredFiles(q,{frame:f}).map(async u=>[u,await img(u)])));
    reg.render(co.getContext('2d'),r,before,{frame:f});
    reg.render(cn.getContext('2d'),q,after,{frame:f});
    reg.render(cc.getContext('2d'),q,after,{frame:f,captureOps({op,canvas}){if(op.layer?.id===cloth.id)hue=px(canvas);canvas.width=1;}});
    a.deepEqual(dims(cn),dims(co));const x=px(co),y=px(cn),pad=r.paddingPhysical||0;[m.width,m.height]=[bm.width,bm.height]=dims(co);
    const mc=m.getContext('2d'),cx=bm.getContext('2d');mc.imageSmoothingEnabled=cx.imageSmoothingEnabled=false;
    const c=await img(outfit+src(cloth,f)+'.png'),sho=await img(base+src(old,f)+'.png');
    mc.drawImage(c,pad,pad);a(px(m).equals(hue),'own trouser plane must remain exact RGBA after palette step');
    mc.drawImage(sho,pad,pad);const mask=px(m);
    const renderWeapon=async bg=>{
     cx.clearRect(0,0,bm.width,bm.height);
     if(bg){cx.fillStyle=bg;cx.fillRect(0,0,bm.width,bm.height);}
     for(const part of r.states[f].parts){
      cx.save();cx.translate(pad,pad);cx.transform(...part.matrix);
      if(part.sourceClip){cx.beginPath();cx.rect(...part.sourceClip);cx.clip();}
      cx.drawImage(await img(part.url),0,0);cx.restore();
     }
     return px(bm);
    };
    const blade=await renderWeapon(), dark=await renderWeapon('#000'), bright=await renderWeapon('#fff');
    let rounded=0;let diff=0,dressOpaque=0;
    for(let i=0;i<x.length;i+=4){
      if(x.readUInt32LE(i)!==y.readUInt32LE(i)){diff++;a(mask[i+3]>0,'pixel outside authenticated pants replacement footprint');if(blade[i+3]===255){
       a(dark.readUInt32LE(i)!==bright.readUInt32LE(i),'background-invariant selected weapon covered or recolored '+JSON.stringify({w,t,action,direction,f,i,x:x.readUInt32LE(i),y:y.readUInt32LE(i),blade:blade.readUInt32LE(i)}));
       a([0,1,2].every(c=>Math.abs(x[i+c]-y[i+c])<=1)&&x[i+3]===y[i+3],'rounded alpha contour changed beyond one RGB unit');
       rounded++;
      }}
      if(hue[i+3]===255&&hue.readUInt32LE(i)===y.readUInt32LE(i))dressOpaque++;
    }
    a(diff>80,'garment missing');a(dressOpaque>200,'opaque cloth hue missing');
    [co,cn,m,bm,cc].forEach(c=>{c.width=1;});total++;
   }
   a.equal(JSON.stringify(p),saved);a.equal(api.selectVisual(actor(w,t),o)?.id,r.id);
   a(!api.selectVisual({...p,classId:'sword'},o)?.id.includes(':own-gait-pants:'));
  }
  cache.clear();global.gc?.();
  console.log(action,direction,w,total);
 }
 if(!process.env.PROOF_WEAPON&&!process.env.PROOF_ACTION)a.equal(total,process.env.PROOF_DIRECTION?90:360);
 console.log('PASS',total,'real renderer Canvas poses; signed cloth unmodified, no opaque weapon changed');
})().catch(e=>{console.error(e);process.exit(1)});
