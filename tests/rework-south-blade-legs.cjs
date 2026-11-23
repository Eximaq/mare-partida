'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const load=k=>require(path.join(root,k)),world=load('paper-doll-96-lobby.js'),catalog=load('tools/paper-doll-96-v3/weapons.json');
const {make,cv}=require('./rework-integration-support.cjs'),{gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const image=require('../tools/rework-hd-test-loader.cjs').create(root);
const canvas=()=>cv.createCanvas(640,640),rgba=(c,pad=0)=>new Uint32Array(c.getContext('2d').getImageData(pad,pad,640,640).data.buffer);

(async()=>{
 const api=make();await api.ready;const rows=[];let selected=0;
 const ids=process.env.HD_SOUTH_BLADE_ID?[Number(process.env.HD_SOUTH_BLADE_ID)]:[0,1,67,68,69,70,12,13,71,72,73,74];
 const bank=load('tools/rework-combat-wardrobe/index.json').southBladeLegs;
 for(const weapon of ids){
  const direction='south',o={consumer:'world',action:api.attackActionFor(weapon),direction};
  const look=load('character-appearance.js').commit({classId:o.action==='attack-sword'?'sword':'rogue',equipment:{}},{gender:'masculino',skinColor:weapon%2?'light':'ebony',hairColor:'blue',eyeColor:'green'},()=>true);
  function select(kit){
   const p={...look,equipment:Object.fromEntries(Object.entries(kit).map(([k,id])=>[k,{def:id}]))},r=world.selectWorldHDOnly(api,catalog,p,o);
   assert(r?.action===o.action&&r.direction==='south');for(const [slot,id] of Object.entries(kit))assert.equal(r.slotRoutes[slot]?.item,id);
   assert.deepEqual(r.omitted||[],[],JSON.stringify([weapon,kit,r.omitted]));return {p,r};
  }
  async function mounted(kit){
   const {p,r}=select(kit);const cfg=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});assert.deepEqual(cfg.coverage[0].omitted,[]);
   return {r,draw(f){let c;const t=r.timeline.findIndex(value=>Number(value)===Number(r.states[f].state));assert(t>=0);assert(cfg.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,progress:(t+.1)/r.timeline.length}));return c;},release:()=>cfg.release()};
  }
  const bare=await mounted({weapon}),count=bare.r.states.length,rig=bank.guards[weapon],pad=rig.pad;
  const without=Array.from({length:count},(_,f)=>rgba(bare.draw(f),pad));
  for(const [slot,items] of Object.entries({legs:gear[1],boots:gear[2]})){
   for(const item of items){select({weapon,[slot]:item});selected++;}
   const samples=[1,73].includes(weapon)?items:[items[ids.indexOf(weapon)%10]];
   for(const item of samples){
    const other=slot==='legs'?{boots:148}:{legs:168},one=await mounted({weapon,[slot]:item}),prev=await mounted({weapon,...other}),full=await mounted({weapon,...other,[slot]:item});
    assert.deepEqual(one.r.slotRoutes[slot],full.r.slotRoutes[slot]);for(const k of Object.keys(other))assert.deepEqual(prev.r.slotRoutes[k],full.r.slotRoutes[k]);
    for(let f=0;f<count;f++){
     const shape=canvas(),ctx=shape.getContext('2d'),row=bank.rigs[rig.family].items[(slot==='legs'?'pants':slot)+item].phases[rig.phases[f].phase];
     for(const t of [row.front,row.rear])if(t)ctx.drawImage(await image('tools/rework-combat-wardrobe/assets/'+t[0]+'.png'),t[1],t[2]);
     const front=canvas(),fc=front.getContext('2d');
     if(row.front){const [key,x,y]=row.front;fc.drawImage(await image('tools/rework-combat-wardrobe/assets/'+key+'.png'),x,y);}
     const textile=rgba(front),own=rgba(shape);for(const [i,n] of row.cut)own.fill(0xff000000,i,i+n);
     const protectedRuns=rig.phases[f].guard;
     for(const [i,n] of protectedRuns){own.fill(0,i,i+n);textile.fill(0,i,i+n);}
     const reference=canvas(),ref=reference.getContext('2d');
     ref.drawImage(bare.draw(f),-pad,-pad);
     for(const [start,length] of row.cut){
      let at=start,end=start+length;
      while(at<end){const x=at%640,y=Math.floor(at/640),span=Math.min(end-at,640-x);ref.clearRect(x,y,span,1);at+=span;}
     }
     if(row.rear){const [key,x,y]=row.rear;ref.globalCompositeOperation='destination-over';ref.drawImage(await image('tools/rework-combat-wardrobe/assets/'+key+'.png'),x,y);}
     ref.globalCompositeOperation='source-over';ref.drawImage(front,0,0);
     const expected=rgba(reference),a=rgba(one.draw(f),pad),b=rgba(full.draw(f),pad),c=rgba(prev.draw(f),pad),base=without[f];let single=0,mixed=0,exact=0;
     for(let i=0;i<a.length;i++){
      if(!(own[i]>>>24)){if(a[i]!==base[i]||b[i]!==c[i])throw Error('Changed foreign pixels '+[weapon,slot,item,f,i%640,i/640|0,a[i],base[i],b[i],c[i]].join('/'));continue;}
      if(textile[i]>>>24){assert.equal(a[i],expected[i],['own material',weapon,slot,item,f,i].join('/'));exact++;}
      single+=Number(a[i]!==base[i]);mixed+=Number(b[i]!==c[i]);
     }
     assert(exact>100&&single>160&&mixed>80,[weapon,slot,item,f,single,mixed].join('/'));rows.push({weapon,slot,item,f,single,mixed,exact});shape.width=1;front.width=1;reference.width=1;
    }
    one.release();prev.release();full.release();
   }
  }
  bare.release();console.log(weapon,rows.length);global.gc?.();
 }
 assert.equal(selected,ids.length*20);
 assert.equal(rows.length,ids.reduce((sum,w)=>sum+([1,73].includes(w)?20:2)*9,0));
 if(process.env.HD_SOUTH_BLADE_LEGS_EVIDENCE)fs.writeFileSync(process.env.HD_SOUTH_BLADE_LEGS_EVIDENCE,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
