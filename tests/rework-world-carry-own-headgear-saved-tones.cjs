'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),cv=require(p.join(source,'node_modules/@napi-rs/canvas'));
const root=p.resolve(process.argv[2]||p.join(__dirname,'../dist')),uri='https://fixture.test/index.html';
const pathFor=u=>p.join(root,new URL(u,uri).pathname);
const run=f=>vm.runInThisContext(fs.readFileSync((f.endsWith('/player-rework-native-hd.js')&&process.env.SIGNED_NATIVE_JS)||
 (f.endsWith('/player-rework-weapon-carry-hd.js')&&process.env.SIGNED_CARRY_JS)||f,'utf8'),{filename:f});
global.window=global;
for(const [name,file] of Object.entries({MareItemCatalog:'item-catalog',MareForge:'forge-system',MarePrison:'prison-system',
 MareHaki:'haki-system',MareAkuma:'akuma-system',MareHakiProgression:'haki-progression',MareBossDungeons:'boss-dungeon-system'}))
 global[name]=require(p.join(source,file+'.js'));
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
 const lobby=MarePaperDoll96Lobby.create({baseURL:uri});await lobby.ready;
 assert.equal(lobby.snapshot().state,'ready');
 const p0={classId:'brawler',appearance96:MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony'}),equipment:{weapon:{def:2}}};
 const frames=async(p,opts)=>{
  lobby.requestWorldVisual(p,opts);
  const end=Date.now()+20000;
  while(lobby.worldVisual().state==='loading'&&Date.now()<end)await new Promise(r=>setTimeout(r,10));
  assert(lobby.worldReady(p),JSON.stringify(lobby.worldVisual()));
  const trace=lobby.worldVisual().coverage[0];
  assert(!trace.source.startsWith('native96/'));assert.deepEqual(trace.omitted,[]);
  const checked=[];
  for(let i=0;i<trace.frames;i++){
   const c=cv.createCanvas(512,512),ctx=c.getContext('2d');
   assert(lobby.drawWorldVisual(ctx,{...opts,x:256,y:410,progress:(i+.25)/trace.frames},p));
   const px=ctx.getImageData(0,0,512,512).data;assert(px.some(v=>v));
   checked.push(require('node:crypto').createHash('sha256').update(px).digest('hex'));c.width=1;
  }
  lobby.clearWorldVisual();global.gc?.();
  return {trace,checked};
 };
 let rendered=0;
 for(const options of [{action:'idle',direction:'south',consumer:'world'},{action:'walk',direction:'west',consumer:'world'}]){
  const original=await frames(p0,options);rendered+=original.checked.length;
  for(const head of [164,178]){
   const p={...p0,equipment:{...p0.equipment,head:{def:head}}},before=JSON.stringify(p);
   const on=await frames(p,options);rendered+=on.checked.length;
   assert.equal(on.trace.slotRoutes.weapon.item,2);assert.equal(on.trace.slotRoutes.head.item,head);
   assert.notDeepEqual(on.checked,original.checked);
   const invisible=await frames({...p,preferences:{hideHeadgear:true}},options);rendered+=invisible.checked.length;
   assert.equal(invisible.trace.source,original.trace.source);
   assert.deepEqual(invisible.checked,original.checked);
   assert.equal(JSON.stringify(p),before);
  }
 }
 assert.equal(rendered,85);
 console.log('PASS real World with restored ebony appearance, 85 H164/H178 frames and exact hidden-state restoration');
})().catch(e=>{console.error(e);process.exitCode=1;});
