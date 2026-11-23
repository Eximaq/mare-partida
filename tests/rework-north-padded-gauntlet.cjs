'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the exported game');
const {cv,make}=require('./rework-integration-support.cjs');
const {slots,gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root),mod=p=>require(path.join(root,p));
const world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const armor=mod('tools/rework-combat-wardrobe/index.json').northWeaponCoats[110].coats;
const canvas=(w=768)=>cv.createCanvas(w,w),pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const prefix='tools/rework-weapon-layers-hd/',tone=process.argv[2]||'ebony';
async function main(){
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 const player=look.commit({classId:weapons.find(w=>w.id===110).role,equipment:{}},{gender:'masculino',skinColor:tone,hairColor:tone==='light'?'white':'blue',eyeColor:tone==='light'?'amber':'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 const opts={consumer:'world',action:'attack-unarmed',direction:'north'};
 async function prepare(kit,hideHair=false){
  const p={...player,equipment:Object.fromEntries(Object.entries(kit).map(([slot,def])=>[slot,{def}]))};
  const r=world.selectWorldHDOnly(api,catalog,p,opts);
  assert.deepEqual(r.omitted||[],[]);for(const [s,id] of Object.entries(kit))assert.equal(r.slotRoutes[s].item,id);
  let source=r;
  if(hideHair){
   const d=r.pack.directions.north,pack={...r.pack,directions:{north:{...d,layers:d.layers.filter(l=>l.slot!=='hair')}}};
   source={...r,pack,id:r.id+'-reference-hide-hair',...(r.nativeSlotPack?{nativeSlotPack:{...r.nativeSlotPack,mounted:{...r.nativeSlotPack.mounted,pack}}}:{})};
  }
  const b=await api.prepareConfiguration([{player:p,options:opts}],{resolve:()=>({player:p,source,options:opts})});
  return {r,draw(f){let c;assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...opts,progress:(f+.1)/8}));return c;},release:()=>b.release()};
 }
 const bare=await prepare({}),stock=await prepare({weapon:110}),d=bare.r.pack.directions.north;
 assert.equal(stock.r.sourceArchiveSHA256,'cafd14818c0c41c7d622fa01f11f2b19ef036d1dd135352795cb7ccf8e33e10b');
 assert.deepEqual(stock.r.pivot,[96,144]);assert.equal(stock.r.states.length,8);assert.equal(Object.keys(armor).length,4);
 const hats=global.MareOriginalHairHelmetsHD.create(mod('tools/rework-accessories/head-layer-index.json'));
 const metal=await Promise.all(stock.r.states.map(s=>load(prefix+s.layers.find(l=>l.component==='equipment').url)));
 const coats=new Map(),edges=new Map();
 for(const [id,r] of Object.entries(armor))coats.set(Number(id),await Promise.all(r.cloth.map(h=>load('tools/rework-combat-wardrobe/assets/'+h+'.png'))));
 for(const coat of [null,...coats.keys()]){
  const phases=[];for(let f=0;f<8;f++){
   const garment=coats.get(coat)?.[f],a=canvas(),b=canvas(),x=a.getContext('2d'),y=b.getContext('2d');
   x.drawImage(bare.draw(f),64,64);y.drawImage(stock.draw(f),0,0);
   if(garment){x.drawImage(garment,0,0);y.drawImage(garment,0,0);}
   x.drawImage(metal[f],0,0);const prediction=pixels(a),signed=pixels(b),corrections=[];
   for(let k=0;k<signed.length;k++)if(prediction[k]!==signed[k]){assert.equal(prediction[k]>>>24,signed[k]>>>24);corrections.push([k,prediction[k],signed[k]]);}
   phases.push(corrections);a.width=b.width=1;
  }edges.set(coat,phases);
 }
 const cases=gear.flatMap((ids,i)=>ids.map(id=>({[slots[i]]:id})));
 for(let i=0;i<10;i++)cases.push(Object.fromEntries(slots.map((slot,j)=>[slot,gear[j][(i+j)%10]])));
 for(const coat of coats.keys())for(const gloves of gear[3])cases.push({coat,gloves});
 const results=[];
 for(const kit of cases){
  const cloth=coats.get(kit.coat),ref={...kit},hat=cloth&&kit.head&&hats.resolve({body:'male',direction:'north',item:kit.head});
  if(cloth){delete ref.coat;delete ref.gloves;delete ref.head;}
  const orig=await prepare(ref,hat&&mod('headgear-visibility.js').resolve({def:kit.head}).hideHair);
  const armed=await prepare({...kit,weapon:110});
  const glove=cloth&&kit.gloves&&await prepare({gloves:kit.gloves}),headImg=hat&&await load('tools/rework-accessories/assets/'+hat.gear.source+'.png');
  try{for(let f=0;f<8;f++){
   const dest=canvas(),ctx=dest.getContext('2d');ctx.drawImage(orig.draw(f),64,64);
   if(cloth)ctx.drawImage(cloth[f],0,0);
   if(glove){
    const pass=glove.r.independentPlan.passes.get('gloves'),bank=glove.r.nativeSlotPack;
    assert.equal(pass.layers.length,1);const l=pass.layers[0],hash=l.frames[f],fit=bank.phaseTransforms.find(t=>t.layer.id===l.id);
    assert.equal(l.depth,100);const pad=bank.padding?.[hash]?.offset||0;
    ctx.save();ctx.translate(64,64);ctx.imageSmoothingEnabled=false;if(fit)ctx.transform(...fit.matrices[f]);
    ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+hash+'.png'),pad,pad);ctx.restore();
   }
   if(hat){
    const rec=hat.sourceRecord,a=rec.adjustmentRecord.adjustment,h=rec.entry.pack.directions.north.headgearPolicy.headAdjustment||{};
    const neck=d.poses[f].NECK;ctx.drawImage(headImg,64+Math.round(4*(neck.x-rec.rest.NECK.x+(h.x||0)+(a.gearX||0))),64+Math.round(4*(neck.y-rec.rest.NECK.y+(h.y||0)+(a.gearY||0))));
   }
   ctx.drawImage(metal[f],0,0);const expected=pixels(dest),actual=pixels(armed.draw(f)),clean=pixels(stock.draw(f));
   for(const [k,from,to] of edges.get(cloth?kit.coat:null)[f])if(expected[k]===from)expected[k]=to;
   let changed=0,first=-1,errors=0;
   for(let k=0;k<actual.length;k++){if(actual[k]!==clean[k])changed++;if(actual[k]!==expected[k]){if(first<0)first=k;errors++;}}
   assert.equal(errors,0,JSON.stringify({kit,tone,f,x:first%768,y:Math.floor(first/768),expected:expected[first],actual:actual[first]}));
   results.push({kit,phase:f,changed});dest.width=1;
  }assert(results.slice(-8).some(v=>v.changed>0),JSON.stringify(kit));
  }finally{orig.release();armed.release();glove?.release?.();}
 }
 assert.equal(results.length,800);bare.release();stock.release();
 if(process.env.HD_NORTH_RESULTS)fs.writeFileSync(process.env.HD_NORTH_RESULTS,JSON.stringify(results));
 console.log(tone,results.length,'full 768px comparisons');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
