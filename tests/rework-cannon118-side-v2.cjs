'use strict';
const a=require('node:assert/strict'),p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance.js'),api=make();
const load=require('../tools/rework-hd-test-loader.cjs').create(p.dirname(__dirname)),V=global.ReworkAccessoryVendor.compositor;
const idx=require('../tools/rework-weapon-layers-hd/index.json'),g=idx.separableAttackRigs.find(x=>x.rig==='male-punch-native-right-cuff');
const save=(tone='light',extras={},app={})=>JSON.parse(JSON.stringify(A.commit({id:'tech-side',classId:'cyborg',equipment:{weapon:{def:118}},...extras},{skinColor:tone,...app},()=>true)));
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data),c=()=>cv.createCanvas(512,512);
(async()=>{
 await api.ready;
 for(const direction of ['east','west'])for(const action of ['idle','walk']){
  const opt={direction,action,consumer:'world'},q=save(),key=g.directions[direction].weapons['118'][0],east=g.directions.east.weapons['118'][0];
  const pick=api.selectVisual(q,opt);
  a(pick?.cannon118SideSavedPalette,'missing exact W118 lateral carry');
  const {base,plan}=pick,part=plan.parts[0],d=base.pack.directions[direction],n=d.clip.frames;
  a.deepEqual(base.pack.pivot,{x:64,y:112});a.equal(n,action==='walk'?16:1);a.equal(n,d.clip.fps);a.equal(base.mirrorX===true,direction==='west');a.equal(pick.relicEyes.samples.length,18);
  a.equal(part.source.sha256,east.sha256);a.equal(part.hideHandBeyondWrist,false);
  a.deepEqual(key.attachment.anchor,direction==='west'?[336,322]:[304,322]);a.deepEqual(key.attachment.fallbackOffset,[0,0]);
  for(const [s,more] of [[save('light',{classId:'brawler'}),{}],[save('light',{equipment:{weapon:{def:118},gloves:{def:26}}}),{}],[save('light',{equipment:{weapon:{def:118,appearanceVariant:'other'}}}),{}],[save('light',{}, {hairColor:'brown'}),{}],[q,{weaponless:true}],[q,{consumer:'portrait'}],[q,{action:'attack-unarmed'}],[q,{direction:'north'}],[q,{direction:'south'}]])
   a(!api.selectVisual(s,{...opt,...more})?.cannon118SideSavedPalette);
  const equ=await load('tools/rework-weapon-layers-hd/'+east.url),ref=await load('tools/rework-weapon-layers-hd/'+key.url),near=d.layers.find(x=>x.id==='handNear');
  const hand=await load('tools/rework-base-hd/assets/'+near.source+'.png'),control=[];
  for(let i=0;i<n;i++){
   const t=c(),tx=t.getContext('2d');tx.imageSmoothingEnabled=false;
   const ps=d.poses[i],m=V.rigid(part.sourceBone[part.binding.b],part.sourceBone[part.binding.a],ps[part.binding.b],ps[part.binding.a]);
   if(base.mirrorX){tx.translate(512,0);tx.scale(-1,1);}
   tx.save();tx.transform(...m.slice(0,4),m[4]*4,m[5]*4);tx.drawImage(equ,0,0);tx.restore();
   const metal=px(t);
   if(i===0){const u=c(),u0=u.getContext('2d');u0.drawImage(ref,-64,-64);a(metal.equals(px(u)),'V2 F0 mesh, anchor, exact registered mirror RGBA');}
   tx.save();tx.setTransform(1,0,0,1,0,0);tx.clearRect(0,0,512,512);tx.restore();
   V.render(tx,{...base.pack,directions:{[direction]:{...d,layers:[near]}}},new Map([[near.source,hand]]),{direction,frame:i,density:4});
   const palm=px(t);let solid=0,skin=0;const seam=[];
   for(let k=3;k<metal.length;k+=4)if(palm[k]){if(metal[k]===255)solid++;if(!metal[k]){skin++;if([4,-4,2048,-2048,8,-8,4096,-4096].some(offset=>metal[k+offset]>0))seam.push(k-3);}}
   a(solid>700&&skin>100,'continuous own forearm and separate metal at '+i+': '+solid+'/'+skin);a(seam.length>8);control.push({metal,solid,skin,seam});
  }
  const draw=(h,u,i)=>{let im;a(h.draw({save(){},restore(){},drawImage(x){im=x;}},u,{...opt,progress:(i+.25)/n}));return im;};
  const lightFrames=[];
  for(const tone of process.env.SHORT_TEST?['light','ebony']:Object.keys(A.skins)){
   const u=save(tone),memo=JSON.stringify(u),r=api.selectVisual(u,opt),empty={...r,id:r.id+':proof-bare',plan:{...r.plan,parts:[]}}, get=(source)=>api.prepareConfiguration([{player:u,source,options:opt}],{resolve:x=>x});
   const w=await get(r),bare=await get(empty);let count=0;
   try{
    for(let i=0;i<n;i++){
     const im=draw(w,u,i),plain=draw(bare,u,i),b=px(im),o=px(plain),{metal,seam}=control[i];
     if(tone==="light")lightFrames[i]=b;
     if(tone==="ebony"){const l=lightFrames[i];a(seam.every(k=>b[k+3]===l[k+3]),"saved tone preserves seam alpha");a(seam.filter(k=>b.readUInt32LE(k)!==l.readUInt32LE(k)).length>5,"visible hand seam follows saved skin each frame");}
     for(let k=0;k<b.length;k+=4){if(metal[k+3]===255)a.equal(b.readUInt32LE(k),metal.readUInt32LE(k),"opaque own mechanism cannot inherit skin");const changed=b.readUInt32LE(k)!==o.readUInt32LE(k);if(changed){a(metal[k+3]>0,'outside independent mechanism varies');count++;}}
    }
    a(count>0);a.equal(JSON.stringify(u),memo);
   }finally{w.release();bare.release();}
   global.gc?.();
   console.log(direction,action,tone,n,'changed and minimum cuff alpha overlap',count,Math.min(...control.map(q=>q.solid)));
  }
 }
})().catch(e=>{console.error(e);process.exitCode=1});
