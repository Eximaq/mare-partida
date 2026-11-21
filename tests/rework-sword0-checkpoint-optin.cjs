const fs=require('node:fs'),p=require('node:path'),a=require('node:assert/strict'),root=p.resolve(process.argv[2]||p.join(__dirname,'..')),dist=p.join(root,'dist');
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs')),loader=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const html=fs.readFileSync(p.join(dist,'index.html'),'utf8');
const swordScript=html.match(/<script defer src="(player-rework-sword0-checkpoint\.js)(?:\?[^"]*)?"><\/script>/);
a.ok(swordScript,'standard Pages build must load the activated Sword 0 adapter');
a(swordScript.index<html.indexOf('player-rework-native-hd.js'),'Sword 0 must load before the native provider');
require(p.join(dist,swordScript[1]));
const catalog=require(p.join(dist,'tools/rework-sword0-checkpoint/sword-catalog.json'));
const material='tools/rework-sword0-checkpoint/sword-catalog.json',logs={catalogRequests:0,imageLoads:0};
const api=(url,corrupt=false)=>make({baseURL:url,fetchJSON:async f=>{if(f===material){logs.catalogRequests++;return corrupt?{...catalog,guards:{...catalog.guards,north:'bad'}}:catalog;} return JSON.parse(fs.readFileSync(p.join(root,f)));},loadImage:f=>{if(f.startsWith('tools/rework-sword0-checkpoint/')){logs.imageLoads++;return cv.loadImage(p.join(dist,f));}return loader(f);}});
(async()=>{
 const adapter=global.MareSword0Checkpoint;delete global.MareSword0Checkpoint;
 const def=api('https://fixture.test/');global.MareSword0Checkpoint=adapter;
 const enabled=api('https://fixture.test/'), invalid=api('https://fixture.test/',true);
 await Promise.all([def.ready,enabled.ready,invalid.ready]);
 a.equal(logs.catalogRequests,2);
 const base={appearance96:catalog.appearance96,equipment:{weapon:{def:0},coat:{def:151}}};
 let newSlots=0,existing=0,frames=0;
 for(const direction of ['north','south','east','west']){
 const o={action:'attack-sword',direction};
 a.deepEqual(def.selectVisual(base,o),enabled.selectVisual(base,o));
 for(const row of catalog.records.filter(x=>x.direction===direction)){
  const player={...base,equipment:{...base.equipment,[row.slot]:{def:row.item}}}, prev=def.selectVisual(player,o);
  a.deepEqual(invalid.selectVisual(player,o),prev);
  if(prev){ a.deepEqual(enabled.selectVisual(player,o),prev);existing++;continue;}
  a.equal(enabled.selectVisual(player,o).slotRoutes[row.slot].item,row.item);newSlots++;
  if(row.item===({pants:21,boots:9,gloves:152})[row.slot]){
   if(!def.selectVisual(player,{...o,action:'attack'})){const r=enabled.selectVisual(player,{...o,action:'attack'});a.equal(r?.resolvedAction,'attack-sword');}
   a(await enabled.prepareClip(player,o));for(let f=0;f<8;f++){const ctx=cv.createCanvas(800,800).getContext('2d');a(enabled.draw(ctx,player,{...o,progress:(f+.1)/8,x:300,y:450}));frames++;}
  }
 }
 }
 const normalized={...base,appearance96:global.MareCharacterAppearance.normalize(base.appearance96)};
 a.equal(normalized.appearance96.skinColor,'light');
 let savedSlots=0,savedFrames=0;
 for(const direction of ['north','south','east','west']){
  const o={action:'attack-sword',direction};
  const ordinary=enabled.selectVisual(normalized,o);
  for(const row of catalog.records.filter(x=>x.direction===direction)){
   const p={...normalized,equipment:{...normalized.equipment,[row.slot]:{def:row.item}}};
   const r=enabled.selectVisual(p,o),prev=def.selectVisual(p,o);
   if(prev){a.deepEqual(r,prev);continue;}
   if(row.slot==='gloves'&&![26,145,159,166,173].includes(row.item)){a(!r?.checkpointSources);continue;}
   a(r?.checkpointSources?.length,'normal saved profile must select checkpoint in '+direction+': '+row.slot+row.item);
   a.equal(r.material.skinColor,normalized.appearance96.skinColor);
   a.deepEqual(r.states,ordinary.states,'changing equipment cannot change weapon frames');
   a.deepEqual(r.material,ordinary.material,'changing equipment cannot change head or skin material');
   savedSlots++;
   if(row.item===({pants:22,boots:9,gloves:26})[row.slot]){
    a(await enabled.prepareClip(p,o));for(let f=0;f<8;f++){
     const ctx=cv.createCanvas(800,800).getContext('2d');a(enabled.draw(ctx,p,{...o,progress:(f+.1)/8,x:300,y:450}));ctx.canvas.width=1;savedFrames++;
    }
   }
  }
  const p={...normalized,equipment:{...normalized.equipment,boots:{def:9}}};
  const far={...p,appearance96:{...normalized.appearance96,hairStyle:'hair-wavy'}};
  a(!enabled.selectVisual(far,o)?.checkpointSources,'unverified look cannot alias into this registration');
  a(!enabled.selectVisual({...p,equipment:{...p.equipment,legs:{def:21}}},o)?.checkpointSources,'unverified cuff cannot be registered');
  a(enabled.selectVisual({...p,equipment:{...p.equipment,legs:{def:22}}},o)?.checkpointSources,'P22/B9 must use the verified hem');
 }
 const palette=global.MareAppearance96;
 delete global.MareAppearance96;
 const late=api('https://fixture.test/');
 await late.ready;
 const sample={...normalized,equipment:{...normalized.equipment,boots:{def:9}}},opt={action:'attack-sword',direction:'south'};
 a(!late.selectVisual(sample,opt)?.checkpointSources);
 global.MareAppearance96=palette;
 a(await late.warmSwordCheckpoint(),'the lobby palette may load after the warrior indexes');
 a(late.selectVisual(sample,opt)?.checkpointSources?.length);
 a.equal(newSlots,96);a.equal(existing,24);a.equal(frames,96);a.equal(savedSlots,76);a.equal(savedFrames,96);a(logs.imageLoads>0);console.log({newSlots,existing,frames,savedSlots,savedFrames,logs});
})().catch(e=>{console.error(e);process.exit(1)});
