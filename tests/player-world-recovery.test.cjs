'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const {test}=require('node:test');

const source=readFileSync(join(__dirname,'../paper-doll-96-lobby.js'),'utf8');
const pose={action:'idle',direction:'south',consumer:'world'};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 let clock=0;
 const jobs=[],asset='assets/test-body.png',poseSpec={modular:true,frames:1,fps:1,layers:{body:asset}};
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
  selectVisual(player){return {id:'gloves-'+player.equipment.gloves.def};},
  prepareConfiguration([requested],options){
   return new Promise((resolve,reject)=>jobs.push({requested,options,resolve,reject}));
  }
 };
 const globals={
  URL,AbortController,setTimeout,console:{error(){}},
  performance:{now:()=>clock},
  fetch:async url=>({ok:true,json:async()=>files[url.pathname.split('/').pop()]}),
  document:{createElement:()=>({}),head:{append(node){node.onload();}}},
  MareHeadgear:{hidden:()=>false},MareReworkNativeHD:{create:()=>native},
  MareLayers96:{validate(){}},MareWardrobe96:{create(){}},MareAppearance96:{skins:{},hairs:{}}
 };
 runInNewContext(source,globals);
 const core=globals.MarePaperDoll96Lobby.create({baseURL:'https://fixture.test/'});
 const player={classId:'sword',appearance96:{gender:'masculino'},equipment:{gloves:{def:25},boots:{def:9}}};
 const ctx={frames:[]};
 return {core,player,ctx,jobs,advance(ms){clock+=ms;},draw(){return core.drawWorldVisual(ctx,pose,player);}};
}
function visual(label,omitted=[]){
 return {released:false,coverage:[{omitted,slotResolution:Object.fromEntries(omitted.map(slot=>[slot,{state:'load-failed'}]))}],
  draw(ctx){assert.equal(this.released,false);ctx.frames.push(label);return true;},
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
