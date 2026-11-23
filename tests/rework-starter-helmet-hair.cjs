'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {cv}=require('./rework-integration-support.cjs');
const {createCanvas}=cv,load=require('../tools/rework-hd-test-loader.cjs').create(root);
const bank=require(path.join(root,'tools/rework-accessories/head-layer-index.json'));
const family=global.MareReworkHead.create(bank,{vendor:global.ReworkAccessoryVendor,appearanceAPI:global.MareAppearance96,makeCanvas:createCanvas});
(async()=>{
 const images=new Map(),get=async record=>{for(const p of family.requiredFiles(record))if(!images.has(p))images.set(p,await load(p));};
 const styles=new Set(bank.records.filter(r=>r.body==='male'&&r.item==null).map(r=>r.style));assert.equal(styles.size,12);
 let pairs=0,partial=0,full=0;
 for(const direction of ['north','east','west'])for(const style of styles){
  const hair='hair-'+style,bare=family.resolve({body:'male',direction,look:{hair}});await get(bare);
  const options={width:128,height:128,targetNeck:{x:bare.rest.NECK.x+2,y:bare.rest.NECK.y+3},look:{hair},hairRamp:global.MareAppearance96.hairs.blue.ramp};
  const naked=family.composeNative(bare,images,options);
  for(const item of [18,19]){
   const r=family.resolve({body:'male',direction,look:{hair,head:'head-'+item}});assert(r?.ownHelmet);
   assert.equal(r.item,item);assert.equal(r.ownHelmet.gear.id,'headgear-'+item);await get(r);
   const m=family.composeNative(r,images,options),ctx=createCanvas(512,512).getContext('2d'),a=r.ownHelmet.adjust;
   const source=images.get('tools/rework-accessories/assets/'+r.ownHelmet.gear.source+'.png');
   ctx.drawImage(source,8+Math.round(4*a.gearX),12+Math.round(4*a.gearY));
   const gear=ctx.getImageData(0,0,512,512).data;assert.deepEqual(m.head,gear,[item,direction,style,'registered gear pixels'].join('/'));
   assert.deepEqual(m.headBase,naked.headBase);assert.deepEqual(m.face,naked.face);
   const hairline=4*(r.rest.NOSE.y+3-r.ownHelmet.forehead+a.gearY);let hidden=0,kept=0;
   const original=new Uint32Array(naked.hair.buffer),actual=new Uint32Array(m.hair.buffer);
   for(let i=0;i<actual.length;i++){const visible=item===18&&Math.floor(i/512)+.5>=hairline;
    if(actual[i]!== (visible?original[i]:0))assert.fail([item,direction,style,i,'hair mask'].join('/'));
    if(original[i]>>>24){if(visible)kept++;else hidden++;}
   }
   assert(hidden>100,[item,direction,style,'hair crown'].join('/'));if(item===18)partial+=kept;else full++;
   pairs++;
  }
 }
 assert.equal(pairs,72);assert.equal(full,36);assert(partial>1000);
 console.log(JSON.stringify({pairs,partialHairPixels:partial,fullHelmets:full}));
})().catch(e=>{console.error(e);process.exitCode=1;});
