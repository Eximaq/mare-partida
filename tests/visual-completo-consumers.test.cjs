'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'..');
const atlas=require('../assets/skins/visual-completo/luffy/atlas.json');
const rendererModules=['luffy-animation.js','visual-completo-luffy.js','visual-completo-renderer.js'];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const actor=()=>({classId:'brawler',factionId:'pirate',hp:42.25,energy:17.5,
 appearance96:{gender:'masculino'},equipment:{weapon:{def:2,id:'owned-gauntlets'},visual_completo:{def:246,id:'owned-luffy'}}});

function fixture({assetState='ready',rendererScripts=rendererModules}={}){
 const nativePreparations=[],imageWaiters=[],received=[];
 const asset='assets/test-body.png',clip={modular:true,frames:1,fps:1,layers:{body:asset}};
 const directions=Object.fromEntries(['south','north','east','west'].map(d=>[d,clip]));
 const body={clips:Object.fromEntries(['idle','walk','attack-sword','attack-unarmed','attack-firearm',
  'attack-daggers','attack-focus','attack-tech'].map(action=>[action,directions]))};
 const files={
  'player-pack.json':{id:'native-player96-v1',productionEnabled:true,renderer:'native96',
   assetRevision:'native96-1111111111111111',manifestRevision:'fixture',weaponRevision:'fixture',resources:{[asset]:[128,128]}},
  'manifest.json':{referenceHeight:96,frame:{width:128,height:128},visualRevision:'fixture',bodies:{masculino:body,feminino:body}},
  'appearance-catalog.json':{styles:[],productionEnabled:false,canonicalMirror:{allLayers:true}},
  'appearance-rig.json':{},'weapons.json':{revision:'fixture',classes:{brawler:'unarmed',sword:'sword'},items:[]}
 };
 // These are the native provider's asynchronous asset/render boundaries. Its
 // authored selectors reject a complete visual slot; the consumer must pass
 // a presentation-only native projection without changing the saved actor.
 const native={ready:Promise.resolve(),snapshot:()=>({last:{source:'native-fixture'}}),
  selectVisual(player,o){return player.zoanTransformed||player.equipment?.visual_completo?null:{id:'native/'+o.action+'/'+o.direction,action:o.action};},
  sourceKeyFor:source=>source.id,
  async prepareConfiguration([requested],options){
   const resolved=options.resolve(requested);nativePreparations.push(resolved);
   return {coverage:[{source:resolved.source.id,omitted:[],unsupported:[]}],release(){},
    draw(ctx,player,o){if(!native.selectVisual(player,o))return false;ctx.nativeDraws.push({player,options:o});return true;}};
  },
  drawStable(ctx,player,o){if(!native.selectVisual(player,o))return false;ctx.nativeDraws.push({player,options:o});return true;},
  height:()=>96
 };
 class Img{
  set src(value){this.url=value;}
  async decode(){
   const source=Object.values(atlas.sources).find(s=>this.url.split('?')[0].endsWith(s.file));
   assert.ok(source,'real renderer requests a declared Luffy atlas');
   const state=typeof assetState==='function'?assetState(source):assetState;
   if(state==='failed')throw Error('Fixture image unavailable');
   if(state==='pending')await new Promise(resolve=>imageWaiters.push(resolve));
   [this.naturalWidth,this.naturalHeight]=source.size;
  }
 }
 const box={URL,AbortController,setTimeout,performance:{now:()=>1000},Date,Image:Img,console:{error(){}},
  fetch:async input=>{const url=new URL(input,'https://fixture.test/');return {ok:true,json:async()=>url.pathname.endsWith('/luffy/atlas.json')?atlas:files[url.pathname.split('/').pop()]};},
  document:{createElement:()=>({}),head:{append(node){node.onload();}}},
  MareHeadgear:{hidden:()=>false},MareReworkNativeHD:{create:()=>native},
  MareLayers96:{validate(){}},MareWardrobe96:{create(){}},MareAppearance96:{skins:{},hairs:{}}
 };
 for(const file of rendererScripts)vm.runInNewContext(fs.readFileSync(path.join(ROOT,file),'utf8'),box,{filename:file});
 const renderer=box.MareVisualCompletoRenderer,draw=renderer.draw;
 renderer.draw=(ctx,player,o)=>{received.push({...o});return draw(ctx,player,o);};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'paper-doll-96-lobby.js'),'utf8'),box,{filename:'paper-doll-96-lobby.js'});
 const core=box.MarePaperDoll96Lobby.create({baseURL:'https://fixture.test/',sharedLobby:true});
 const ctx={canvas:{width:320,height:400},nativeDraws:[],skinDraws:[],save(){},restore(){},drawImage(image){this.skinDraws.push(image.url);}};
 return {box,core,renderer,ctx,nativePreparations,imageWaiters,received};
}

