'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make,cv}=require('./rework-integration-support.cjs'),load=require('../tools/rework-hd-test-loader.cjs').create(root);
const {weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs'),planes=require('./fixtures/south-focus-weapon-planes.json');
const file=n=>require(path.join(root,n)),world=file('paper-doll-96-lobby.js'),look=file('character-appearance.js'),catalog=file('tools/paper-doll-96-v3/weapons.json');
const fit=file('tools/rework-combat-wardrobe/index.json').southFocusPants;
const weapon=Number(process.argv[2]),tone=process.argv[3]||'ebony';assert(planes[weapon]&&['light','ebony'].includes(tone));
const c640=()=>cv.createCanvas(640,640),pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
function copy(image){const c=c640();c.getContext('2d').drawImage(image,0,0);return c;}
function underWeapon(image,metal,mask){
 const canvas=copy(image),x=canvas.getContext('2d');x.drawImage(metal,0,0);
 if(mask){
  // The signed grip uses straight RGBA at the palm. Canvas blends in
  // premultiplied channels, which rounds differently on transparent cloth edges.
  const inside=pix(copy(mask)),front=pix(image),rear=pix(copy(metal)),top=x.getImageData(0,0,640,640);
  for(let i=0;i<inside.length;i+=4){
   if(inside[i]!==255||!front[i+3]||!rear[i+3])continue;
   const a=front[i+3]/255,b=rear[i+3]*(1-a)/255;
   for(let ch=0;ch<3;ch++)top.data[i+ch]=Math.round((front[i+ch]*a+rear[i+ch]*b)/(a+b));
   top.data[i+3]=Math.round((a+b)*255);
  }
  x.putImageData(top,0,0);
 }
 return canvas;
}
function exactly(actual,expected,label){
 const a=pix(actual),e=pix(expected),first=a.findIndex((v,k)=>v!==e[k]);
 assert.equal(first,-1,label+' at '+[Math.floor(first/4)%640,Math.floor(first/2560)]);return a;
}
async function main(){
 const api=make();await api.ready;
 const player=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},{gender:'masculino',skinColor:tone,hairColor:tone==='ebony'?'blue':'white',eyeColor:tone==='ebony'?'green':'amber',eyeStyle:'original',hairStyle:'original'},()=>true);
 const options={action:'attack-focus',direction:'south',consumer:'world'},rows=[],saved=JSON.stringify(player.appearance96);
 async function prepare(eq,source){
  const p={...player,equipment:Object.fromEntries(Object.entries(eq).map(([s,id])=>[s,{def:id}]))};
  const r=source||world.selectWorldHDOnly(api,catalog,p,options);
  assert.deepEqual(r.omitted||[],[]);
  if(!source)for(const [s,id] of Object.entries(eq)){assert.equal(r.slotRoutes[s].item,id);assert.equal(r.slotRoutes[s].quality,'hd');}
  const b=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:r})});
  return {r,draw(f){let c;assert(b.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...options,progress:(f+.1)/8}));return c;},release:()=>b.release()};
 }
 const bare=await prepare({weapon}),capped=await prepare({weapon,head:136}),witness=await prepare({weapon,legs:133});
 const base=witness.r.independentPlan.base;assert.equal(base.sourcePackSHA256,fit.sha);witness.release();
 const body=await prepare({},base),refs=[];
 for(let f=0;f<8;f++){
  const shapes=[planes[weapon][f]].flat();
  const [metal,mask]=await Promise.all(shapes.map(sha=>load('tools/rework-weapon-layers-hd/assets/'+sha+'.png')));
  const registered=body.draw(f),signed=bare.draw(f),ref=underWeapon(registered,metal,mask);
  exactly(signed,ref,'signed undressed weapon '+weapon+'/'+f);ref.width=1;
  const a=pix(signed),h=pix(capped.draw(f)),helmet=[];
  for(let k=0;k<a.length;k+=4)if(a.readUInt32LE(k)!==h.readUInt32LE(k))helmet.push(k);
  assert(helmet.length>1000&&helmet.every(k=>k<314*2560));
  refs.push({registered,metal,mask,signed:a,h,helmet});
 }
 for(const id of gear[1]){
  const single=await prepare({weapon,legs:id}),withHat=await prepare({head:136,legs:id,weapon});
  assert.equal(single.r.slotRoutes.legs.source,fit.items[id].source+'@'+fit.receiver);
  assert.deepEqual(single.r.slotRoutes.legs,withHat.r.slotRoutes.legs);
  assert.deepEqual(capped.r.slotRoutes.head,withHat.r.slotRoutes.head);
  const fabric=await load('tools/rework-modular-outfits-hd/assets/'+fit.items[id].sha+'.png');
  for(let f=0;f<8;f++){
   const {registered,metal,mask,signed,h,helmet}=refs[f],expected=copy(registered),x=expected.getContext('2d');
   if(fit.items[id].replace){
    const rgba=x.getImageData(0,0,640,640);for(const [from,n] of fit.phases[f].cut)rgba.data.fill(0,from*4,(from+n)*4);x.putImageData(rgba,0,0);
   }
   const lower=pix(expected);x.drawImage(fabric,0,0);const rgba=x.getImageData(0,0,640,640);
   let touches=0;const ink=pix(copy(fabric));
   for(const [from,n] of fit.phases[f].hands){for(let j=from;j<from+n;j++)if(ink[4*j+3])touches++;
    rgba.data.set(lower.subarray(4*from,4*(from+n)),4*from);}
   x.putImageData(rgba,0,0);const full=underWeapon(expected,metal,mask);
   const result=exactly(single.draw(f),full,'trousers '+[weapon,id,f].join('/'));
   let changed=0;for(let k=0;k<result.length;k+=4)if(result.readUInt32LE(k)!==signed.readUInt32LE(k))changed++;
   assert(changed>1000);const fx=full.getContext('2d'),mixed=fx.getImageData(0,0,640,640);
   for(const k of helmet)mixed.data.set(h.subarray(k,k+4),k);fx.putImageData(mixed,0,0);
   exactly(withHat.draw(f),full,'helmet and trousers '+[weapon,id,f].join('/'));
   rows.push({id,phase:f,source:fit.items[id].sha,changed,handOverlap:touches});expected.width=full.width=1;
  }
  single.release();withHat.release();
 }
 body.release();bare.release();capped.release();assert.equal(saved,JSON.stringify(player.appearance96));
 assert.equal(rows.length,80);assert(rows.some(r=>r.phase===6&&r.handOverlap>200));
 if(process.env.HD_FOCUS_TROUSER_RESULTS)fs.writeFileSync(process.env.HD_FOCUS_TROUSER_RESULTS,JSON.stringify(rows));
 console.log(weapon,tone,'80 trousers and 80 trousers with helmet, including actual grip');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
