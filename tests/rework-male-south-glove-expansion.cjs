const a=require('node:assert/strict'),path=require('node:path');
const P=path.resolve(process.argv[2]||path.join(__dirname,'..')),A=require(P+'/character-appearance'),{make,cv}=require(P+'/tests/rework-integration-support.cjs'),api=process.env.CANDIDATE_DIR?require(process.env.CANDIDATE_DIR+'/player-rework-native-hd.js').create({fetchJSON:async f=>JSON.parse(require('fs').readFileSync(P+'/'+f)),loadImage:require(P+'/tools/rework-hd-test-loader.cjs').create(P),makeCanvas:cv.createCanvas}):make();
const load=require(P+'/tools/rework-hd-test-loader.cjs').create(P);
function actor(g,t,h){return JSON.parse(JSON.stringify(A.commit({classId:'brawler',equipment:{head:null,coat:null,legs:null,boots:null,weapon:null,gloves:g?{def:g}:null}},{gender:'masculino',hairStyle:h,hairColor:'blue',eyeStyle:'original',eyeColor:'blue',skinColor:t},()=>true)))}
function pixels(im){return Buffer.from(im.getContext('2d').getImageData(0,0,512,512).data)}
(async()=>{await api.ready;let n=0;
 for(const [direction,action,frames] of [['south','idle',1],['south','walk',16]].filter(r=>!process.env.ACTION||r[1]===process.env.ACTION))
 for(const h of process.env.HAIR?[process.env.HAIR]:['original','hair-cropped'])for(const t of process.env.SKIN?[process.env.SKIN]:['porcelain','ebony']){
  const options={consumer:'world',direction,action},off=actor(null,t,h);
  const bare=await api.prepareConfiguration([{player:off,options}]);
  function draw(bundle,actor,frame){let im;a(bundle?.draw({save(){},restore(){},drawImage(v){im=v;}},actor,{...options,progress:(frame+.25)/frames}));a.equal(im.width,512);return im;}
  const baseline=Array.from({length:frames},(_,f)=>pixels(draw(bare,off,f)));
  for(const g of [131,138,145,152,159,166,173,180]){
   const p=actor(g,t,h),before=JSON.stringify(p),r=api.selectVisual(p,options),q=r?.authoredBareGloveLocomotion??r?.authoredSouthIdleGlove;
   a(q,`missing ${direction}/${action}/${g}/${h}/${t}`);a.equal(q.base.id,api.selectVisual(off,options).id);a.equal(r.slotRoutes.gloves.item,g);a.deepEqual(r.omitted,[]);
   const images=new Map(await Promise.all(q.hashes.map(async sha=>[sha,await load('tools/rework-modular-outfits-hd/assets/'+sha+'.png')])));
   const d=q.base.pack.directions[direction],p0=q.base.pack,pack={...p0,directions:{[direction]:{...d,layers:q.gloves}}};
   const bundle=await api.prepareConfiguration([{player:p,options}]);
   for(let f=0;f<frames;f++){
    const tile=cv.createCanvas(512,512), tc=tile.getContext('2d');
    global.ReworkAccessoryVendor.compositor.render(tc,pack,images,{direction,frame:f,density:4});
    const m=pixels(tile),on=pixels(draw(bundle,p,f)),b=baseline[f];let diff=0;
    for(let j=0;j<m.length;j+=4)if(b.readUInt32LE(j)!==on.readUInt32LE(j)){a(m[j+3]>0,`non-glove delta ${direction}/${action}/${g}/${h}/${t}/${f}/${j/4%512},${j/2048|0}`);diff++;}
    a(diff>200);a.deepEqual(pixels(draw(bare,off,f)),b);tile.width=1;n++;
   }
   a.equal(JSON.stringify(p),before);
   for(const more of [{boots:{def:155}},{weapon:{def:0}},{weapon:{def:16}}]){const next=api.selectVisual({...p,equipment:{...p.equipment,...more}},options);a(!next?.authoredSouthIdleGlove&&!next?.authoredBareGloveLocomotion&&!next?.independentCarryGlove);}
   for(const x of [{direction:'east'},{direction:'west'},{action:'attack-unarmed'},{consumer:'lobby'},{weaponless:true}])a(!api.selectVisual(p,{...options,...x})?.authoredBareGloveLocomotion);
   bundle.release();global.gc?.();
  }
  bare.release();global.gc?.();
 }
 a(n>0);console.log('PASS',n,process.env.ACTION,process.env.HAIR,process.env.SKIN)
})().catch(e=>{console.error(e);process.exit(1)})
