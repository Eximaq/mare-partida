'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const {test}=require('node:test');

const source=readFileSync(join(__dirname,'../paper-doll-96-lobby.js'),'utf8');
const pose={action:'idle',direction:'south',consumer:'world'};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({aliases=false,holdPositions=false,holdScripts=false}={}){
 let clock=0;
 let resolvePositions;const approved=new Promise(resolve=>{resolvePositions=resolve;});
 const jobs=[],scripts=[],asset='assets/test-body.png',poseSpec={modular:true,frames:1,fps:1,layers:{body:asset}};
 const dirs=Object.fromEntries(['south','north','east','west'].map(dir=>[dir,poseSpec]));
 const body={clips:Object.fromEntries(['idle','walk','attack-sword','attack-unarmed','attack-firearm',
  'attack-daggers','attack-focus','attack-tech'].map(action=>[action,dirs]))};
 const files={
  'player-pack.json':{id:'native-player96-v1',productionEnabled:true,renderer:'native96',
   assetRevision:'native96-1111111111111111',manifestRevision:'fixture',weaponRevision:'fixture',resources:{[asset]:[128,128]}},
  'manifest.json':{referenceHeight:96,frame:{width:128,height:128},visualRevision:'fixture',bodies:{masculino:body,feminino:body}},
  'appearance-catalog.json':{styles:[],productionEnabled:false,canonicalMirror:{allLayers:true}},
  'appearance-rig.json':{},
  'weapons.json':{revision:'fixture',classes:{sword:'sword'},items:[]}
 };
 const native={
  ready:Promise.resolve(),snapshot:()=>({}),
  selectVisual(player,o){
   const physical=aliases&&['attack','skill'].includes(o.action)?'attack-sword':o.action;
   return {id:'gloves-'+player.equipment.gloves.def+'/'+physical+'/'+o.direction,resolvedAction:physical};
  },
  sourceKeyFor:r=>r.id,
  prepareConfiguration([requested],options){
   return new Promise((resolve,reject)=>jobs.push({requested,options,resolve,reject}));
  }
 };
 const globals={
  URL,AbortController,setTimeout,console:{error(){}},
  performance:{now:()=>clock},
  fetch:async url=>({ok:true,json:async()=>url.pathname.endsWith('hd-position-approved.json')?approved:files[url.pathname.split('/').pop()]}),
  ...(holdPositions?{MareHDPosition:{validate:v=>v}}:{}),
  document:{createElement:()=>({}),head:{append(node){scripts.push(node);if(!holdScripts)node.onload();}}},
  MareHeadgear:{hidden:()=>false},MareReworkNativeHD:{create:()=>native},
  MareLayers96:{validate(){}},MareWardrobe96:{create(){}},MareAppearance96:{skins:{},hairs:{}}
 };
 runInNewContext(source,globals);
 const core=globals.MarePaperDoll96Lobby.create({baseURL:'https://fixture.test/'});
 const player={classId:'sword',appearance96:{gender:'masculino'},equipment:{gloves:{def:25},boots:{def:9}}};
 const ctx={frames:[]};
 return {core,player,ctx,jobs,scripts,resolvePositions,advance(ms){clock+=ms;},draw(options){return core.drawWorldVisual(ctx,{...pose,...options},player);}};
}
function visual(label,omitted=[]){
 return {released:false,draws:[],coverage:[{omitted,slotResolution:Object.fromEntries(omitted.map(slot=>[slot,{state:'load-failed'}]))}],
  draw(ctx,_player,options){assert.equal(this.released,false);this.draws.push(options);ctx.frames.push(label);return true;},
  release(){this.released=true;}};
}

test('warming the current pose shares work and a past equipment response cannot take over',async()=>{
 const {core,player,ctx,jobs,draw}=fixture();
 await core.ready;
 const startup=core.ensure(player);
 assert.equal(draw(),false);
 await settle();
 assert.equal(jobs.length,1);
 const stale=visual('old gloves');
 player.equipment.gloves.def=26;
 assert.equal(draw(),false);
 await settle();
 assert.equal(jobs[0].requested.player.equipment.gloves.def,25);
 assert.equal(jobs[0].options.signal.aborted,true);
 assert.equal(jobs[1].requested.player.equipment.gloves.def,26);
 jobs[0].resolve(stale);
 await startup;
 assert.equal(stale.released,true);
 assert.equal(draw(),false);
 jobs[1].resolve(visual('new gloves'));
 await settle();
 assert.equal(draw(),true);
 assert.deepEqual(ctx.frames,['new gloves']);
});

