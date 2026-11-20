const fs=require('node:fs'),p=require('node:path'),a=require('node:assert/strict'),root=p.resolve(process.argv[2]),dist=p.join(root,'dist');
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs')),loader=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
require(p.join(root,'player-rework-sword0-checkpoint.js'));
const catalog=require(p.join(dist,'tools/rework-sword0-checkpoint/sword-catalog.json'));
const material='tools/rework-sword0-checkpoint/sword-catalog.json',logs={catalogRequests:0,imageLoads:0};
const api=(url,corrupt=false)=>make({baseURL:url,fetchJSON:async f=>{if(f===material){logs.catalogRequests++;return corrupt?{...catalog,guards:{...catalog.guards,north:'bad'}}:catalog;} return JSON.parse(fs.readFileSync(p.join(root,f)));},loadImage:f=>{if(f.startsWith('tools/rework-sword0-checkpoint/')){logs.imageLoads++;return cv.loadImage(p.join(dist,f));}return loader(f);}});
(async()=>{
 const def=api('https://fixture.test/'), enabled=api('https://fixture.test/?reviewSwordCheckpoint=1'), invalid=api('https://fixture.test/?reviewSwordCheckpoint=1',true);
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
 a(logs.imageLoads>0);console.log({newSlots,existing,frames,logs});
})().catch(e=>{console.error(e);process.exit(1)});
