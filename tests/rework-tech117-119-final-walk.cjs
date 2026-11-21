'use strict';
const fs=require('node:fs'),a=require('node:assert/strict'),p=require('node:path'),crypto=require('node:crypto'),R=p.dirname(__dirname);
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'), C=require(R+'/character-appearance.js'),api=make();
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),W=global.MareReworkWeaponCarryHD.create(null,null,{makeCanvas:cv.createCanvas});
const pre='tools/rework-weapon-layers-hd/';
const side119=[
 ['2cf9cac2c5826d7a06887dbe9a0a2ccc75bb85355df1ce5655fd9a0290362b47','23cd5319d3f79a3c7ca723c60606dfb82dd2a98b971ee36e91cf0229019b18c7'],
 ['630b092218ded2cd961ec2c5b64e95b28ac3c814479ab0f94fb273091b72a111','be241c7be220f7bbff35596b1420c5a006f19b8e1e866db24790e5429d3fcc0c']];
const desc={'117:north':[['08631a2f7d3ad9bbc223dc282925ea60c118e9b1dc2da32f298d3049f4f8b72b','aad008ab9f7facf1900a2b79f632d9fc948fcbc1501aec5f33d0b8dabfe14b7a']],
 '119:east':side119,'119:west':side119};
const [item,dir]=[Number(process.argv[2]),process.argv[3]],skins=(process.env.TONES||'light,ebony').split(',');
const opts={direction:dir,action:'walk',consumer:'world'};
const save=(skin,changes={},options={})=>JSON.parse(JSON.stringify(C.commit({id:'cuff-test',classId:'cyborg',equipment:{weapon:{def:item}},...options},{gender:'masculino',skinColor:skin,...changes},()=>true)));
const literal=save('light');Object.assign(literal.appearance96,{skinColor:'original',hairColor:'original',eyeColor:'original'});
const raw=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data), cm=()=>cv.createCanvas(512,512);
function draw(record,assets,frame,appearance){const c=cm();W.render(c.getContext('2d'),record,assets,{frame,appearance});const v=raw(c);c.width=1;return v;}
(async()=>{
 await api.ready;
 const base=api.selectVisual(literal,opts),parts=base.plan.parts, proof=desc[item+':'+dir];
 const expected=proof.map(([h,m])=>({url:'assets/'+m+'.png',sourceSHA256:h}));
 a.deepEqual(parts.map(x=>x.source.sha256),proof.map(x=>x[0]));
 a(!base.stockFinalTechWalkSavedPalette&&parts.every(x=>!x.skinMaterial));
 const r=api.selectVisual(save('light'),opts);a(r?.stockFinalTechWalkSavedPalette&&r.hdKind==='carry');
 const partsWithMask=parts.map((part,i)=>({...part,skinMaterial:expected[i]}));
 a.deepEqual(r.plan.parts,partsWithMask);
 a.deepEqual(r.base.pack,base.base.pack);a.equal(r.base.mirrorX,base.base.mirrorX);
 const d=r.base.pack.directions[dir];a.equal(d.clip.frames,16);a.equal(d.clip.fps,16);a.equal(d.clip.loop,true);
 const urls=W.requiredFiles(r),ims=new Map(await Promise.all(urls.map(async u=>[u,await load(u)])));
 const masked=new Map(),empty=cm();
 for(const k of r.base.sourceRefs)masked.set('tools/rework-base-hd/assets/'+k+'.png',empty);
 for(let j=0;j<parts.length;j++){
  const mask=ims.get(pre+expected[j].url),mat=cv.createCanvas(mask.width,mask.height),mc=mat.getContext('2d');
  mc.drawImage(mask,0,0);const mp=mc.getImageData(0,0,mat.width,mat.height);let count=0;
  for(let i=0;i<mp.data.length;i+=4){const w=mp.data[i]?255:0;mp.data.fill(w,i,i+4);if(w)count++;}
  a.equal(count,item===117?29:[89,8][j]);mc.putImageData(mp,0,0);masked.set(pre+parts[j].source.url,mat);
 }
 const projection=Array.from({length:16},(_,f)=>draw(base,masked,f,{skin:'original',hairColor:'original',eyeColor:'original'}));
 const approvedPreview={...base,plan:{...base.plan,parts:partsWithMask}};
 for(const skin of skins){
  const player=save(skin),before=JSON.stringify(player),src=api.selectVisual(player,opts);
  a(src?.stockFinalTechWalkSavedPalette);
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
    a(item===117?delta===29:delta>=90&&delta<=104);min=Math.min(min,delta);max=Math.max(max,delta);
   }
  }finally{bank.release();}
  a.equal(JSON.stringify(player),before);console.log(item,dir,skin,'16 PASS',min,max,'signed iris cosmetic deltas',eyesPixels);global.gc?.();
 }
 for(const [s,o] of [
  [save('light'),{...opts,action:'idle'}],[save('light'),{...opts,direction:'south'}], [save('light'),{...opts,consumer:'portrait'}],
  [save('light'),{...opts,weaponless:true}], [save('light',{eyeColor:'brown'}),opts],
  [save('light',{hairColor:'brown'}),opts],[save('light',{hairStyle:'hair-spiky'}),opts],[save('light',{eyeStyle:'face-almond'}),opts], [save('light',{}, {classId:'brawler'}),opts],
  [save('light',{}, {equipment:{weapon:{def:item,appearanceVariant:'unapproved'}}}),opts],
  [save('light',{}, {equipment:{weapon:{def:item},coat:{def:151}}}),opts]
 ])a(!api.selectVisual(s,o)?.stockFinalTechWalkSavedPalette,'out-of-envelope selected walk');
})().catch(e=>{console.error(e);process.exitCode=1});