test('an unavailable owned layer retries twice while the other passes keep drawing',async()=>{
 const {core,jobs,draw,ctx,advance}=fixture();
 await core.ready;
 assert.equal(draw(),false);
 await settle();
 const partial=visual('working passes',['gloves']);
 jobs[0].resolve(partial);
 await settle();
 assert.equal(draw(),true);
 advance(1500);
 assert.equal(draw(),true);
 await settle();
 const regress=visual('fewer passes',['gloves','boots']);
 jobs[1].resolve(regress);
 await settle();
 assert.equal(regress.released,true);
 assert.equal(draw(),true);
 advance(3000);
 assert.equal(draw(),true);
 await settle();
 jobs[2].reject(Error('Network request failed again'));
 await settle();
 advance(30000);
 assert.equal(draw(),true);
 assert.equal(partial.released,false);
 assert.equal(jobs.length,3);
 assert.deepEqual(ctx.frames,Array(5).fill('working passes'));
 core.retryWorldVisual();
 assert.equal(draw(),true);
 await settle();
 jobs[3].resolve(visual('complete'));
 await settle();
 assert.equal(draw(),true);
 assert.equal(partial.released,true);
 assert.equal(ctx.frames.at(-1),'complete');
});

test('a pending attack and the next movement keep the current HD actor in motion',async()=>{
 const {core,player,jobs,draw,ctx,advance}=fixture();
 await core.ready;
 const walk={action:'walk',direction:'east',time:.125};
 assert.equal(draw(walk),false);
 await settle();
 const eastWalk=visual('east walk');
 jobs[0].resolve(eastWalk);
 await settle();
 assert.equal(draw(walk),true);
 const attack={action:'attack',direction:'east',time:.2,progress:.6,timing:{locked:true},x:30,y:42};
 advance(125);
 assert.equal(draw(attack),true);
 const shown=eastWalk.draws.at(-1);
 assert.deepEqual([shown.action,shown.direction,shown.time,shown.progress,shown.timing,shown.x,shown.y],
  ['walk','east',.25,null,null,30,42]);
 assert.equal(core.worldVisual().displayed.exact,false);
 await settle();
 const northWalk={action:'walk',direction:'north',time:.25};
 assert.equal(draw(northWalk),true);
 await settle();
 const eastAttack=visual('late east attack');
 jobs[1].resolve(eastAttack);
 await settle();
 assert.equal(draw(northWalk),true);
 assert.equal(ctx.frames.at(-1),'east walk');
 assert.equal(eastAttack.draws.length,0);
 jobs[2].resolve(visual('north walk'));
 await settle();
 assert.equal(draw(northWalk),true);
 assert.equal(core.worldVisual().displayed.direction,'north');
 assert.equal(core.worldVisual().displayed.exact,true);
 assert.equal(draw(attack),true);
 assert.equal(jobs.length,3);
 assert.equal(eastAttack.draws.at(-1).timing,attack.timing);
 assert.equal(core.worldVisual().displayed.exact,true);
 assert.equal(draw(northWalk),true);
 assert.equal(ctx.frames.at(-1),'north walk');
 player.equipment.gloves.def=26;
 assert.equal(draw(northWalk),false);
 assert.equal(core.worldVisual().displayed,null);
 core.clearWorldVisual();
});

test('anticipation is bounded and a weaponless pose cannot borrow a visible weapon',async()=>{
 const {core,player,jobs,draw,ctx}=fixture();
 player.equipment.weapon={def:0};
 await core.ready;
 assert.equal(core.warmWorldVisual(player,{action:'attack',direction:'south'}),false);
 assert.equal(draw(),false);
 await settle();
 const idle=visual('armed idle');
 jobs[0].resolve(idle);
 await settle();
 assert.equal(draw(),true);
 const idleKey=core.worldVisual().key;
 const punch={action:'attack-unarmed',direction:'south',weaponless:true};
 assert.equal(core.warmWorldVisual(player,punch),true);
 assert.equal(core.warmWorldVisual(player,{action:'walk',direction:'north'}),false);
 assert.equal(core.worldVisual().key,idleKey);
 assert.equal(draw(punch),false);
 assert.equal(core.worldVisual().displayed,null);
 await settle();
 assert.equal(jobs.length,2);
 const noWeapon=visual('weaponless punch');
 jobs[1].resolve(noWeapon);
 await settle();
 assert.equal(draw(punch),true);
 assert.equal(ctx.frames.at(-1),'weaponless punch');
 assert.equal(noWeapon.draws.at(-1).weaponless,true);
 assert.equal(draw(),true);
 assert.equal(ctx.frames.at(-1),'armed idle');
 assert.equal(core.warmWorldVisual(player,{action:'idle',direction:'south',weaponless:true}),true);
 await settle();
 const stopped=jobs[2].options.signal;
 assert.equal(draw({action:'walk',direction:'west'}),true);
 assert.equal(stopped.aborted,true);
 const late=visual('abandoned weaponless anticipation');
 jobs[2].resolve(late);
 await settle();
 assert.equal(late.released,true);
 assert.equal(draw({action:'walk',direction:'west'}),true);
 assert.equal(ctx.frames.at(-1),'armed idle');
 core.clearWorldVisual();
});

