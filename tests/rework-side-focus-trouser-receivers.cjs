'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const {make,cv}=require('./rework-integration-support.cjs');
const {gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs'),mod=name=>require(path.join(root,name));
const world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const atlas=mod('tools/rework-combat-wardrobe/index.json').sideFocusTrousers,load=require('../tools/rework-hd-test-loader.cjs').create(root);
const read=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
const ids=[16,17,32,122,128],select=process.argv[2]?[Number(process.argv[2])]:ids;assert(select.every(id=>ids.includes(id)));
(async()=>{
 const api=make();await api.ready;const rows=[];
 for(const id of select)for(const direction of ['east','west']){
  const skin=direction==='east'?'ebony':'light';
  const player=look.commit({classId:weapons.find(r=>r.id===id).role,equipment:{}},{gender:'masculino',skinColor:skin,hairColor:'blue',eyeColor:'green'},()=>true);
  const opt={consumer:'world',direction,action:'attack-focus'};
  const pose=async eq=>{
   const p={...player,equipment:Object.fromEntries(Object.entries(eq).map(([k,v])=>[k,{def:v}]))};
   const r=world.selectWorldHDOnly(api,catalog,p,opt);assert.deepEqual(r.omitted||[],[]);
   for(const [k,v] of Object.entries(eq))assert.equal(r.slotRoutes[k].item,v);
   const b=await api.prepareConfiguration([{player:p,options:opt}],{resolve:()=>({player:p,options:opt,source:r})});
   return {r,draw(f){let c;const phase=Array.from(r.timeline).findIndex(t=>Number(t)===f);
    assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...opt,progress:(phase+.18)/r.timeline.length}));
    assert.equal(api.snapshot().last.frame,f);return read(c);},release:()=>b.release()};
  };
  const others={weapon:id,head:19,boots:169,gloves:152,coat:151},single=await pose({weapon:id}),outside=await pose(others);
  const baseline=Array.from({length:8},(_,f)=>single.draw(f)),mixed=Array.from({length:8},(_,f)=>outside.draw(f));
  const fit=atlas[direction];
  // Covers an extension over the original shorts, a translucent full replacement
  // and a woven overskirt. All ten identities and all their neighbors are selected.
  for(const n of gear[1]){
   const eq={...others,legs:n},p={...player,equipment:Object.fromEntries(Object.entries(eq).map(([k,v])=>[k,{def:v}]))};
   const sel=world.selectWorldHDOnly(api,catalog,p,opt);assert.deepEqual(sel.omitted||[],[]);assert.equal(sel.slotRoutes.legs.item,n);
   for(const k of Object.keys(others))assert.deepEqual(sel.slotRoutes[k],outside.r.slotRoutes[k]);
   if(![21,140,168].includes(n))continue;
   const one=await pose({weapon:id,legs:n}),kit=await pose(eq);
   for(let f=0;f<8;f++){
    const a=one.draw(f),b=kit.draw(f),base=baseline[f],before=mixed[f],plate=fit.items[n],phase=fit.phases[f];
    const mark=new Uint8Array(640*640),g=new Uint8Array(mark.length);
    for(const [off,len] of phase.cut)mark.fill(1,off,off+len);
    const fg=id===128?phase.bent:id===17||id===122?phase.orb:null;
    if(fg)for(const [off,len] of fg.guard)g.fill(1,off,off+len);
    const physical=cv.createCanvas(640,640),cx=physical.getContext('2d');cx.imageSmoothingEnabled=false;
    cx.transform(...phase.transform);cx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+plate.cloth[f]+'.png'),0,0);
    const art=read(physical);physical.width=1;let solo=0,worn=0,exact=0,blocked=0;
    for(let i=0;i<a.length;i++){
     const delta=a[i]!==base[i],peer=b[i]!==before[i],alpha=art[i]>>>24;
     if((delta||peer)&&!alpha&&!(plate.replace&&mark[i]))assert.fail('Outside material '+[id,direction,n,f,i%640,Math.floor(i/640)]);
     if(g[i]&&alpha&&fg){assert.equal(a[i],base[i],'foreground hand '+[id,direction,n,f,i]);blocked++;}
     if(delta)solo++;if(peer)worn++;if(alpha===255&&a[i]===art[i])exact++;
    }
    assert(solo>300&&worn>80&&exact>90,JSON.stringify({id,direction,n,f,solo,worn,exact}));
    rows.push({weapon:id,direction,item:n,phase:f,solo,worn,exact,blocked,source:plate.cloth[f]});
   }
   one.release();kit.release();
  }
  outside.release();single.release();global.gc?.();console.log(id,direction,'10 IDs and 24 solo/mixed frames');
 }
 assert.equal(rows.length,select.length*48);
 if(process.env.HD_TROUSER_RESULTS)fs.writeFileSync(process.env.HD_TROUSER_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
