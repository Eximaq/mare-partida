'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n)),{make,cv}=require('./rework-integration-support.cjs');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const load=require('../tools/rework-hd-test-loader.cjs').create(root),{gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const atlas=mod('tools/rework-combat-wardrobe/index.json').staffGloves;
const weapon=Number(process.argv[2]),tone=process.argv[3]||'light';
assert([31,123,124,125,126,127,128].includes(weapon)&&['light','ebony'].includes(tone));
const cv640=()=>cv.createCanvas(640,640);
const read=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
async function plane(sha,bank,mirror,base){
 const c=cv640(),x=c.getContext('2d');
 if(base){const rgba=x.createImageData(640,640);new Uint32Array(rgba.data.buffer).set(base);x.putImageData(rgba,0,0);}
 if(mirror){x.translate(640,0);x.scale(-1,1);}
 x.drawImage(await load('tools/'+bank+'/assets/'+sha+'.png'),0,0);const out=read(c);c.width=1;return out;
}
async function main(){
 const api=make();await api.ready;
 const player=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},{gender:'masculino',
  skinColor:tone,hairColor:tone==='light'?'brown':'blue',eyeColor:tone==='light'?'brown':'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 const saved=JSON.stringify(player.appearance96),rows=[];
 for(const direction of ['east','west']){
  const options={action:'attack-focus',direction,consumer:'world'};
  async function pose(eq){
   const p={...player,equipment:Object.fromEntries(Object.entries(eq).map(([k,id])=>[k,{def:id}]))};
   const r=world.selectWorldHDOnly(api,catalog,p,options);assert.deepEqual(r.omitted||[],[]);
   if(Object.keys(eq).length>1)for(const [k,v] of Object.entries(eq))assert.equal(r.slotRoutes[k].item,v);
   const bundle=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:r})});
   return {r,draw(f){let c;assert(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...options,progress:(f+.1)/8}));return read(c);},release:()=>bundle.release()};
  }
  const fixed={head:19,coat:151,boots:169,weapon},bare=await pose({weapon}),clothed=await pose(fixed),phases=[];
  for(let f=0;f<8;f++){
   const layers=bare.r.states[f].layers,from=layers.findIndex(l=>l.id==='forearm-hand-far');
   const fused=bare.r.w128IndependentSide;assert(fused||from>0);const cover=new Uint8Array(640*640);let metal;
   const after=fused?[{id:'grip',sha256:atlas.pins[direction][f].grip},layers.find(l=>l.id==='gear')]:layers.slice(from+1);
   for(const l of after){
    const rgba=await plane(l.sha256,'rework-weapon-layers-hd',Boolean(l.mirrorX));
    if(fused&&l.id==='gear')metal=rgba;
    for(let i=0;i<rgba.length;i++)cover[i]=Math.max(cover[i],rgba[i]>>>24);
   }
   phases.push({before:bare.draw(f),dressed:clothed.draw(f),cover,metal});
  }
  for(const gloves of gear[3]){
   const on=await pose({weapon,gloves}),kit=await pose({...fixed,gloves});
   assert.deepEqual(on.r.slotRoutes.gloves,kit.r.slotRoutes.gloves);
   for(const k of Object.keys(fixed))assert.deepEqual(clothed.r.slotRoutes[k],kit.r.slotRoutes[k]);
   for(let f=0;f<8;f++){
    const [far,near]=await Promise.all(['left','right'].map(side=>plane(atlas.items[gloves][side][f].art,'rework-combat-wardrobe',direction==='west')));
    const a=on.draw(f),b=kit.draw(f),{before,dressed,cover,metal}=phases[f];
    const [farOnBody,nearOnBody]=await Promise.all(['left','right'].map(side=>plane(atlas.items[gloves][side][f].art,'rework-combat-wardrobe',direction==='west',before)));
    let changed=0,mixed=0,nearExact=0,farExact=0,hidden=0;
    for(let k=0;k<a.length;k++){
     const fa=far[k]>>>24,na=near[k]>>>24;
     if(!fa&&!na){assert.equal(a[k],before[k]);assert.equal(b[k],dressed[k]);continue;}
     if(metal&&(metal[k]>>>24)===255){assert.equal(a[k],before[k]);if(fa&&!na)hidden++;continue;}
     if(na&&!fa&&!(metal&&(metal[k]>>>24))){assert.equal(a[k],nearOnBody[k],'near palm '+[weapon,gloves,direction,f,k]);nearExact++;}
     if(fa&&!cover[k]&&!na){assert.equal(a[k],farOnBody[k],'far fingers '+[weapon,gloves,direction,f,k]);farExact++;}
     if(fa&&cover[k]===255&&!na){assert.equal(a[k],before[k]);hidden++;}
     if(a[k]!==before[k])changed++;if(b[k]!==dressed[k])mixed++;
    }
    assert(nearExact>180&&changed>220&&mixed>220,JSON.stringify({weapon,gloves,direction,f,nearExact,changed,mixed}));
    rows.push({direction,gloves,f,nearExact,farExact,hidden,changed,mixed});
   }
   on.release();kit.release();
  }
  bare.release();clothed.release();
 }
 assert.equal(saved,JSON.stringify(player.appearance96));assert.equal(rows.length,160);
 assert(rows.some(r=>r.f===4&&r.farExact>150));// Totals from the two original directional stacks, across all ten gloves.
 const metalContacts={31:222,123:60,124:288,125:104,126:206,127:146,128:644};
 assert.equal(rows.reduce((n,r)=>n+r.hidden,0),metalContacts[weapon]);
 if(process.env.HD_STAFF_GLOVE_RESULTS)fs.writeFileSync(process.env.HD_STAFF_GLOVE_RESULTS,JSON.stringify(rows));
 console.log(weapon,tone,rows.length,'independent glove phases and 160 mixed phases');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
