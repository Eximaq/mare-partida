'use strict';
const fs=require('node:fs'),a=require('node:assert/strict'),p=require('node:path'),crypto=require('node:crypto'),R=p.dirname(__dirname);
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'), C=require(R+'/character-appearance.js'),api=make();
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),W=global.MareReworkWeaponCarryHD.create(null,null,{makeCanvas:cv.createCanvas});
const pre='tools/rework-weapon-layers-hd/',desc={
 2:['a47cb7853dac4d73cafdbae055b676ecdd55bb7beb6fd4aa1e4a6ca0a5fa0e8a','0430fb149730f9878fe7cb5970c531092fa855bae7fd5654d0c370918d2549eb',19,21],
 110:['7546ec0e65b17593979b4c682ce9e97986341c3c772c9727df43b6b2113a4227','95a3b7c76726a9a332e72bc73dcae1555b7463e1ec72324c14978cd6f806f3c9',47,50]};
const [item,dir]=[Number(process.argv[2]),process.argv[3]],skins=(process.env.TONES||'light,ebony').split(',');
const opts={direction:dir,action:'walk',consumer:'world'};
const save=(skin,changes={},options={})=>JSON.parse(JSON.stringify(C.commit({id:'cuff-test',classId:'brawler',equipment:{weapon:{def:item}},...options},{gender:'masculino',skinColor:skin,...changes},()=>true)));
const literal=save('light');Object.assign(literal.appearance96,{skinColor:'original',hairColor:'original',eyeColor:'original'});
const raw=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data), cm=()=>cv.createCanvas(512,512);
function draw(record,assets,frame,appearance){const c=cm();W.render(c.getContext('2d'),record,assets,{frame,appearance});const v=raw(c);c.width=1;return v;}
(async()=>{
 await api.ready;
 const base=api.selectVisual(literal,opts),[h,m,lo,hi]=desc[item];
 a.equal(base?.plan.parts[0].source.sha256,h);a(!base.stockWalkingCuffSavedPalette&&!base.plan.parts[0].skinMaterial);
 const masks='assets/'+m+'.png', original=base.plan.parts[0], expected={url:masks,sourceSHA256:h};
 const r=api.selectVisual(save('light'),opts);a(r?.stockWalkingCuffSavedPalette&&r.hdKind==='carry');
 a.deepEqual(r.plan.parts[0],{...original,skinMaterial:expected});
 a.deepEqual(r.base.pack,base.base.pack);
 const d=r.base.pack.directions[dir];a.equal(d.clip.frames,16);a.equal(d.clip.fps,16);a.equal(d.clip.loop,true);
 const urls=W.requiredFiles(r),ims=new Map(await Promise.all(urls.map(async u=>[u,await load(u)])));
 const masked=new Map();const empty=cm();for(const k of r.base.sourceRefs)masked.set('tools/rework-base-hd/assets/'+k+'.png',empty);
 masked.set(pre+original.source.url,ims.get(pre+masks));
 const projection=Array.from({length:16},(_,f)=>draw(base,masked,f,{skin:'original',hairColor:'original',eyeColor:'original'}));
 const approvedPreview={...base,plan:{...base.plan,parts:[{...original,skinMaterial:expected}]}};
 for(const skin of skins){
  const player=save(skin),before=JSON.stringify(player),src=api.selectVisual(player,opts);
  a(src?.stockWalkingCuffSavedPalette);
  const bank=await api.prepareConfiguration([{player,source:src,options:opts}],{resolve:x=>x});
  const noCuff={...src,plan:base.plan};let min=Infinity,max=0,eyesPixels=0;
  try{
   for(let f=0;f<16;f++){
    let c;a(bank.draw({save(){},restore(){},drawImage(x){c=x}},player,{...opts,progress:(f+.25)/16}));a.equal(c.width,512);a.equal(c.height,512);
    const got=raw(c),look={skin,hairColor:'black',eyeColor:'blue'},exactWithout=draw(noCuff,ims,f,look),preview=draw(approvedPreview,ims,f,look),s=projection[f];
    let delta=0;
    for(let i=0;i<got.length;i+=4){
     a.equal(got[i+3],exactWithout[i+3]);a.equal(got[i+3],preview[i+3]);
     if(got.readUInt32LE(i)!==exactWithout.readUInt32LE(i)){a(s[i+3]);delta++;}
     if(got.readUInt32LE(i)!==preview.readUInt32LE(i)){
      a(!s[i+3],'approved cuff differs');const x=i/4%512,y=(i/4/512)|0;
      const samples=src.relicEyes.samples,mirror=dir==='west';
      a(samples.some(q=>(mirror?511-q[0]:q[0])===x&&q[1]===y),'non-eye difference from visually approved carry');eyesPixels++;
     }
    }
    a(delta>=lo&&delta<=hi);min=Math.min(min,delta);max=Math.max(max,delta);
   }
  }finally{bank.release();}
  a.equal(JSON.stringify(player),before);console.log(item,dir,skin,'16 PASS',min,max,'signed iris cosmetic deltas',eyesPixels);global.gc?.();
 }
 for(const [s,o] of [
  [save('light'),{...opts,action:'attack-unarmed'}], [save('light'),{...opts,consumer:'portrait'}],
  [save('light'),{...opts,weaponless:true}], [save('light',{eyeColor:'brown'}),opts],
  [save('light',{hairColor:'brown'}),opts], [save('light',{}, {classId:'cyborg'}),opts],
  [save('light',{}, {equipment:{weapon:{def:item,appearanceVariant:'unapproved'}}}),opts],
  [save('light',{}, {equipment:{weapon:{def:item},coat:{def:151}}}),opts]
 ])a(!api.selectVisual(s,o)?.stockWalkingCuffSavedPalette,'out-of-envelope selected walk');
})().catch(e=>{console.error(e);process.exitCode=1});