test('the first actor waits for eight directional cycles while requests stay asynchronous and share the exact routes',async()=>{
 const {core,player,jobs,draw,ctx}=fixture();
 const directions=['north','east','south','west'];
 const actions=[{action:'attack',essential:true}];
 core.primeWorldVisual(player,{direction:'south',actions});
 assert.equal(draw(),false);
 await settle();
 assert.equal(jobs.length,1);
 const east={action:'walk',direction:'east',time:.25};
 assert.equal(draw(east),false);
 for(let index=0;index<12;index++){
  const job=jobs[index];
  assert(job,'each planned pose launches in sequence');
  if(index===1)assert.deepEqual([job.requested.options.action,job.requested.options.direction],['walk','east']);
  assert.equal(jobs.length,index+1);
  const o=job.requested.options;
  assert.equal(job.options.compactFrames,true);
  job.resolve(visual(o.action+'/'+o.direction));
  await settle();
  if(index<11)assert.equal(draw(east),false);
 }
 assert.deepEqual(Array.from(core.worldVisual().preparation.readyWalks),directions);
 assert.deepEqual(Array.from(core.worldVisual().preparation.readyIdles),directions);
 assert.equal(core.worldVisual().preparation.prepared,12);
 for(const direction of directions)for(const action of ['walk','idle','attack']){
  assert.equal(draw({action,direction}),true);
  assert.equal(core.worldVisual().displayed.exact,true);
  assert.equal(ctx.frames.at(-1),action+'/'+direction);
 }
 const extra={action:'attack-focus',direction:'east'};
 assert.equal(draw(extra),true);
 assert.equal(core.worldVisual().displayed.direction,'east');
 assert.equal(core.worldVisual().displayed.exact,false);
 const request=core.worldVisual().key;
 assert.equal(core.draw(ctx,player,{consumer:'world-silhouette',action:'attack-focus',direction:'west'}),false);
 assert.equal(core.draw(ctx,player,{consumer:'world-silhouette',action:'attack-focus',direction:'east'}),true);
 assert.equal(core.worldVisual().key,request);
 core.primeWorldVisual(player,{direction:'west',actions});
 await settle();
 assert.equal(jobs.length,13);
 core.clearWorldVisual();
});

test('verified aliases share a composed bundle but keep the requested action metadata',async()=>{
 const {core,player,jobs,draw,ctx}=fixture({aliases:true});
 const actions=[{action:'attack',essential:true},{action:'skill',essential:true}];
 core.primeWorldVisual(player,{actions});
 await settle();
 const rasters=[];
 for(let index=0;index<12;index++){
  const job=jobs[index],o=job.requested.options;
  const raster=visual(o.action+'/'+o.direction);
  raster.expectedAction=o.action;
  const paint=raster.draw;
  raster.draw=function(ctx,p,options){assert.equal(options.action,this.expectedAction);return paint.call(this,ctx,p,options);};
  rasters.push(raster);
  job.resolve(raster);
  await settle();
 }
 assert.equal(jobs.length,12);
 assert.equal(draw({action:'skill',direction:'west'}),true);
 assert.equal(ctx.frames.at(-1),'attack/west');
 assert.equal(core.worldVisual().preparation.total,16);
 assert.equal(core.worldVisual().preparation.prepared,16);
 assert.equal(core.worldVisual().displayed.action,'skill');
 core.clearWorldVisual();
 assert(rasters.every(raster=>raster.released));
});

test('approved positions arrive before the visual plan and an outdated queue cannot publish',async()=>{
 const {core,player,jobs,draw,resolvePositions}=fixture({holdPositions:true});
 const actions=[];
 core.primeWorldVisual(player,{actions});
 assert.equal(draw(),false);
 await settle();
 assert.equal(jobs.length,0);
 const positions={revision:'new-positions',records:[{}]};
 resolvePositions(positions);
 await settle();
 assert.equal(jobs[0].options.positions,positions);
 const prior=jobs[0];
 player.equipment.gloves.def=26;
 core.primeWorldVisual(player,{direction:'west',actions});
 assert.equal(draw({direction:'west'}),false);
 await settle();
 assert.equal(jobs.length,2);
 assert.equal(prior.options.signal.aborted,true);
 assert.equal(jobs[1].requested.player.equipment.gloves.def,26);
 const stale=visual('wrong equipment');
 prior.resolve(stale);
 await settle();
 assert.equal(stale.released,true);
 assert.equal(core.worldVisual().displayed,null);
 assert.equal(core.worldVisual().preparation.total,8);
 core.clearWorldVisual();
});

test('the startup scripts fetch in parallel and execute in their assigned order',async()=>{
 const {core,scripts}=fixture({holdScripts:true});
 await settle();
 assert.deepEqual(scripts.map(s=>new URL(s.src).pathname.split('/').pop()),
  ['rig.js','layers.js','motion.js','surface.js','torso.js','appearance.js','weapons.js','wardrobe.js']);
 assert(scripts.every(s=>s.async===false));
 for(const script of scripts)script.onload();
 assert.equal((await core.ready).state,'ready');
});
