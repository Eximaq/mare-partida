'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {make,cv}=require('./rework-integration-support.cjs');
const {equippedWorldPose}=require('./rework-world-pose-support.cjs');
const root=path.resolve(process.env.HD_PUBLISHED_ROOT||path.join(__dirname,'..')),local=url=>path.join(root,new URL(String(url),'http://localhost/').pathname);
test('actual lobby worldVisual swaps 111/112 and coats without stale attack identity',{timeout:240000},async()=>{
 const saved={window:global.window,ImageData:global.ImageData,fetch:global.fetch,document:global.document,Image:global.Image,MareReworkNativeHD:global.MareReworkNativeHD};
 global.window=global;global.ImageData=cv.ImageData;
 global.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(local(url)))});
 global.document={createElement:type=>type==='canvas'?cv.createCanvas(1,1):{},head:{append(node){try{vm.runInThisContext(fs.readFileSync(local(node.src),'utf8'),{filename:local(node.src)});node.onload();}catch(e){console.error(e);node.onerror(e);}}}};
 global.Image=class extends cv.Image{set src(value){super.src=fs.readFileSync(local(value));}decode(){return Promise.resolve();}};
 const native=make();global.MareReworkNativeHD={create:()=>native};
 const lobby=require('../paper-doll-96-lobby.js').create({baseURL:'http://localhost/'});
 try{
  await lobby.ready;assert.equal(lobby.snapshot().state,'ready',JSON.stringify(lobby.snapshot().errors));
  let previous=null;
  for(const [item,coat] of [[111,151],[111,158],[112,158]]){
   const action='attack-unarmed',p={classId:'brawler',factionId:'pirate',appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'},equipment:{weapon:{def:item},coat:{def:coat}}},before=JSON.stringify(p);
   if(previous)assert(!lobby.worldReady(p),'changed equipment invalidates previous identity');
   const ctx=cv.createCanvas(640,640).getContext('2d');
   for(const direction of ['east','west']){
    const entry=await equippedWorldPose(lobby,p,action,direction);
    assert.equal(entry.slotRoutes.coat.source,'male-authored-gauntlet'+item+'-eight/'+direction+'/coat-'+coat);
    assert.deepEqual(entry.unsupported||[],[]);
    assert(lobby.drawWorldVisual(ctx,{action,direction,progress:.5,timing:{locked:true,hitFrameRatio:.5,duration:1},x:320,y:512}));
    assert.equal(native.snapshot().last.source,entry.source);assert.equal(native.snapshot().last.frame,4);
    assert(lobby.worldReady(p));if(previous)assert(!lobby.worldReady(previous));
   }
   assert.equal(JSON.stringify(p),before);previous=p;
   assert(lobby.worldVisual().firstDrawAt!==undefined);assert(!lobby.worldReady({...p,equipment:{}}));
   if(item!==112||coat!==158)continue;
   const equipped={...p,equipment:{...p.equipment,gloves:{def:152}}};
   const extra=await equippedWorldPose(lobby,equipped,action,'west');assert(!lobby.worldReady(p));
   assert.equal(extra.slotRoutes.coat.source,'male-authored-gauntlet112-eight/west/coat-158');
   assert(lobby.drawWorldVisual(ctx,{action,direction:'west',progress:.5,x:320,y:512}));
   const removed={...p,equipment:{coat:{def:coat}}};
   const unarmed=await equippedWorldPose(lobby,removed,action,'west');
   assert(!unarmed.slotRoutes.weapon);assert(!lobby.worldReady(equipped));
   assert(lobby.drawWorldVisual(ctx,{action,direction:'west',progress:.5,x:320,y:512}));

  }
 }finally{lobby.clearWorldVisual();Object.assign(global,saved);}
});
