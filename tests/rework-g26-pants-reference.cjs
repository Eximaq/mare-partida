const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),vm=require('node:vm');
const base=path.resolve(__dirname,'..'),imp=f=>require(path.join(base,f)),{cv,make}=imp('tests/rework-integration-support.cjs');
vm.runInThisContext(fs.readFileSync(path.join(base,'tools/rework-accessories/vendor.js'),'utf8'));
global.ReworkAccessoryVendor=global.ReworkAccessoryVendor||global.MareReworkAccesssoryVendor;
const loader=imp('tools/rework-hd-test-loader.cjs').create(base);
const options={loadImage:loader,fetchJSON:async p=>JSON.parse(fs.readFileSync(path.join(base,p))),makeCanvas:cv.createCanvas};
const baseline=process.env.KAIZOKU_BASELINE_NATIVE?require(process.env.KAIZOKU_BASELINE_NATIVE).create(options):null;
const rt=make(options);
const index=imp('tools/rework-modular-outfits-hd/index.json'),m=new Map(index.records.map(r=>[r.id,r])),
 vendor=imp('tools/rework-accessories/vendor.js'),painter=imp('player-rework-modular-outfits-hd.js').create(index,{vendor});
const ds=process.env.DIRECTION||'east',original={gender:'masculino',skinColor:'original',eyeColor:'original',hairColor:'original',hairStyle:'original',eyeStyle:'original'};
const player=(p,g)=>({appearance96:original,equipment:{legs:{def:p},coat:{def:151},boots:{def:155},gloves:{def:g}}});
const hash=a=>require('crypto').createHash('sha256').update(a).digest('hex'),png=c=>c.getContext('2d').getImageData(0,0,512,512).data;
const gl=(l,g)=>l.id.startsWith('glove'+g+'-')||l.id.startsWith('equip-glove-'+g)||l.id==='explicit-native-glove-west-mirror';
const pants=(l,p)=>l.id.startsWith('pants'+p+'-');
async function isolated(r,n,F){
 const d=r.pack.directions[ds],rr={...r,pack:{...r.pack,directions:{[ds]:{...d,layers:d.layers.filter(n)}}}};
 const images=new Map();for(const f of painter.requiredFiles(rr))images.set(f,await loader(f));
 const out=[];
 for(let frame=0;frame<F;frame++){
  const c=cv.createCanvas(512,512);painter.render(c.getContext('2d'),rr,images,{frame});out.push(new Uint8Array(png(c)));c.width=c.height=0;
 }
 return out;
}
async function draw(p,g,action,fn){
 const actor=player(p,g),o={direction:ds,action,consumer:'world'},source=rt.selectVisual(actor,o);
 const F=source.pack.directions[ds].clip.frames,bundle=await rt.prepareConfiguration([{player:actor,options:o,source}],{resolve:p=>p});
 assert.equal(bundle.coverage[0].frames,F);
 try{for(let frame=0;frame<F;frame++){
  const c=cv.createCanvas(680,700),ctx=c.getContext('2d'),old=ctx.drawImage.bind(ctx);let out;
  ctx.drawImage=(s,...args)=>{out=s;old(s,...args);};
  assert(bundle.draw(ctx,actor,{...o,x:330,y:490,progress:(frame+.25)/F,frame}));
  assert(out?.width===512&&out?.height===512);
  fn(png(out),frame,source);
  c.width=c.height=0;
 }}finally{bundle.release();}
}
require('node:test')('G26 lateral reference natural hand/slot group preserves C151/B155 in world draw',async()=>{
 await Promise.all([baseline?.ready,rt.ready]);let newCases=0,proofs=0;
 for(const action of ['idle','walk']){
  const o={direction:ds,action,consumer:'world'},F=action==='idle'?1:16;
  for(const pants of [133,140,147,154,161,168,175,182])for(const g of [25,26,131,138,145,152,159,166,173,180]){
   const p=player(pants,g),after=rt.selectVisual(p,o),before=baseline?.selectVisual(p,o);
   assert(after);
   if(baseline&&!before){assert.equal(after.slotRoutes.gloves.item,g);assert.equal(after.slotRoutes.legs.item,pants);newCases++;}
   assert.deepEqual(after.equipment,{torso:151,pants,gloves:g,boots:155});
   assert.equal(after.pack.directions[ds].clip.frames,F);
  }
  const gr=g=>m.get(`frozen-male-glove${g}-${ds}-${action}-native-layers`);
  const pr=p=>m.get(`frozen-male-pants${p}-${ds}-${action}-v47`);
  const masks={};for(const g of [26,145,180]) masks[g]=await isolated(gr(g),l=>gl(l,g),F);
  for(const pants of [147,175]){
   const reference=[];await draw(pants,26,action,(bytes,f)=>{reference[f]=new Uint8Array(bytes);proofs++;});
   let changed=0;
   for(const g of [145,180])await draw(pants,g,action,(bytes,f)=>{
    const a=masks[26][f],b=masks[g][f],source=reference[f];
    for(let k=0;k<bytes.length;k+=4)if([0,1,2,3].some(j=>bytes[k+j]!==source[k+j])){
     assert(a[k+3]||b[k+3],`change outside exact gloves: ${pants}/${g}/${action}/${f}/${k}`);changed++;
    }
    proofs++;
   });
   assert(changed>0);
  }
  const pair=[];for(const pantsID of [147,175]){
   const mask=await isolated(pr(pantsID),l=>pants(l,pantsID),F),raw=[];
   await draw(pantsID,26,action,(bytes,f)=>{raw[f]=new Uint8Array(bytes);});
   pair.push({mask,raw});
  }
  let diff=0;for(let f=0;f<F;f++)for(let i=0;i<512*512*4;i+=4)if([0,1,2,3].some(j=>pair[0].raw[f][i+j]!==pair[1].raw[f][i+j])){
   assert(pair.some(k=>k.mask[f][i+3]),'pants swap changed unrelated slot');diff++;
  }assert(diff>0);
 }
 assert.equal(proofs,102);if(baseline)assert.equal(newCases,126);
 console.log({newCases,proofs});
});
