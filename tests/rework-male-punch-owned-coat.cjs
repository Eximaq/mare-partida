'use strict';
// Test shards in separate processes to reclaim native Canvas allocations.
if(!process.env.MARE_PUNCH_COAT_SHARD){
 const {spawnSync}=require('node:child_process'),dirs=(process.env.DIRS||'north,south,east,west').split(','),
  tones=(process.env.SKINS||'porcelain,ebony').split(',');
 for(const DIRS of dirs)for(const SKINS of tones){
  const result=spawnSync(process.execPath,[...process.execArgv,__filename],{
   env:{...process.env,MARE_PUNCH_COAT_SHARD:'1',DIRS,SKINS},stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
 }
 process.exit(0);
}
const fs=require('node:fs'),p=require('node:path'),a=require('node:assert/strict'),R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),C=process.env.CANDIDATE_DIR,
 {make,cv}=require(R+'/tests/rework-integration-support.cjs'),V=global.ReworkAccessoryVendor.compositor,
 stock=make(),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),
 candidate=C?require(C+'/player-rework-native-hd.js').create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas}):stock;
const opts=direction=>({action:'attack-unarmed',direction,consumer:'world'});
const create=(pants,coat,gloves,skin)=>JSON.parse(JSON.stringify(MareCharacterAppearance.commit({classId:'brawler',equipment:{legs:{def:pants},coat:coat?{def:coat}:null,gloves:gloves?{def:gloves}:null,boots:null,head:null,weapon:null}}, {gender:'masculino',skinColor:skin},()=>true)));
(async()=>{await Promise.all([stock.ready,candidate.ready]);let clips=0,frames=0;
const colors=process.env.SKINS?.split(',')||Object.keys(MareCharacterAppearance.skins);
for(const d of process.env.DIRS?.split(',')||['north','south','east','west'])for(const pants of ['north','south'].includes(d)?[22,133]:[133])for(const gloves of process.env.GLOVES?.split(',').map(Number)||[0,26,159])for(const coat of [6,7,130,137,144,158,165,172,179])for(const skin of colors){
 const o=opts(d),off=create(pants,0,gloves,skin),on=create(pants,coat,gloves,skin),b=candidate.selectVisual(off,o),r=candidate.selectVisual(on,o);
 if(!r?.id.includes(':own-punch-coat:'))continue;
 if(C)a(!stock.selectVisual(on,o));
 a(b?.pack&&!b.bodyOcclusion);a.deepEqual(r.colorAppearance,b.colorAppearance);a.equal(r.slotRoutes.coat.item,coat);a.deepEqual(r.omitted,[]);
 const d0=b.pack.directions[d],q=r.pack.directions[d],parts=q.layers.filter(l=>!d0.layers.includes(l));
 a.deepEqual(q.layers.filter(l=>!parts.includes(l)),d0.layers);a.deepEqual(q.clip,d0.clip);
 const images=new Map(await Promise.all(parts.map(async l=>{
   const im=await load('tools/rework-modular-outfits-hd/assets/'+l.source+'.png'),c=cv.createCanvas(640,640);a.equal(im.width,512);a.equal(im.height,512);c.getContext('2d').drawImage(im,64,64);return [l.source,c];
 })));
 const glovePass=d0.layers.find(l=>l.id==='registered-frozen-glove-native-attack');
 const gloveFrames=glovePass?await Promise.all(glovePass.frames.map(h=>load('tools/rework-modular-outfits-hd/assets/'+h+'.png'))):null;
 const compose=opts=>candidate.prepareConfiguration([{player:opts===b?off:on,source:opts,options:o}],{resolve:x=>x});
 const frozen=JSON.stringify(on),c=await Promise.all([compose(b),compose(r)]);
 const extract=(bundle,actor,f)=>{let x;a(bundle.draw({save(){},restore(){},drawImage(c){x=c;}},actor,{...o,progress:(f+.2)/8}));a.equal(x.width,640);return new Uint32Array(x.getContext('2d').getImageData(0,0,640,640).data.buffer);};
 let min=Infinity,max=0;
 try{for(let f=0;f<8;f++){
  const [x,y]=[extract(c[0],off,f),extract(c[1],on,f)],m=cv.createCanvas(640,640),cx=m.getContext('2d');
  V.render(cx,{...r.pack,directions:{[d]:{...q,layers:parts}}},images,{direction:d,frame:f,density:4});
  const alpha=cx.getImageData(0,0,640,640).data;let changed=0,glovePixels=0;
  let gloveRGBA;if(gloveFrames){cx.clearRect(0,0,640,640);cx.drawImage(gloveFrames[f],0,0);gloveRGBA=new Uint32Array(cx.getImageData(0,0,640,640).data.buffer);}
  if(gloveRGBA)for(let j=0;j<x.length;j++)if((gloveRGBA[j]>>>24)===255&&x[j]===gloveRGBA[j]){a.equal(y[j],x[j],`own opaque glove occluded at ${j}`);glovePixels++;}
  if(gloveFrames)a(glovePixels>0);
  for(let j=0;j<x.length;j++)if(x[j]!==y[j]){a(alpha[j*4+3],`outside coat ${d} ${pants} ${gloves} ${coat} ${skin} ${f} ${j}`);a((y[j]>>>24)>=(x[j]>>>24),'changed nonopaque pose silhouette');changed++;}
  a(changed>2000);min=Math.min(min,changed);max=Math.max(max,changed);m.width=1;frames++;
 }}finally{c.forEach(x=>x.release());images.forEach(x=>x.width=1);}
 a.deepEqual(candidate.selectVisual(off,o),b);a.equal(JSON.stringify(on),frozen);clips++;
 console.log(d,pants,gloves,coat,skin,min,max);global.gc?.();
}
a(clips>0);console.log('PASS',JSON.stringify({clips,frames}));
})().catch(e=>{console.error(e);process.exitCode=1});
