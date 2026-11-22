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
 const file=String(u).endsWith("/south-glove-visible-support.json")&&process.env.TRIAL_CERT||pathFor(u);
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
 const look=MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony'});
 const actor=(w,g)=>({classId:w===16?'strategist':'gunner',appearance96:look,equipment:{weapon:{def:w},...(g?{gloves:{def:g}}:{})}});
 const action={action:'walk',direction:'south',consumer:'world'},sample=[0,4,7,12,15];
 const take=async p=>{
  lobby.requestWorldVisual(p,action);
  const end=Date.now()+20000;
  while(lobby.worldVisual().state==='loading'&&Date.now()<end)await new Promise(r=>setTimeout(r,10));
  assert(lobby.worldReady(p),JSON.stringify(lobby.worldVisual()));
  const trace=lobby.worldVisual().coverage[0];assert(!trace.source.startsWith('native96/'));assert.deepEqual(trace.omitted,[]);
  const hashes=[];
  for(const f of sample){
   const c=cv.createCanvas(640,640),ctx=c.getContext('2d');
   assert(lobby.drawWorldVisual(ctx,{...action,x:320,y:512,progress:(f+.25)/16},p));
   const rgba=ctx.getImageData(0,0,640,640).data;assert(rgba.some(v=>v));
   hashes.push(require('node:crypto').createHash('sha256').update(rgba).digest('hex'));c.width=1;
  }
  lobby.clearWorldVisual();global.gc?.();return {trace,hashes};
 };
 const p=actor(16,152),snapshot=JSON.stringify(p),bare=await take(actor(16)),on=await take(p),swap=await take(actor(4,152));
 assert.equal(on.trace.slotRoutes.weapon.item,16);assert.equal(swap.trace.slotRoutes.weapon.item,4);
 assert.equal(on.trace.slotRoutes.gloves.item,152);assert.deepEqual(on.trace.slotRoutes.gloves,swap.trace.slotRoutes.gloves);
 assert.equal(on.trace.frames,16);assert.equal(swap.trace.frames,16);
 assert.notDeepEqual(on.hashes,bare.hashes);assert.notDeepEqual(on.hashes,swap.hashes);assert.deepEqual(await take(actor(16)),bare);
 assert.equal(JSON.stringify(p),snapshot);console.log('PASS World South G152 across W16→W4 and exact removal, 20 rendered frames');
})().catch(e=>{console.error(e);process.exitCode=1});
