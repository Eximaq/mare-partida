'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cv=require('@napi-rs/canvas');
const root=p.resolve(process.argv[2]||p.join(__dirname,'../dist')),uri='https://fixture.test/index.html';
const pathFor=u=>p.join(root,new URL(u,uri).pathname);
const run=f=>vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
global.window=global;
global.ImageData=cv.ImageData;
global.OffscreenCanvas=function(w,h){return cv.createCanvas(w,h);};
global.fetch=async u=>{
 const file=pathFor(u);
 if(!fs.existsSync(file))return {ok:false,status:404};
 return {ok:true,json:async()=>JSON.parse(fs.readFileSync(file)),arrayBuffer:async()=>Uint8Array.from(fs.readFileSync(file)).buffer};
};
global.document={createElement(tag){
 if(tag==='canvas')return cv.createCanvas(1,1);
 if(tag==='script')return {};
 throw Error(tag);
},head:{append(s){try{run(pathFor(s.src));s.onload();}catch(e){console.error(e);s.onerror();}}}};
global.Image=class LocalImage extends cv.Image{
 set src(u){if(String(u).startsWith('blob:'))this.blobURL=u;else super.src=fs.readFileSync(pathFor(u));}
 async decode(){if(this.blobURL){const blob=require('node:buffer').resolveObjectURL(this.blobURL);super.src=Buffer.from(await blob.arrayBuffer());}return super.decode();}
};
const scripts=[...fs.readFileSync(p.join(root,'index.html'),'utf8').matchAll(/<script[^>]* src="([^"]+)"/g)].map(x=>x[1]).filter(f=>/^(?:player-rework-|paper-doll-96-lobby|character-appearance|headgear-visibility|native-head-compat|tools\/rework-accessories\/vendor)/.test(f));
for(const s of scripts)run(pathFor(s));

(async()=>{
 const core=MarePaperDoll96Lobby.create({baseURL:uri});
 await core.ready;assert.equal(core.snapshot().state,'ready');
 const data=JSON.parse(fs.readFileSync(p.join(root,'tools/rework-sword0-checkpoint/sword-catalog.json')));
 const appearance96=MareCharacterAppearance.normalize(data.appearance96);
 const baseActor={classId:'sword',appearance96,equipment:{weapon:{def:0},coat:null,legs:null,boots:{def:9},gloves:null,head:null}};
 const saved=JSON.stringify(baseActor);
 const probe=async (action,direction,actor=baseActor)=>{
  core.requestWorldVisual(actor,{action,direction,consumer:'world'});
  const deadline=Date.now()+15000;
  while(core.worldVisual().state==='loading'&&Date.now()<deadline)await new Promise(r=>setTimeout(r,10));
  assert(core.worldReady(actor),JSON.stringify(core.worldVisual()));
  const hit=core.worldVisual().coverage[0];
  assert.equal(hit.action,action);assert.equal(hit.direction,direction);
  assert.equal(hit.frames,8,JSON.stringify(hit));
  assert.equal(hit.slotRoutes?.boots?.item,9,JSON.stringify(hit));assert.equal(hit.slotRoutes?.weapon?.item,0);assert.deepEqual(hit.omitted,[]);
  const frames=[];
  for(let i=0;i<8;i++){
   const c=cv.createCanvas(400,360),ctx=c.getContext('2d');
   assert(core.drawWorldVisual(ctx,{action,direction,x:200,y:230,progress:(i+.25)/8},actor));
   const rgba=Buffer.from(ctx.getImageData(0,0,400,360).data);
   assert(rgba.some(v=>v!==0));frames.push(require('node:crypto').createHash('sha256').update(rgba).digest('hex'));c.width=1;
  }
  core.clearWorldVisual();global.gc?.();return {source:hit.source,frames};
 };
 for(const direction of ['north','south','east','west']){
  const authored=await probe('attack-sword',direction),game=await probe('attack',direction);
  assert.deepEqual(await probe('skill',direction),authored,'generic skill uses the same registered class pose');
  assert.deepEqual(game,authored,'the generic map command must keep the own registered sword and boot');
 }
 const mixed={...baseActor,equipment:{...baseActor.equipment,legs:{def:22}}},mixedSave=JSON.stringify(mixed);
 const local=await probe('attack-sword','north',mixed),normal=await probe('attack','north',mixed);
 assert(local.source.includes(':north-own-b9'));
 assert.deepEqual(normal,local);
 assert.deepEqual(await probe('skill','north',mixed),local);
 assert.equal(JSON.stringify(mixed),mixedSave);
 assert.equal(JSON.stringify(baseActor),saved);
 core.clearWorldVisual();
 console.log('PASS actual World attack and skill aliases, normal attack matches own approved sword/B9, including independent P22 North');
})().catch(e=>{console.error(e);process.exitCode=1;});
