'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const P=path.resolve(__dirname,'..');
const {make,cv}=require(P+'/tests/rework-integration-support.cjs'),A=require(P+'/character-appearance'),rt=make();
const loader=require(P+'/tools/rework-hd-test-loader.cjs').create(P);
async function frame(bundle,p,o,i,n){let im;assert(bundle.draw({save(){},restore(){},drawImage(v){im=v}},p,{...o,time:i/n,progress:(i+.1)/n}));assert(im);return [Buffer.from(im.getContext('2d').getImageData(0,0,im.width,im.height).data),im.width,im.height];}
(async()=>{await rt.ready;let results={};for(const direction of ['east','west'])for(const action of ['walk'])for(const item of [133])for(const c of [6])for(const skinColor of ['light','ebony']){const o={action,direction,consumer:'world'},profile=A.normalize({gender:'masculino',hairStyle:'hair-spiky',hairColor:'black',skinColor,eyeStyle:'original',eyeColor:'blue'}),off={classId:'brawler',appearance96:profile,equipment:{coat:{def:c}}},on={...off,equipment:{...off.equipment,legs:{def:item}}};const rb=rt.selectVisual(off,o),rf=rt.selectVisual(on,o);
 if(rf?.attachedOwnedPants?.item!==item){assert.fail(JSON.stringify({item,direction,action,c,skinColor,off:rb?.id,on:rf?.id}));}
 const pack=rf.pack.directions[direction],n=pack.clip.frames,fb=await rt.prepareConfiguration([{player:off,options:o}]),ff=await rt.prepareConfiguration([{player:on,options:o}]);try{
 const ls=pack.layers.filter(q=>q.id==='pants133-visible-cloth-only');assert.equal(ls.length,1);
 assert.deepEqual(rf.pack.directions[direction].layers.filter(l=>!ls.includes(l)),rb.pack.directions[direction].layers);
 assert.deepEqual(rf.colorAppearance,rb.colorAppearance);
 let count=0,outside=0;
 for(let i=0;i<n;i++){
  const [a,w,h]=await frame(fb,off,o,i,n),[b,w2,h2]=await frame(ff,on,o,i,n);
  assert(w===w2&&h===h2);assert((await frame(fb,off,o,i,n))[0].equals(a),'remove failed');
  const stage=cv.createCanvas(w,h),mask=stage.getContext('2d');
  const map=new Map;
  for (const l of ls){const sha=l.frames?.[i]??l.source;map.set(sha,await loader('tools/rework-modular-outfits-hd/assets/'+sha+'.png'));}
  const full=rf.pack, V=global.ReworkAccessoryVendor.compositor;
  V.render(mask,{...full,directions:{[direction]:{...pack,layers:ls}}},map,{direction,frame:i,density:4,clear:false});
  const m=mask.getImageData(0,0,w,h).data;let inner=0;
  for(let j=0;j<a.length;j+=4)if(a.readUInt32LE(j)!==b.readUInt32LE(j)){count++;inner++;if(m[j+3]===0)outside++;}
  assert(inner>500);
  stage.width=stage.height=1;
 }
 assert.equal(outside,0);assert(count>500);console.log('CHECK',item,direction,action,c,skinColor,n,count,outside);
 results[item+'/'+direction+'/'+action+'/'+c+'/'+skinColor]={n,count,outside};
 }finally{fb.release();ff.release();}
 }assert.equal(Object.keys(results).length,4);assert.equal(Object.values(results).reduce((n,r)=>n+r.n,0),64);console.log('PASS P133 retained the approved coat and arms in 64 E/W walk phases');})().catch(e=>{console.error(e);process.exitCode=1;});
