'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {make,cv}=require('./rework-integration-support.cjs');
const root=path.resolve(__dirname,'..'),local=url=>path.join(root,new URL(String(url),'http://localhost/').pathname);
test('actual lobby worldVisual prepares full equipped identity, selects ordered attacks and replaces prior bundle',async()=>{
 const saved={window:global.window,ImageData:global.ImageData,fetch:global.fetch,document:global.document,Image:global.Image,MareReworkNativeHD:global.MareReworkNativeHD};
 global.window=global;global.ImageData=cv.ImageData;
 global.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(local(url)))});
 global.document={createElement:type=>type==='canvas'?cv.createCanvas(1,1):{},head:{append(node){try{vm.runInThisContext(fs.readFileSync(local(node.src),'utf8'),{filename:local(node.src)});node.onload();}catch(e){console.error(e);node.onerror(e);}}}};
 global.Image=class extends cv.Image{set src(value){super.src=fs.readFileSync(local(value));}decode(){return Promise.resolve();}};
 const native=make();global.MareReworkNativeHD={create:()=>native};
 const lobby=require('../paper-doll-96-lobby.js').create({baseURL:'http://localhost/'});
 try{
  await lobby.ready;assert.equal(lobby.snapshot().state,'ready',JSON.stringify(lobby.snapshot().errors));
  for(const item of [14,16,31]){
   const action=item===14?'attack-unarmed':'attack-focus',p={classId:item===14?'cyborg':'strategist',factionId:'pirate',appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'},equipment:{weapon:{def:item}}},before=JSON.stringify(p);
   lobby.requestWorldVisual(p,{actions:[action],scope:'ordered-test-'+item});
   for(let n=0;n<1000&&lobby.worldVisual()?.state==='loading';n++)await new Promise(r=>setTimeout(r,10));
   const visual=lobby.worldVisual();assert.equal(visual?.state,'ready',JSON.stringify(visual));assert.equal(visual.publishedKey,visual.key);assert(lobby.worldReady(p));assert.equal(JSON.stringify(p),before);
   const directions=item===14?['south']:['east','west'];
   for(const direction of directions){const entry=visual.coverage.find(c=>c.action===action&&c.direction===direction&&!c.weaponless);assert.equal(entry?.source,'authored-ordered-'+item+'-'+direction);assert.deepEqual(entry.omitted,[]);assert.deepEqual(entry.unsupported,[]);assert(lobby.drawWorldVisual(cv.createCanvas(640,640).getContext('2d'),{action,direction,progress:.5,timing:{locked:true,hitFrameRatio:.5,duration:1},x:320,y:512}));assert.equal(native.snapshot().last.source,entry.source);assert.equal(native.snapshot().last.frame,4);}
   assert(lobby.worldVisual().firstDrawAt!==undefined);assert(!lobby.worldReady({...p,equipment:{}}));
   const equipped={...p,equipment:{...p.equipment,gloves:{def:152}}};lobby.requestWorldVisual(equipped,{actions:[action],scope:'extra-'+item});
   for(let n=0;n<1000&&lobby.worldVisual()?.state==='loading';n++)await new Promise(r=>setTimeout(r,10));
   assert.equal(lobby.worldVisual().state,'ready',JSON.stringify(lobby.worldVisual()));assert(lobby.worldReady(equipped));assert(!lobby.worldReady(p));assert(!lobby.worldVisual().coverage.some(c=>c.source?.startsWith('authored-ordered-')));
   const removed={...p,equipment:{}};lobby.requestWorldVisual(removed,{actions:[action],scope:'removed-'+item});
   for(let n=0;n<1000&&lobby.worldVisual()?.state==='loading';n++)await new Promise(r=>setTimeout(r,10));
   assert.equal(lobby.worldVisual().state,'ready',JSON.stringify(lobby.worldVisual()));assert(lobby.worldReady(removed));assert(!lobby.worldVisual().coverage.some(c=>c.source?.startsWith('authored-ordered-')));

  }
 }finally{lobby.clearWorldVisual();Object.assign(global,saved);}
});
