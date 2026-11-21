'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const P=path.resolve(__dirname,'..');
const {make,cv}=require(P+'/tests/rework-integration-support.cjs'),A=require(P+'/character-appearance'),rt=make();
const loader=require(P+'/tools/rework-hd-test-loader.cjs').create(P);
async function frame(bundle,p,o,i,n){let im;assert(bundle.draw({save(){},restore(){},drawImage(v){im=v}},p,{...o,time:i/n,progress:(i+.1)/n}));assert(im);return [Buffer.from(im.getContext('2d').getImageData(0,0,im.width,im.height).data),im.width,im.height];}
(async()=>{await rt.ready;let results={};for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack-unarmed'])for(const item of [21,133])for(const c of [6])for(const skinColor of ['light','ebony']){const o={action,direction,consumer:'world'},profile=A.normalize({gender:'masculino',hairStyle:'hair-spiky',hairColor:'black',skinColor,eyeStyle:'original',eyeColor:'blue'}),off={classId:'brawler',appearance96:profile,equipment:{coat:{def:c}}},on={...off,equipment:{...off.equipment,legs:{def:item}}};const rb=rt.selectVisual(off,o),rf=rt.selectVisual(on,o);
 const expected=(item===21?['south','east','west']:['south']).includes(direction)&&['idle','walk'].includes(action);
 assert.equal(rf?.attachedOwnedPants?.item===item,expected,item+'/'+direction+'/'+action);if(!expected)continue;
 const pack=rf.pack.directions[direction],n=pack.clip.frames,fb=await rt.prepareConfiguration([{player:off,options:o}]),ff=await rt.prepareConfiguration([{player:on,options:o}]);try{
 const l=pack.layers.find(q=>new RegExp('^(?:pants'+item+'-|own'+item+'-)').test(q.id));let count=0, outside=0;
 for(let i=0;i<n;i++){
  const [a,w,h]=await frame(fb,off,o,i,n),[b,w2,h2]=await frame(ff,on,o,i,n);assert(w===w2&&h===h2);assert((await frame(fb,off,o,i,n))[0].equals(a),'remove failed');
  const mask=cv.createCanvas(w,h).getContext('2d'),src=await loader('tools/rework-modular-outfits-hd/assets/'+(l.frames?.[i]??l.source)+'.png');mask.drawImage(src,0,0);const m=mask.getImageData(0,0,w,h).data;
  for(let j=0;j<a.length;j+=4)if(a.readUInt32LE(j)!==b.readUInt32LE(j)){count++;if(m[j+3]===0)outside++;}
 }
 assert.equal(outside,0);assert(count>500);console.log('CHECK',item,direction,action,c,skinColor,n,count,outside);
 results[item+'/'+direction+'/'+action+'/'+c+'/'+skinColor]={n,count,outside};
 }finally{fb.release();ff.release();}
 }assert.equal(Object.keys(results).length,16);assert.equal(Object.values(results).reduce((n,r)=>n+r.n,0),136);console.log(JSON.stringify(results));})().catch(e=>{console.error(e);process.exitCode=1;});
