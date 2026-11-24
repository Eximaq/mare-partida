const fs=require('fs'), assert=require('assert/strict'),R=process.env.STAGE||require('node:path').resolve(__dirname,'..'),q=f=>require(R+'/'+f),{make,cv}=q('tests/rework-integration-support.cjs'),A=q('character-appearance'),W=q('paper-doll-96-lobby'),C=q('tools/paper-doll-96-v3/weapons.json'),D=q('tools/rework-modular-outfits-hd/index.json');
const api=make(),load=q('tools/rework-hd-test-loader.cjs').create(R), px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data),pool='tools/rework-modular-outfits-hd/assets/';
const items=(process.env.BOOTS||'8,134,141,148,162').split(',').map(Number),dirs=(process.env.DIRS||'east,west').split(',');
const drawn=(bank,p,o,progress)=>{let c;assert(bank.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...o,progress}));return [c,px(c)];};
(async()=>{await api.ready;
for(const id of items)for(const direction of dirs)for(const action of ['idle','walk']){
 try{
 const o={consumer:'world',action,direction},own=l=>l.id.startsWith('boot'+id+'-'), get=p=>W.selectWorldHDOnly(api,C,p,o);
 const actor=(skinColor,boots,original=false)=>({classId:'brawler',appearance96:original?{gender:'masculino',skinColor:'original',hairColor:'original',hairStyle:'original',eyeColor:'original',eyeStyle:'original'}:A.normalize({gender:'masculino',skinColor}),equipment:{legs:{def:133},coat:{def:151},...(original&&direction!=='south'&&{gloves:{def:152}}),...(boots&&{boots:{def:id}})}});
 const ar=actor('light',true,true), arch=get(ar), cr=arch?.pack?.directions?.[direction], witness=cr?.layers.filter(own)||[];
 assert(witness.length>=4,'signed archive own passes missing');
 const ref=await api.prepareConfiguration([{player:ar,source:arch,options:o}],{resolve:x=>x});
 const expected=[];
 for(let i=0;i<cr.clip.frames;i++)expected.push(drawn(ref,ar,o,(i+.25)/cr.clip.frames)[1]);
 ref.release();
 const result=[];
 for(const skinColor of ['light','ebony']){
  const p=actor(skinColor,true),off=actor(skinColor,false),r=get(p),b=get(off),d=r?.pack?.directions[direction], od=b?.pack?.directions[direction], layers=d?.layers.filter(own)||[];
  assert(layers.length===witness.length&&!r.omitted?.length&&!r.visualDegraded,'strict own mount missing: '+r?.id);
  assert.deepEqual(r.colorAppearance,b.colorAppearance);assert.equal(r.colorAppearance.skin,skinColor);
  assert.deepEqual(d.layers.filter(x=>!own(x)),od.layers);
  for(const k of ['clip','rest','poses'])assert.deepEqual(d[k],od[k]);
  assert.deepEqual(layers,witness);
  const banks=await Promise.all([[p,r],[off,b]].map(([player,source])=>api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})));
  try{const frames=[];
  for(let i=0;i<d.clip.frames;i++){
   const prog=(i+.25)/d.clip.frames,[c,X]=drawn(banks[0],p,o,prog),[,Y]=drawn(banks[1],off,o,prog);
   const m=cv.createCanvas(c.width,c.height),mc=m.getContext('2d');
   for(const l of layers)mc.drawImage(await load(pool+(l.frames?.[i]||l.source)+'.png'),0,0);
   const mask=px(m),Z=expected[i];let bottom=0,visible=0,changes=0,soleMax=0,soleCount=0;
   for(let k=3;k<mask.length;k+=4)if(mask[k]>=128)bottom=(k/4/c.width)|0;
   for(let k=0;k<X.length;k+=4){
    if(X.readUInt32LE(k)!==Y.readUInt32LE(k)){assert(mask[k+3],'outside boot alpha');changes++;if(mask[k+3]>=128&&X[k+3]>=128)visible++;}
    if(k/4/c.width>=bottom-15&&mask[k+3]>=128){soleCount++;for(let n=0;n<4;n++)soleMax=Math.max(soleMax,Math.abs(X[k+n]-Z[k+n]));}
   }
   assert(visible>=100&&soleCount>=30&&soleMax<=3,JSON.stringify({id,direction,action,skinColor,i,visible,soleCount,soleMax}));
   frames.push({i,visible,changes,soleCount,soleMax});m.width=1;
  }result.push({skinColor,id:r.id,frames});}finally{banks.forEach(x=>x.release());global.gc?.();}
 }
 console.log(JSON.stringify({key:['male',action,direction,'boots',id],mount:result,archive:arch.id,tracks:witness.map(l=>l.id)}));
 }catch(e){throw new Error([id,direction,action].join('/')+': '+e.message,{cause:e});}
}
})().catch(e=>{console.error(e);process.exit(1)});
