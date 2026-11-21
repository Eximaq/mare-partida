'use strict';
const fs=require('node:fs'),a=require('node:assert/strict'),p=require('node:path'),crypto=require('node:crypto'),R=p.dirname(__dirname);
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'), C=require(R+'/character-appearance.js'),api=make();
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),W=global.MareReworkWeaponCarryHD.create(null,null,{makeCanvas:cv.createCanvas});
const pre='tools/rework-weapon-layers-hd/',desc={
 '119:north':['e9c4d1f575c117655c61c191e68eac5c2ef2b337a5a75d018432ffaa31f53bc6','620da2c609dcbcd467feff93deb8b61c38debc608795c1af19a14d3f2649a6fe',92,92],
 '120:north':['2cd02c09e63a86db1503b4f153c22e6f88fbc20d194a16c5cf6bcab00de41b91','86bc8ca986f70ab7a295bc93213e5f553e0e9f971e64201ef01d23dddd10a880',45,45],
 '120:east':['7c72fc19c7fd0404ea113c67c06533f95cbe9d3513e0d4afbaec25cc3bdcdc9a','41f18b44180d8d81140ef247b1bc09e8ef87acfc8dd838973774ccdf0cd612a0',45,60],
 '120:west':['7c72fc19c7fd0404ea113c67c06533f95cbe9d3513e0d4afbaec25cc3bdcdc9a','41f18b44180d8d81140ef247b1bc09e8ef87acfc8dd838973774ccdf0cd612a0',45,60]};
const [item,dir]=[Number(process.argv[2]),process.argv[3]],skins=(process.env.TONES||'light,ebony').split(',');
const opts={direction:dir,action:'walk',consumer:'world'};
const save=(skin,changes={},options={})=>JSON.parse(JSON.stringify(C.commit({id:'cuff-test',classId:'cyborg',equipment:{weapon:{def:item}},...options},{gender:'masculino',skinColor:skin,...changes},()=>true)));
const literal=save('light');Object.assign(literal.appearance96,{skinColor:'original',hairColor:'original',eyeColor:'original'});
const raw=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data), cm=()=>cv.createCanvas(512,512);
function draw(record,assets,frame,appearance){const c=cm();W.render(c.getContext('2d'),record,assets,{frame,appearance});const v=raw(c);c.width=1;return v;}
(async()=>{
 await api.ready;
 const base=api.selectVisual(literal,opts),[h,m,lo,hi]=desc[item+':'+dir];
 a.equal(base?.plan.parts[0].source.sha256,h);a(!base.stockTechWalkSavedPalette&&!base.plan.parts[0].skinMaterial);
 const masks='assets/'+m+'.png', original=base.plan.parts[0], expected={url:masks,sourceSHA256:h};
 const r=api.selectVisual(save('light'),opts);a(r?.stockTechWalkSavedPalette&&r.hdKind==='carry');
 a.deepEqual(r.plan.parts,[{...original,skinMaterial:expected},...base.plan.parts.slice(1)]);
 a.deepEqual(r.base.pack,base.base.pack);
 const d=r.base.pack.directions[dir];a.equal(d.clip.frames,16);a.equal(d.clip.fps,16);a.equal(d.clip.loop,true);
 const urls=W.requiredFiles(r),ims=new Map(await Promise.all(urls.map(async u=>[u,await load(u)])));
 const masked=new Map();const empty=cm();for(const k of r.base.sourceRefs)masked.set('tools/rework-base-hd/assets/'+k+'.png',empty);
 const mask=ims.get(pre+masks),mat=cv.createCanvas(mask.width,mask.height),mc=mat.getContext('2d');
 mc.drawImage(mask,0,0);const mp=mc.getImageData(0,0,mat.width,mat.height);
 for(let i=0;i<mp.data.length;i+=4){const w=mp.data[i]?255:0;mp.data.fill(w,i,i+4);}
 mc.putImageData(mp,0,0);masked.set(pre+original.source.url,mat);for(const pt of base.plan.parts.slice(1))masked.set(pre+pt.source.url,empty);
 const projection=Array.from({length:16},(_,f)=>draw(base,masked,f,{skin:'original',hairColor:'original',eyeColor:'original'}));
 const approvedPreview={...base,plan:{...base.plan,parts:[{...original,skinMaterial:expected},...base.plan.parts.slice(1)]}};
 for(const skin of skins){
  const player=save(skin),before=JSON.stringify(player),src=api.selectVisual(player,opts);
  a(src?.stockTechWalkSavedPalette);
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
      a(!s[i+3], 'approved cuff differs frame='+f+' coord='+i/4%512+','+(i/4/512|0)+' got='+got.subarray(i,i+4).toString('hex')+' preview='+preview.subarray(i,i+4).toString('hex')+' stock='+exactWithout.subarray(i,i+4).toString('hex'));const x=i/4%512,y=(i/4/512)|0;
      a(dir!=='north'&&src.relicEyes,'North must match approved preview pixel for pixel');
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
  [save('light'),{...opts,action:'attack-unarmed'}],[save('light'),{...opts,direction:'south'}], [save('light'),{...opts,consumer:'portrait'}],
  [save('light'),{...opts,weaponless:true}], [save('light',{eyeColor:'brown'}),opts],
  [save('light',{hairColor:'brown'}),opts], [save('light',{}, {classId:'brawler'}),opts],
  [save('light',{}, {equipment:{weapon:{def:item,appearanceVariant:'unapproved'}}}),opts],
  [save('light',{}, {equipment:{weapon:{def:item},coat:{def:151}}}),opts]
 ])a(!api.selectVisual(s,o)?.stockTechWalkSavedPalette,'out-of-envelope selected walk');
})().catch(e=>{console.error(e);process.exitCode=1});
