'use strict';
if(!process.env.MARE_PUNCH_GLOVE_SHARD){
 const {spawnSync}=require('node:child_process');
 for(const DIRS of (process.env.DIRS||'east,west').split(','))for(const SKINS of (process.env.SKINS||'porcelain,ebony').split(',')){
  const r=spawnSync(process.execPath,[...process.execArgv,__filename],{env:{...process.env,MARE_PUNCH_GLOVE_SHARD:'1',DIRS,SKINS},stdio:'inherit'});
  if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);
 }
 process.exit(0);
}
const fs=require('node:fs'),p=require('node:path'),a=require('node:assert/strict'),R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),C=process.env.CANDIDATE_DIR,
 {make,cv}=require(R+'/tests/rework-integration-support.cjs'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),
 candidate=C?require(C+'/player-rework-native-hd.js').create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas}):make();
const {records}=require(R+'/tools/rework-modular-outfits-hd/index.json');
const d=process.env.DIRS,skin=process.env.SKINS,o={action:'attack-unarmed',direction:d,consumer:'world'};
const create=(coat,gloves)=>JSON.parse(JSON.stringify(MareCharacterAppearance.commit({classId:'brawler',equipment:{legs:{def:133},coat:coat?{def:coat}:null,gloves:gloves?{def:gloves}:null,boots:null,head:null,weapon:null}}, {gender:'masculino',skinColor:skin},()=>true)));
(async()=>{await candidate.ready;let clips=0,frames=0;
for(const coat of (process.env.COATS||'0,151').split(',').map(Number))for(const g of (process.env.GLOVES||'26,131,138,145,152,159,166,173,180').split(',').map(Number)){
 const off=create(coat,0),on=create(coat,g),before=candidate.selectVisual(off,o),result=candidate.selectVisual(on,o), donor=records.find(x=>x.id==='frozen-male-glove'+g+'-'+d+'-attack-unarmed-native-layers');
 a(result?.id.includes(':own-side-punch-glove:'),JSON.stringify({d,skin,coat,g}));
 const old=before.pack.directions[d],current=result.pack.directions[d],glove=current.layers.at(-1);
 a.deepEqual(glove,donor.pack.directions[d].layers[1]);a.deepEqual({...current,layers:current.layers.slice(0,-1)},old);
 a.deepEqual(result.colorAppearance,before.colorAppearance);a.equal(result.slotRoutes.gloves.source,donor.id);a.deepEqual(result.omitted,[]);
 const bundles=await Promise.all([[off,before],[on,result]].map(([player,source])=>candidate.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})));
 const canvas=cv.createCanvas(640,640),ctx=canvas.getContext('2d'),frozen=JSON.stringify(on);
 let min=Infinity,max=0;
 const draw=(who,f)=>{let source;a(bundles[who===off?0:1].draw({save(){},restore(){},drawImage(v){source=v;}},who,{...o,progress:(f+.2)/8}));a.equal(source.width,640);return source};
 try{for(let f=0;f<8;f++){
  const x=draw(off,f),y=draw(on,f),pixels=s=>s.getContext('2d').getImageData(0,0,640,640).data,original=pixels(x),actual=pixels(y);
  const img=await load('tools/rework-modular-outfits-hd/assets/'+glove.frames[f]+'.png');
  ctx.clearRect(0,0,640,640);ctx.drawImage(img,0,0);const alpha=pixels(canvas);
  ctx.clearRect(0,0,640,640);ctx.drawImage(x,0,0);ctx.drawImage(img,0,0);const expected=pixels(canvas);
  const u=z=>new Uint32Array(z.buffer,z.byteOffset,z.byteLength/4);const [orig,act,mask,replay]=[original,actual,alpha,expected].map(u);let n=0,opaque=0,mismatch=0;
  for(let j=0;j<640*640;j++){
   const b=orig[j],v=act[j],t=mask[j],check=replay[j]; // only one fixed contribution is new
   if(b!==v){a(t>>>24,JSON.stringify({d,skin,coat,g,f,j}));a((v>>>24)>=(b>>>24));n++;}
   if(t>>>24===255){a.equal(v,t);opaque++;}
   if(v!==check)mismatch++;
  }
  a(n>0,JSON.stringify({d,skin,coat,g,f,n,opaque}));a.equal(mismatch,0);min=Math.min(min,n);max=Math.max(max,n);frames++;
 }}finally{bundles.forEach(b=>b.release());canvas.width=1;}
 a.deepEqual(candidate.selectVisual(off,o),before);a.equal(JSON.stringify(on),frozen);
 a(!candidate.selectVisual({...on,equipment:{...on.equipment,gloves:{def:25}}},o)?.id.includes(':own-side-punch-glove:'));
 clips++;console.log(d,skin,coat,g,min,max);global.gc?.();
}
a(clips>0);console.log('PASS',JSON.stringify({clips,frames}));
})().catch(e=>{console.error(e);process.exitCode=1});
