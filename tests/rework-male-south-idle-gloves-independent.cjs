const a=require('node:assert/strict');
const P=require('node:path').resolve(__dirname,'..'), A=require(P+'/character-appearance'),{make,cv}=require(P+'/tests/rework-integration-support.cjs'),api=make();
const load=require(P+'/tools/rework-hd-test-loader.cjs').create(P);
const options={consumer:'world',direction:'south',action:'idle'};
function actor(g,t,h){return A.commit({classId:'brawler',equipment:g?{gloves:{def:g}}:{}},{gender:'masculino',hairStyle:h,hairColor:'blue',eyeStyle:'original',eyeColor:'blue',skinColor:t},()=>true)}
(async()=>{await api.ready;let n=0;
 for(const g of [25,26])for(const h of ['original','hair-cropped'])for(const t of Object.keys(A.skins)){
  const off=actor(null,t,h),p=actor(g,t,h),before=JSON.stringify(p),r=api.selectVisual(p,options);
  a(r?.authoredSouthIdleGlove,`missing ${g}/${h}/${t}`); a.equal(r.slotRoutes.gloves.item,g);a.equal(r.slotRoutes.gloves.quality,'hd');
  const mask=cv.createCanvas(512,512),mc=mask.getContext('2d');
  for(const sha of r.authoredSouthIdleGlove.hashes)mc.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+sha+'.png'),0,0);
  const m=mc.getImageData(0,0,512,512).data;
  const bundle=await api.prepareConfiguration([{player:p,options}]),base=await api.prepareConfiguration([{player:off,options}]);
  const draw=(b,x)=>{let im;a(b.draw({save(){},restore(){},drawImage(v){im=v;}},x,{...options,progress:0}));a.equal(im.width,512);return Buffer.from(im.getContext('2d').getImageData(0,0,512,512).data)};
  const bare=draw(base,off),on=draw(bundle,p);let diff=0;
  for(let j=0;j<m.length;j+=4)if(bare.readUInt32LE(j)!==on.readUInt32LE(j)){a(m[j+3]>0,`non-glove delta ${g}/${h}/${t} ${j/4%512},${j/2048|0}`);diff++;}
  a(diff>500); a.deepEqual(draw(base,off),bare);a.equal(JSON.stringify(p),before);
  a(!api.selectVisual(p,{...options,direction:'east'})?.authoredSouthIdleGlove);a(!api.selectVisual({...p,equipment:{...p.equipment,boots:{def:155}}},options)?.authoredSouthIdleGlove);
  base.release();bundle.release();mask.width=1;n++;global.gc?.();
 }
 a.equal(n,32);console.log('PASS 32 normal World scope: G25/G26, 8 tones, named cropped/Original blue hair; glove alpha sole affected domain and remove exact')
})().catch(e=>{console.error(e);process.exit(1)})
