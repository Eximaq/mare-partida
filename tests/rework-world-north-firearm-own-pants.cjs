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
 const a=MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony'});
 const options={action:'attack',direction:'north',consumer:'world'},sample=[0,15,23,31,47];
 const p=(def,legs)=>({classId:'gunner',appearance96:a,equipment:{weapon:{def},...(legs?{legs:{def:legs}}:{})}});
 const px=async (player,ticks=48)=>{
  lobby.requestWorldVisual(player,options);
  const end=Date.now()+20000;
  while(lobby.worldVisual().state==='loading'&&Date.now()<end)await new Promise(r=>setTimeout(r,10));
  assert(lobby.worldReady(player),JSON.stringify(lobby.worldVisual()));
  const trace=lobby.worldVisual().coverage[0];assert(!trace.source.startsWith('native96/'));assert.deepEqual(trace.omitted,[]);
  const hashes=[];
  for(const n of sample){
   const c=cv.createCanvas(640,640),ctx=c.getContext('2d');
   assert(lobby.drawWorldVisual(ctx,{...options,x:320,y:512,progress:(n+.25)/ticks},player));
   const rgba=ctx.getImageData(0,0,640,640).data;assert(rgba.some(v=>v));
   hashes.push(require('node:crypto').createHash('sha256').update(rgba).digest('hex'));c.width=1;
  }
  lobby.clearWorldVisual();global.gc?.();return {trace,hashes};
 };
 const off=await px(p(4)),withP21=p(4,21),saved=JSON.stringify(withP21),on=await px(withP21),swap=await px(p(115,21));
 assert.equal(on.trace.slotRoutes.weapon.item,4);assert.equal(swap.trace.slotRoutes.weapon.item,115);
 assert.equal(on.trace.slotRoutes.legs.item,21);assert.deepEqual(on.trace.slotRoutes.legs,swap.trace.slotRoutes.legs);
 assert.equal(on.trace.frames,3);assert.equal(swap.trace.frames,3);
 const pistol=await px(p(114,21),48),pistolBare=await px(p(114),48);
 assert.equal(pistol.trace.frames,8);assert.equal(pistol.trace.slotRoutes.weapon.item,114);
 assert.deepEqual(pistol.trace.slotRoutes.legs,on.trace.slotRoutes.legs);
 assert.notDeepEqual(pistol.hashes,pistolBare.hashes);
 assert.notDeepEqual(on.hashes,off.hashes);assert.notDeepEqual(on.hashes,swap.hashes);
 assert.deepEqual(await px(p(4)),off);assert.equal(JSON.stringify(withP21),saved);
 console.log('PASS World North P21 across W4→W115→W114 and exact removal, 30 rendered ticks');
})().catch(e=>{console.error(e);process.exitCode=1});