for(const consumer of ['world','world-silhouette','preview','shared-lobby']){
 test(consumer+' preserves the class skill selector through the real Luffy renderer',async()=>{
  const {core,renderer,ctx,received}=fixture(),player=actor(),before=structuredClone(player);
  const options={consumer,action:'attack',direction:'north',progress:.5,skillIndex:1,classId:'brawler',freeHandPower:false,weaponless:false};
  await core.ready;
  await renderer.prepare(player,{...options,skillIndex:undefined});
  await renderer.prepare(player,options);
  assert.equal(core.draw(ctx,player,options),true);
  assert.equal(renderer.snapshot().last.action,'guard_brawler_gauntlets');
  assert.equal(received.at(-1).skillIndex,1);
  assert.equal(received.at(-1).classId,'brawler');
  assert.equal(received.at(-1).freeHandPower,false);
  assert.deepEqual(player,before);
 });
 for(const flag of ['weaponless','freeHandPower'])test(consumer+' preserves '+flag+' for a free-hand cast',async()=>{
  const {core,renderer,ctx}=fixture(),player=actor();
  const options={consumer,action:'attack',direction:'east',progress:.5,[flag]:true};
  await core.ready;
  await renderer.prepare(player,{...options,[flag]:false});
  await renderer.prepare(player,options);
  assert.equal(core.draw(ctx,player,options),true);
  assert.equal(renderer.snapshot().last.action,'cast_palm_shared');
 });
}

for(const assetState of ['pending','failed'])test('a '+assetState+' Luffy source keeps the native world actor and silhouette visible',async()=>{
 const {core,renderer,ctx,nativePreparations,imageWaiters}=fixture({assetState}),player=actor(),before=structuredClone(player);
 const options={consumer:'world',action:'idle',direction:'south',time:.25};
 await core.ready;
 const loading=renderer.prepare(player,options);
 await settle();
 core.primeWorldVisual(player,{direction:'south'});
 await settle();
 assert.equal(nativePreparations.length,8,'prepare all native idle/walk directions while the complete visual is unavailable');
 assert.equal(core.draw(ctx,player,options),true);
 assert.equal(ctx.nativeDraws.length,1,'the consumer actually paints the native body');
 assert.equal(ctx.skinDraws.length,0);
 assert.equal(core.worldReady(player),true,'native fallback readiness uses the saved actor identity');
 assert.equal(core.draw(ctx,player,{...options,consumer:'world-silhouette'}),true);
 assert.equal(ctx.nativeDraws.length,2);
 assert.equal(ctx.nativeDraws.at(-1).options.consumer,'world-silhouette');
 assert.equal(ctx.nativeDraws.at(-1).player.equipment.visual_completo,undefined);
 assert.equal(ctx.nativeDraws.at(-1).player.equipment.weapon.def,2);
 assert.deepEqual(player,before,'fallback must not unequip the owned visual or functional weapon');
 if(assetState==='pending'){
  for(const resume of imageWaiters)resume();
  assert.equal(await loading,true);
  assert.equal(core.draw(ctx,player,options),true);
  assert.equal(ctx.skinDraws.length,1,'the completed skin takes over without a save transition');
  assert.equal(ctx.nativeDraws.length,2);
 }else assert.equal(await loading,false);
 core.clearWorldVisual();
});

for(const consumer of ['preview','shared-lobby'])for(const assetState of ['pending','failed'])test(consumer+' keeps the native actor while the Luffy source is '+assetState,async()=>{
 const {core,renderer,ctx,imageWaiters}=fixture({assetState}),player=actor(),before=structuredClone(player);
 const options={consumer,action:'idle',direction:'south'};
 await core.ready;
 const loading=renderer.prepare(player,options);await settle();
 assert.equal(core.draw(ctx,player,options),true);
 assert.equal(ctx.nativeDraws.length,1);
 assert.equal(ctx.nativeDraws[0].player.equipment.visual_completo,undefined);
 assert.equal(ctx.nativeDraws[0].player.equipment.weapon.def,2);
 assert.deepEqual(player,before);
 if(assetState==='pending')for(const resume of imageWaiters)resume();
 await loading;
});

