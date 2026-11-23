'use strict';
// Own-art inventory, not the historical item+weapon compatibility census.
// Add only providers whose separately owned pass is admitted to the index.
const fs=require('node:fs'),path=require('node:path'),A=require('../character-appearance.js');
const {make,cv}=require('../tests/rework-integration-support.cjs');
const {createOwnLayerIndex}=require('../player-rework-modular-outfits-hd.js');
const W=require('../paper-doll-96-lobby.js'),weapons=require('./paper-doll-96-v3/weapons.json');
const directions=['north','east','south','west'],body='female',scope=process.argv[2]||'dagger';
const boots=[8,9,134,141,148,155,162,169,176,183],gloves=[25,26,131,138,145,152,159,166,173,180];
const root=path.resolve(__dirname,'..'),rows=[],signatures=[],prefix='tools/rework-sword0-checkpoint/';
const json=filename=>JSON.parse(fs.existsSync(filename)?fs.readFileSync(filename):require('node:zlib').gunzipSync(fs.readFileSync(filename+'.gz')));
let action,role,weaponIds,requirements,api,verifyMount;
if(scope==='dagger'){
 const c=require('./rework-female-dagger-p22/index.json');
 action='attack-daggers';role='rogue';weaponIds=[12,13,71,72,73,74];requirements={boots,gloves};
 for(const [slot,passMaps] of [['boots',c.signedBootLayers],['gloves',c.signedGloveLayers]])
  for(const [direction,items] of Object.entries(passMaps||{}))for(const [item,source] of Object.entries(items))
   rows.push({slot,item:Number(item),body,action,direction,source});
 api=make();
 verifyMount=(r,slot,selection)=>r?.ownLayerSources?.[slot]===selection.key;
}else if(scope==='sword'){
 const dist=path.resolve(process.env.HD_PUBLISHED_ROOT||path.join(root,'dist')),catalogPath=prefix+'sword-catalog.json';
 const c=json(path.join(dist,catalogPath)),load=require('./rework-hd-test-loader.cjs').create(root);
 require('../player-rework-sword0-checkpoint.js');
 action='attack-sword';role='sword';weaponIds=[0,1,67,68,69,70];requirements={boots,gloves,pants:[22]};
 for(const {slot,item,direction,layers} of c.records)rows.push({slot,item,body,action,direction,source:layers});
 api=make({fetchJSON:async f=>json(path.join(f.startsWith(prefix)?dist:root,f)),loadImage:f=>f.startsWith(prefix)?cv.loadImage(path.join(dist,f)):load(f)});
 verifyMount=(r,slot,selection)=>{
  const refs=selection.source?.flatMap(l=>l.frames||[l.source])||[];
  const mounted=new Set(r?.checkpointSources||[]);
  return refs.length>0&&refs.every(h=>mounted.has(h));
 };
}else throw Error('Unknown audit source scope; use dagger or sword');
const index=createOwnLayerIndex(rows),sha=require('node:crypto').createHash('sha256'),apiSlot=slot=>slot==='pants'?'legs':slot;
(async()=>{
 await api.ready;if(api.snapshot().state!=='ready')throw Error(api.snapshot().error);
 if(scope==='sword'&&!await api.warmSwordCheckpoint())throw Error('Signed sword checkpoint failed');
 for(const [slot,items] of Object.entries(requirements))for(const item of items)for(const direction of directions){
  const selection=index.resolve({slot,item,body,action,direction}),registered=[];
  for(const def of weaponIds){
   const p={classId:role,appearance96:A.normalize({gender:'feminino',skinColor:'light'}),equipment:{weapon:{def},[apiSlot(slot)]:{def:item}}};
   const r=W.selectWorldHD(api,weapons,p,{action,direction,consumer:'world'});
   if(verifyMount(r,apiSlot(slot),selection)&&r.slotRoutes?.[apiSlot(slot)]?.item===item&&r.slotRoutes[apiSlot(slot)].quality==='hd')registered.push(def);
  }
  const provenance=selection.state!=='available'?selection.state:selection.mirrorX?'east-mirror':'authored';
  signatures.push({slot,item,body,action,direction,provenance,sourceDirection:selection.sourceDirection,registeredWorldWeapons:registered});
 }
 const tally={authored:0,'east-mirror':0,unknown:0,conflict:0,worldSelectionConfirmed:0,sourceKnownMountNotValidated:0};
 for(const r of signatures){
  tally[r.provenance]++;
  if(r.registeredWorldWeapons.length)tally.worldSelectionConfirmed++;
  else if(r.provenance==='authored'||r.provenance==='east-mirror')tally.sourceKnownMountNotValidated++;
  sha.update(JSON.stringify([r.slot,r.item,r.body,r.action,r.direction])+'\n');
 }
 console.log(JSON.stringify({scope,auditUnit:'One source key per slot/item/sex/action/direction. Weapon choices are mount witnesses, never source keys.',
  mountProof:'Selector evidence only; canvas proof is separate. Unknown means not in this provider, not proof no sprite exists.',
  ownKeys:signatures.length,ownKeysSHA256:sha.digest('hex'),tally,signatures},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
