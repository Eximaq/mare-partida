'use strict';
const assert=require('node:assert/strict');
require('../paper-doll.js');require('../paper-doll-assets.js');
const look=require('../paper-doll-look.js'),R=require('../paper-doll-review.js');
const draft=require('../pixellab-pip-generations/paper-doll-complete-20261026/review-pack.json');
const release=require('../pixellab-pip-generations/paper-doll-complete-20261026/player-pack.json');
assert.equal(release.releaseVersion,1);assert(release.productionEnabled&&release.full_character_artwork_approved&&!release.reviewOnly);
for(let i=0;i<release.pieces.length;i++){assert(release.pieces[i].approved);assert.deepEqual({...release.pieces[i],approved:false},draft.pieces[i],'reuse exactly the reviewed clips and PNG sources');}
for(const [classId,c]of Object.entries(MarePaperDollCatalog.classes))for(const factionId of Object.keys(MarePaperDollCatalog.factions)){
 const player={classId,factionId,level:55,gold:12345,equipment:{weapon:{id:'w',def:100,plus:12},coat:{def:101},boots:{def:8},head:{def:18}},inventory:[{id:'kept'}]},before=JSON.stringify(player);
 const options={production:true,definition:n=>n===100?{slot:'weapon',type:classId}:n===101?{slot:'coat'}:null};
 const appearance=R.appearance(release,player,options);assert(appearance);assert.equal(appearance.blocked.length,0,'missing cosmetic art must not replace the entire human');
 assert.equal(appearance.pieces.body,'complete-body');assert.equal(appearance.pieces.weapon,classId==='brawler'?undefined:classId==='healer'?'complete-staff':release.categoryWeapons[c.category]);
 assert(appearance.substitutions.some(x=>x.slot==='head'));assert.equal(JSON.stringify(player),before);
 const next=look.apply(player,{version:1,hair:'bald',outfit:'base'}, {production:true});assert(next);assert.equal(next.gold,player.gold);assert.equal(next.equipment,player.equipment);assert.equal(next.inventory,player.inventory);
 assert.deepEqual(look.read(JSON.parse(JSON.stringify(next))),{version:1,hair:'bald',outfit:'base'});
 assert.equal(R.appearance(release,{...player,zoanTransformed:true},options),null);
 assert.equal(look.apply({...player,devSandbox:true},look.defaults,{production:true}),null,'never promote a sandbox save');
}
const normal={classId:'sword',factionId:'pirate',equipment:{},inventory:[],stats:{damage:7}};
assert.equal(look.apply(normal,look.defaults),null,'draft application stays DEV-only');
assert.equal(look.apply(normal,{version:1,hair:'invalid',outfit:'navy'},{production:true}),null);
assert.deepEqual(look.read(normal),look.defaults,'old saves use defaults without migration or mutation');
assert(!look.render(normal,look.defaults,'',null,[],{production:true}).includes('data-doll-kit'));
assert(!look.render(normal,look.defaults,'',null,[],{production:true}).includes('save de teste'));
(async()=>{
 for(const mutate of [p=>p.productionEnabled=false,p=>p.full_character_artwork_approved=false,p=>p.reviewOnly=true,p=>p.pieces[0].approved=false,p=>delete p.categoryWeapons.sword,p=>p.coverage.walk=['south']]){
  const data=structuredClone(release);mutate(data);const r=R.create({production:true,baseURL:'http://localhost/',fetch:async()=>({ok:true,json:async()=>data}),getImage:()=>{throw Error('Invalid release reached images')}});assert.equal((await r.ready).state,'failed');
 }
 const dimensions=new Map();
 for(const piece of release.pieces)for(const clip of Object.values(piece.animations)){
  dimensions.set(clip.url,clip.kind==='rigid-attachment'?[clip.source?.width||64,clip.source?.height||64]:[84*clip.frames,84*clip.directions.length]);
  for(const source of Object.values(clip.sources||{}))dimensions.set(source.url,[source.width,source.height]);
 }
 const create=MarePaperDollCatalog.createRuntime;MarePaperDollCatalog.createRuntime=options=>create({...options,validatePixels:()=>null});let active=0,peak=0;const images=new Map();
 const loaded=R.create({production:true,baseURL:'http://localhost/',fetch:async()=>({ok:true,json:async()=>structuredClone(release)}),getImage:url=>{
  if(!images.has(url)){const [w,h]=dimensions.get(url.split('/').at(-1));images.set(url,{complete:true,naturalWidth:w,naturalHeight:h,decode:async()=>{active++;peak=Math.max(peak,active);try{if(active>6)throw Error('Mobile image connection limit');await new Promise(r=>setTimeout(r,1));}finally{active--;}}});}return images.get(url);
 }});MarePaperDollCatalog.createRuntime=create;
 const result=await loaded.ready;assert.equal(result.state,'ready',result.message);assert(peak<=6,'bound image loading to avoid burst failures');
 assert.equal((await R.create({production:true,devActive:true,baseURL:'http://localhost/',getImage:()=>{throw Error('Sandbox used production')}}).ready).state,'off');
 console.log('Player Paper Doll: 28 identities, category appearance, non-destructive equipment, cosmetic persistence and DEV isolation passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
