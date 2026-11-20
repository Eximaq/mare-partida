'use strict';
const a=require('node:assert/strict'), fs=require('node:fs'), p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs');
require('../player-rework-sword0-checkpoint.js');
global.MareNativeSkinHD=require('../player-rework-skin-hd.js');
const root=p.resolve(__dirname,'..'),dist=p.join(root,'dist'),catalog='tools/rework-sword0-checkpoint/sword-catalog.json';
const cp=require(p.join(dist,catalog)),loader=require('../tools/rework-hd-test-loader.cjs').create(root);
const api=make({baseURL:'https://fixture.test/',fetchJSON:async f=>f===catalog?cp:JSON.parse(fs.readFileSync(p.join(root,f))),
 loadImage:f=>f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(dist,f)):loader(f)});
const original={gender:'masculino',hairStyle:'original',eyeStyle:'original',skinColor:'original',hairColor:'original',eyeColor:'original'};
const swordLook=global.MareCharacterAppearance.normalize({...cp.appearance96,skinColor:'ebony',hairColor:'silver',eyeColor:'green'});
const create=(appearance96,equipment,classId)=>({classId,appearance96,equipment:Object.fromEntries(Object.entries(equipment).map(([k,def])=>[k,{def}]))});
const opts=(action,direction)=>({action,direction,consumer:'world'});
const dirs=['north','south','east','west'], capeIds=[23,24,135,142,149,156,163,170,177,184];
const put=(actor,id)=>({...actor,equipment:{...actor.equipment,cloak:{id:'inventory-'+id,def:id,plus:7,rarity:'epic'}}});
const cases=[];
for(const id of [0,1,67,68,69,70])for(const d of dirs)
 cases.push([create(swordLook,{weapon:id,coat:151,boots:9,legs:22},'sword'),opts('attack-sword',d),x=>x.slotRoutes?.boots?.item===9]);
for(const d of dirs)for(const action of ['idle','walk'])
 cases.push([create(original,{coat:151,legs:133,boots:9,gloves:152},'brawler'),opts(action,d),x=>x.equipment?.boots===9]);
const B=(skinColor,eyeColor)=>global.MareCharacterAppearance.normalize({...original,skinColor,hairColor:'black',eyeColor});
for(const d of ['south','north'])
 cases.push([create(B('ebony','blue'),{coat:151,legs:133,boots:176,gloves:159},'brawler'),opts('attack-unarmed',d),x=>x.partitionedMalePunch]);
cases.push([create({...original,gender:'feminino'},{coat:151,legs:168,boots:9,gloves:152},'brawler'),opts('walk','south'),x=>x.equipment?.boots===9]);
const base64=actor=>JSON.stringify(actor);
const stage=(player,options)=>api.prepareConfiguration([{player,options}],{resolve:q=>({...q,source:api.selectVisual(q.player,q.options)})});
const pixels=(bundle,actor,o,k,frames)=>{const cvv=cv.createCanvas(480,480),ctx=cvv.getContext('2d');let rgba;ctx.drawImage=x=>{rgba=Buffer.from(x.getContext('2d').getImageData(0,0,x.width,x.height).data);};
 a(bundle.draw(ctx,actor,{...o,progress:(k+.1)/frames}));a(rgba?.some(x=>x));cvv.width=cvv.height=1;return rgba;};
(async()=>{
 await api.ready;
 let selects=0,rendered=0;
 for(const [actor,o,valid] of cases){
  const initial=api.selectVisual(actor,o);
  a(initial&&valid(initial),`expected real HD control ${o.action}/${o.direction}/${base64(actor)}`);
  for(const id of capeIds){
   const wearing=put(actor,id),before=base64(wearing),r=api.selectVisual(wearing,o);
   a.equal(r?.id,initial.id,`cloak ${id} must not replace ${initial.id}`);
   a.deepEqual(r?.slotRoutes,initial.slotRoutes);a.deepEqual(r?.omitted,initial.omitted);
   a.equal(base64(wearing),before,'equipped object and attributes unchanged');
   selects++;
  }
 }
 // Draw every frame on three materially different real routes, after equip and after removal.
 for(const [actor,o] of [cases[0],cases[33],cases[34]]){
  const wearing=put(actor,184),zero=await stage(actor,o),one=await stage(wearing,o),two=await stage({...wearing,equipment:{...actor.equipment}},o);
  const frames=zero.coverage[0].frames;
  a.equal(one.coverage[0].frames,frames);a.equal(two.coverage[0].frames,frames);
  for(let i=0;i<frames;i++){
   const before=pixels(zero,actor,o,i,frames),during=pixels(one,wearing,o,i,frames),after=pixels(two,actor,o,i,frames);
   a(before.equals(during)&&before.equals(after),`RGBA must be unchanged for ${o.action}/${o.direction}/${i}`);
   rendered++;
  }
  zero.release();one.release();two.release();global.gc?.();
 }
 const [actor,o]=cases[0];
 for(const key of ['visual_completo','unexpected'])a(!api.selectVisual({...actor,equipment:{...actor.equipment,[key]:{def:23}}},o));
 console.log({selects,rendered,comparedStates:rendered*3,saveIntact:true});
})().catch(e=>{console.error(e);process.exitCode=1;});
