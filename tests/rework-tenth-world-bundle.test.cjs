'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {make,cv}=require('./rework-integration-support.cjs');
const root=path.resolve(__dirname,'..'),local=url=>path.join(root,new URL(String(url),'http://localhost/').pathname);
if(!process.env.MARE_TENTH_MODE)test('sword, orb weapon and orb coat swaps execute in separate serial processes',{timeout:240000},async()=>{
 const {spawnSync}=require('node:child_process');
 for(const pair of ['swords','orb-weapons','orb-coats']){const env={...process.env,MARE_TENTH_MODE:pair};delete env.NODE_TEST_CONTEXT;const r=spawnSync(process.execPath,['--test','--test-reporter=tap',__filename],{env,encoding:'utf8',timeout:110000,maxBuffer:4*1024*1024});console.log(r.stdout);assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,0,r.stderr+'\n'+r.stdout);assert.match(r.stdout,/# pass 1/);assert(r.stdout.includes('tenth-world draw complete '+pair+' 0'));assert(r.stdout.includes('tenth-world draw complete '+pair+' 1'));}
});
else test('actual lobby invalidates weapon and coat identities for scoped tenth profiles',{timeout:240000},async()=>{
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
  const mode=process.env.MARE_TENTH_MODE,configs=mode==='swords'?[[67,null],[70,null]]:mode==='orb-weapons'?[[17,151],[122,151]]:[[17,151],[17,158]];let drawIndex=0;for(const [item,coat] of configs){
   const orb=coat!=null,action=orb?'attack-focus':'attack-sword',p={classId:orb?'strategist':'sword',factionId:'pirate',appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'},equipment:{weapon:{def:item},...(coat?{coat:{def:coat}}:{})}},before=JSON.stringify(p);
   if(previous)assert(!lobby.worldReady(p),'changed equipment invalidates previous identity');console.log('ninth-world start',item,coat);lobby.requestWorldVisual(p,{actions:[action],scope:'ordered-test-'+item});
   for(let n=0;n<1000&&lobby.worldVisual()?.state==='loading';n++)await new Promise(r=>setTimeout(r,10));
   console.log('ninth-world equipped ready',item,coat,Math.round(process.memoryUsage().rss/1048576)+'MB');const visual=lobby.worldVisual();assert.equal(visual?.state,'ready',JSON.stringify(visual));assert.equal(visual.publishedKey,visual.key);assert(lobby.worldReady(p));assert.equal(JSON.stringify(p),before);if(previous)assert(!lobby.worldReady(previous));previous=p;
   const directions=['east','west'];
   for(const direction of directions){const entry=visual.coverage.find(c=>c.action===action&&c.direction===direction&&!c.weaponless);assert.equal(entry?.source,(orb?`authored-orb-${item}-${direction}-coat-${coat}`:`authored-ordered-${item}-${direction}`));assert.deepEqual(entry.omitted,[]);assert.deepEqual(entry.unsupported,[]);assert(lobby.drawWorldVisual(cv.createCanvas(640,640).getContext('2d'),{action,direction,progress:.5,timing:{locked:true,hitFrameRatio:.5,duration:1},x:320,y:512}));assert.equal(native.snapshot().last.source,entry.source);assert.equal(native.snapshot().last.frame,4);}
   assert(lobby.worldVisual().firstDrawAt!==undefined);assert(!lobby.worldReady({...p,equipment:{}}));
   console.log('tenth-world draw complete',mode,drawIndex++);if(drawIndex!==2)continue;const equipped={...p,equipment:{...p.equipment,gloves:{def:152}}};lobby.requestWorldVisual(equipped,{actions:[action],scope:'extra-'+item});
   for(let n=0;n<1000&&lobby.worldVisual()?.state==='loading';n++)await new Promise(r=>setTimeout(r,10));
   assert.equal(lobby.worldVisual().state,'ready',JSON.stringify(lobby.worldVisual()));assert(lobby.worldReady(equipped));assert(!lobby.worldReady(p));assert(!lobby.worldVisual().coverage.some(c=>/authored-(ordered|orb)-/.test(c.source||'')));
   console.log('ninth-world extra complete',item,coat);const removed={...p,equipment:{}};lobby.requestWorldVisual(removed,{actions:[action],scope:'removed-'+item});
   for(let n=0;n<1000&&lobby.worldVisual()?.state==='loading';n++)await new Promise(r=>setTimeout(r,10));
   assert.equal(lobby.worldVisual().state,'ready',JSON.stringify(lobby.worldVisual()));assert(lobby.worldReady(removed));assert(!lobby.worldVisual().coverage.some(c=>/authored-(ordered|orb)-/.test(c.source||'')));

  }
 }finally{lobby.clearWorldVisual();Object.assign(global,saved);}
});