test('equipping Luffy keeps the already prepared native actor visible while its source loads',async()=>{
 const {core,renderer,ctx,nativePreparations,imageWaiters}=fixture({assetState:'pending'}),player=actor();
 const item=player.equipment.visual_completo;delete player.equipment.visual_completo;
 const options={consumer:'world',action:'idle',direction:'south'};
 await core.ready;core.primeWorldVisual(player);await settle();
 assert.equal(core.draw(ctx,player,options),true);
 const prepared=nativePreparations.length;
 player.equipment.visual_completo=item;
 const loading=renderer.prepare(player,options);await settle();
 assert.equal(core.draw(ctx,player,options),true);
 assert.equal(core.worldReady(player),true);
 assert.equal(ctx.nativeDraws.length,2);
 assert.equal(nativePreparations.length,prepared,'equipping a pending skin preserves its compatible native preparation');
 for(const resume of imageWaiters)resume();await loading;
 core.clearWorldVisual();
});

test('a loaded Luffy idle hands off to a prepared native pose until its next skin clip is ready',async()=>{
 const {core,renderer,ctx,imageWaiters}=fixture({assetState:source=>source.file.includes('/idle_')?'ready':'pending'}),player=actor();
 const idle={consumer:'world',action:'idle',direction:'south',time:1};
 await core.ready;core.primeWorldVisual(player);await settle();
 assert.equal(await renderer.prepare(player,idle),true);
 assert.equal(core.draw(ctx,player,idle),true);assert.equal(ctx.nativeDraws.length,0);
 const attack={...idle,action:'attack',progress:.5,timing:{hitFrameRatio:.6}};
 const loading=renderer.prepare(player,attack);await settle();
 assert.equal(core.draw(ctx,player,attack),true,'an already loaded idle must not leave the world blank at the next pending clip');
 assert.equal(ctx.nativeDraws.length,1);
 assert.equal(ctx.nativeDraws[0].options.action,'idle');
 assert.equal(ctx.nativeDraws[0].options.progress,null,'native locomotion does not inherit a pending attack contact clock');
 assert.equal(core.draw(ctx,player,{...attack,consumer:'world-silhouette'}),true);
 for(const resume of imageWaiters)resume();assert.equal(await loading,true);
 assert.equal(core.draw(ctx,player,attack),true);
 assert.equal(renderer.snapshot().last.action,'attack_brawler_gauntlets');
 assert.equal(ctx.skinDraws.length,2);
 core.clearWorldVisual();
});

test('an unavailable Luffy source can warm the next native combat pose',async()=>{
 const {core,renderer,ctx,nativePreparations}=fixture({assetState:'failed'}),player=actor();
 await core.ready;await renderer.prepare(player,{action:'idle',direction:'south'});
 await core.prepareVisual(player,{consumer:'world',action:'idle',direction:'south'});
 assert.equal(core.draw(ctx,player,{consumer:'world',action:'idle',direction:'south'}),true);
 assert.equal(core.warmWorldVisual(player,{action:'attack-unarmed',direction:'south',weaponless:true}),true);
 await settle();
 assert.equal(nativePreparations.at(-1).options.weaponless,true);
 assert.equal(core.draw(ctx,player,{consumer:'world',action:'attack-unarmed',direction:'south',weaponless:true,progress:.5}),true);
 assert.equal(ctx.nativeDraws.at(-1).options.weaponless,true);
 core.clearWorldVisual();
});

test('the native Luffy fallback keeps transformed bodies and Zoro on their existing routes',async()=>{
 const {core,ctx,nativePreparations}=fixture({assetState:'failed'}),player=actor();
 await core.ready;
 player.zoanTransformed=true;
 core.primeWorldVisual(player);
 assert.equal(core.draw(ctx,player,{consumer:'world',action:'idle',direction:'south'}),false);
 assert.equal(core.draw(ctx,player,{consumer:'shared-lobby',action:'idle',direction:'south'}),false);
 await settle();
 assert.equal(nativePreparations.length,0);assert.equal(ctx.nativeDraws.length,0);
 const zoro={...actor(),classId:'sword',equipment:{visual_completo:{def:187}}};
 core.primeWorldVisual(zoro);await settle();assert.equal(nativePreparations.length,0);
 core.clearWorldVisual();
});

for(const html of ['index.html','ui-preview.html'])test(html+' loads a working Luffy resolver before its renderer',()=>{
 const scripts=[...fs.readFileSync(path.join(ROOT,html),'utf8').matchAll(/<script\b[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g)]
  .map(m=>m[1]).filter(name=>rendererModules.includes(name));
 const {renderer}=fixture({rendererScripts:scripts});
 assert.equal(renderer.pose(atlas,actor(),{action:'idle',direction:'south'})?.action,'idle_brawler_gauntlets');
});
