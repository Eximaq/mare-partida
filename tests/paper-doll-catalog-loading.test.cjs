'use strict';
const assert=require('node:assert/strict');
require('../paper-doll.js');require('../paper-doll-assets.js');
const look=require('../paper-doll-look.js'),R=require('../paper-doll-review.js');
const release=require('../pixellab-pip-generations/paper-doll-complete-20261026/player-pack.json');
const data=structuredClone(look.data);
data.groups.hair.options.push({id:'test-copper',label:'Test hair',approved:true,pieceId:'test-hair'});
const catalog=look.createCatalog(data),player={classId:'sword',factionId:'pirate',equipment:{weapon:{def:0}},paperDollLook:{version:1,hair:'test-copper',outfit:'navy'}};
const makePack=()=>{const p=structuredClone(release),hair=structuredClone(p.pieces.find(p=>p.slot==='hair'));hair.id='test-hair';hair.animations.idle.url='optional-hair.png';p.pieces.push(hair);return p;};
async function load(pack,{badURL=null,badPixels=null}={}){
 const dimensions=new Map();
 for(const p of pack.pieces)for(const clip of Object.values(p.animations)){
  dimensions.set(clip.url,clip.kind==='rigid-attachment'?[clip.source?.width||64,clip.source?.height||64]:[84*clip.frames,84*clip.directions.length]);
  for(const source of Object.values(clip.sources||{}))dimensions.set(source.url,[source.width,source.height]);
 }
 const original=MarePaperDollCatalog.createRuntime;
 MarePaperDollCatalog.createRuntime=options=>original({...options,validatePixels:image=>image.name===badPixels?'empty-frame':null});
 let peak=0,active=0;const images=new Map();
 try{
  const r=R.create({production:true,lookCatalog:catalog,baseURL:'http://localhost/',fetch:async()=>({ok:true,json:async()=>structuredClone(pack)}),getImage:url=>{
   const name=url.split('/').at(-1);
   if(!images.has(url)){const [w,h]=dimensions.get(name);images.set(url,{name,complete:true,naturalWidth:w,naturalHeight:h,decode:async()=>{active++;peak=Math.max(peak,active);try{await new Promise(r=>setTimeout(r,1));if(name===badURL)throw Error('Image unavailable');}finally{active--;}}});}
   return images.get(url);
  }});
  const state=await r.ready;assert(peak<=6,'preserve the mobile connection budget');return {r,state};
 }finally{MarePaperDollCatalog.createRuntime=original;}
}
(async()=>{
 const good=await load(makePack());assert.equal(good.state.state,'ready');
 assert.equal(good.r.inspect(player,{animationId:'idle',direction:'south',frameIndex:0}).layers.find(l=>l.slot==='hair').pieceId,'test-hair');
 for(const fault of [{badURL:'optional-hair.png'},{badPixels:'optional-hair.png'}]){
  const {r,state}=await load(makePack(),fault);assert.equal(state.state,'ready',state.message);
  for(const direction of ['south','north','west','east'])for(const [animationId,clip]of Object.entries(release.rig.animations))for(let frameIndex=0;frameIndex<clip.frames;frameIndex++){
   const [classId,def]=({'attack-unarmed':['brawler',2],'attack-daggers':['rogue',12],'attack-firearm':['gunner',4],'attack-tech':['cyborg',14],'attack-focus':['strategist',16]})[animationId]||['sword',0];
   const plan=r.inspect({...player,classId,equipment:{weapon:{def}}},{animationId,direction,frameIndex});assert.equal(plan.valid,true,`${animationId}/${direction}/${frameIndex}: ${JSON.stringify(plan.missing)}`);
   assert.equal(plan.layers.find(l=>l.slot==='hair').pieceId,'complete-hair');
  }
  assert(r.equipmentStatus(player).cosmeticFallbacks.some(x=>x.id==='test-copper'));
  assert.equal(look.createCatalog(data).read(player).hair,'test-copper');
 }
 const draft=makePack();draft.pieces.at(-1).approved=false;
 const ignored=await load(draft);assert.equal(ignored.state.state,'ready');assert.equal(ignored.r.inspect(player,{animationId:'walk',direction:'east',frameIndex:7}).layers.find(l=>l.slot==='hair').pieceId,'complete-hair');
 const incomplete=makePack();delete incomplete.pieces.at(-1).animations['attack-tech'];
 const partial=await load(incomplete);assert.equal(partial.state.state,'ready');assert.equal(partial.r.inspect(player,{animationId:'idle',direction:'south',frameIndex:0}).layers.find(l=>l.slot==='hair').pieceId,'complete-hair');
 const requiredFailure=await load(makePack(),{badURL:'shared-hair-idle.png'});assert.equal(requiredFailure.state.state,'failed','required art failures still use the original renderer');
 console.log('Catalog loading: optional network/pixel/coverage failures use whole-piece defaults, core failures retain legacy fallback; <=6 decodes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
