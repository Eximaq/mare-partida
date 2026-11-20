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
 await core.ready;
 assert.equal(core.snapshot().state,'ready',JSON.stringify(core.snapshot()));
 const data=JSON.parse(fs.readFileSync(p.join(root,'tools/rework-sword0-checkpoint/sword-catalog.json')));
 const look=MareCharacterAppearance.normalize(data.appearance96);
 const actor={classId:'sword',appearance96:look,equipment:{weapon:{def:0},coat:{def:151},legs:{def:22},boots:{def:9}}};
 const saved=JSON.stringify(actor),action='attack-sword';
 core.requestWorldVisual(actor,{actions:[action],scope:'sword-default-proof'});
 while(core.worldVisual().state==='loading')await new Promise(r=>setTimeout(r,10));
 assert(core.worldReady(actor),JSON.stringify(core.worldVisual()));
 let frames=0;
 for(const direction of ['north','south','east','west']){
  const hit=core.worldVisual().coverage.find(c=>c.action===action&&c.direction===direction);
  assert.equal(hit?.slotRoutes?.boots?.item,9);
  assert.equal(hit?.slotRoutes?.legs?.item,22);
  assert.equal(hit?.frames,8);
  for(let i=0;i<8;i++){
   const ctx=cv.createCanvas(400,360).getContext('2d');
   assert(core.drawWorldVisual(ctx,{action,direction,x:200,y:230,progress:(i+.25)/8}));
   assert(ctx.getImageData(0,0,400,360).data.some(v=>v!==0));ctx.canvas.width=1;frames++;
  }
 }
 assert.equal(JSON.stringify(actor),saved);
 console.log({normalGameScripts:true,saveUnchanged:true,phaseCount:frames,directions:4,eyes:look.eyeColor,hair:look.hairStyle,skin:look.skinColor});
 core.clearWorldVisual();
})().catch(e=>{console.error(e);process.exitCode=1;});
