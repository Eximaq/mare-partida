'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make,cv}=require('./rework-integration-support.cjs'),{gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root),planes=require('./fixtures/south-focus-weapon-planes.json');
const mod=n=>require(path.join(root,n)),world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const bank=mod('tools/rework-combat-wardrobe/index.json').southStaffClothes;
const cloth=h=>load('tools/rework-combat-wardrobe/assets/'+h+'.png');
const read=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
async function stamp(resources){const c=cv.createCanvas(640,640),ctx=c.getContext('2d');for(const im of await Promise.all(resources))ctx.drawImage(im,0,0);const pixels=read(c);c.width=1;return pixels;}
(async()=>{
 const api=make();await api.ready;const out=[],counts={individual:0,pairs:0,drawn:0};
 const opts={consumer:'world',action:'attack-focus',direction:'south'};
 for(const [w,weapon] of [16,17,31,32,121,122].entries()){
  const player=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},{gender:'masculino',skinColor:w%2?'light':'ebony',hairColor:'blue',eyeColor:'green'},()=>true);
  function select(eq){const p={...player,equipment:Object.fromEntries(Object.entries(eq).map(([k,id])=>[k,{def:id}]))},row=world.selectWorldHDOnly(api,catalog,p,opts);
   assert.deepEqual(row.omitted||[],[],JSON.stringify(eq));for(const [slot,id] of Object.entries(eq)){assert.equal(row.slotRoutes[slot].item,id);assert.equal(row.slotRoutes[slot].quality,'hd');}
   return {row,p};
  }
  async function prepare(eq){const {p,row}=select(eq),b=await api.prepareConfiguration([{player:p,options:opts}],{resolve:()=>({player:p,options:opts,source:row})});assert.deepEqual(b.coverage[0].omitted,[]);
   return {draw(f){let c;assert(b.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...opts,progress:(f+.2)/8}));return read(c);},release:()=>b.release()};
  }
  const fixed={weapon,legs:168,boots:148,head:136},single={};
  for(const [slot,items] of Object.entries({coat:gear[0],gloves:gear[3]}))for(const id of items){const r=select({weapon,[slot]:id});single[id]=r.row.slotRoutes[slot];
   assert.equal(single[id].source,bank[slot==='coat'?'coats':'gloves'][id].record+'@'+bank.receiver);counts.individual++;}
  for(const coat of gear[0])for(const gloves of gear[3]){
   const eq={...fixed,coat,gloves},routes=select(eq).row.slotRoutes;
   assert.deepEqual(routes.coat,single[coat]);assert.deepEqual(routes.gloves,single[gloves]);
   assert.deepEqual(routes,select(Object.fromEntries(Object.entries(eq).reverse())).row.slotRoutes);counts.pairs++;
  }
  const items=w===0?gear[0].map((_,i)=>i):[w],compare=await prepare(fixed),original=[],metal=[];
  for(let f=0;f<8;f++){original.push(compare.draw(f));metal.push(await stamp([load('tools/rework-weapon-layers-hd/assets/'+[planes[weapon][f]].flat()[0]+'.png')]));}
  for(const n of items){
   const coat=gear[0][n],gloves=gear[3][n],c=bank.coats[coat],g=bank.gloves[gloves],withCoat=await prepare({...fixed,coat}),full=await prepare({...fixed,coat,gloves});
   for(let f=0;f<8;f++){
    const C=withCoat.draw(f),G=full.draw(f),sources=c.rear[f]?[cloth(c.rear[f]),cloth(c.front[f])]:[cloth(c.front[f])];
    const fabric=await stamp(sources),glove=await stamp([cloth(g.left[f]),cloth(g.right[f])]);let clothPixels=0,glovePixels=0;
    for(let k=0;k<C.length;k++){
     const blocked=weapon!==31&&(metal[f][k]>>>24)===255;
     if(C[k]!==original[f][k]){assert((fabric[k]>>>24)&&!blocked,[weapon,coat,f,k,'outside fabric']);clothPixels++;}
     if(C[k]!==G[k]){assert((glove[k]>>>24)&&!blocked,[weapon,gloves,f,k,'outside glove']);glovePixels++;}
    }
    assert(clothPixels>800&&glovePixels>80,[weapon,coat,gloves,f,clothPixels,glovePixels]);counts.drawn+=2;
    out.push({weapon,coat,gloves,phase:f,clothPixels,glovePixels});
   }
   withCoat.release();full.release();
  }
  compare.release();global.gc?.();
 }
 assert.deepEqual(counts,{individual:120,pairs:600,drawn:240});console.log(JSON.stringify(counts));
 if(process.env.HD_SOUTH_FOCUS_CLOTH_RESULTS)fs.writeFileSync(process.env.HD_SOUTH_FOCUS_CLOTH_RESULTS,JSON.stringify(out));
})().catch(err=>{console.error(err);process.exitCode=1;});
