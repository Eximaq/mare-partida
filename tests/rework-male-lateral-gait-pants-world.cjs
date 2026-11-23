'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const rootSource=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),cv=require(p.join(rootSource,'node_modules/@napi-rs/canvas'));
const root=p.resolve(process.argv[2]||rootSource),uri='https://fixture.test/index.html';
const pathFor=u=>p.join(root,new URL(u,uri).pathname);
const run=f=>vm.runInThisContext(fs.readFileSync(f.endsWith('/player-rework-native-hd.js')&&process.env.SIGNED_NATIVE_JS||f.endsWith('/player-rework-modular-outfits-hd.js')&&process.env.SIGNED_OUTFIT_JS||f.endsWith('/paper-doll-96-lobby.js')&&process.env.SIGNED_LOBBY_JS||f,'utf8'),{filename:f});
global.window=global;
for(const [name,file] of Object.entries({MareItemCatalog:'item-catalog',MareForge:'forge-system',MarePrison:'prison-system',
 MareHaki:'haki-system',MareAkuma:'akuma-system',MareHakiProgression:'haki-progression',MareBossDungeons:'boss-dungeon-system'}))
 global[name]=require(p.join(rootSource,file+'.js'));
global.ImageData=cv.ImageData;
global.OffscreenCanvas=function(w,h){return cv.createCanvas(w,h);};
global.fetch=async u=>{
 const file=pathFor(u),name=p.basename(file),addon=process.env.SIGNED_GARMENT_DIR;
 if(addon&&name==='archive-index.json'&&file.includes('/rework-weapon-layers-hd/')){
  const base=JSON.parse(fs.readFileSync(file)),extra=JSON.parse(fs.readFileSync(p.join(addon,'archive-additions.json')));
  return {ok:true,json:async()=>({...base,archives:[...base.archives,...extra.archives],sources:{...base.sources,...extra.sources}})};
 }
 if(addon&&name==='p114-signed-slot-south-north-source-v1.zip')return {ok:true,arrayBuffer:async()=>Uint8Array.from(fs.readFileSync(p.join(addon,name))).buffer};
 if(!fs.existsSync(file)&&fs.existsSync(file+'.gz'))return {ok:true,json:async()=>JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(file+'.gz'))) };
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
for(const s of scripts)if(fs.existsSync(pathFor(s)))run(pathFor(s));
(async()=>{const h=require('node:crypto'),world=MarePaperDoll96Lobby.create({baseURL:uri});await world.ready;
 assert.equal(world.snapshot().state,'ready');
 const actor={classId:'healer',appearance96:MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony',hairColor:'black',eyeColor:'blue'}),equipment:{weapon:{def:31},legs:{def:154,count:1,level:22}}};
 const opts={consumer:'world',direction:'east',action:'walk'},frames=async()=>{
  const snapshot=JSON.stringify(actor);world.requestWorldVisual(actor,opts);const t=Date.now()+18000;
  while(world.worldVisual()?.state==='loading'&&Date.now()<t)await new Promise(r=>setTimeout(r,9));
  assert(world.worldReady(actor),JSON.stringify(world.worldVisual()));
  const row=world.worldVisual().coverage[0];
  assert.equal(row.frames,16);assert.deepEqual(row.omitted,[]);
  assert.equal(row.slotRoutes.legs.item,actor.equipment.legs.def);
  assert.equal(row.slotRoutes.weapon.item,actor.equipment.weapon.def);
  assert.equal(row.slotRoutes.legs.quality,'hd');assert.equal(row.slotRoutes.weapon.quality,'hd');
  const c=cv.createCanvas(400,360),ctx=c.getContext('2d'),pixels=[];
  for(let k=0;k<16;k++){
   ctx.clearRect(0,0,400,360);assert(world.drawWorldVisual(ctx,{...opts,x:200,y:230,progress:(k+.25)/16},actor));
   const rgba=ctx.getImageData(0,0,400,360).data;assert(rgba.some(Boolean));pixels.push(h.createHash('sha256').update(rgba).digest('hex'));
  }
  c.width=1;assert.equal(JSON.stringify(actor),snapshot);
  return{row,pixels};
 };
 const p0=actor.equipment.legs,w0=actor.equipment.weapon,start=await frames();actor.equipment.weapon={def:125};
 const weapon=await frames();assert.deepEqual(weapon.row.slotRoutes.legs,start.row.slotRoutes.legs);assert.notDeepEqual(weapon.pixels,start.pixels);
 actor.equipment.legs={def:182};const pants=await frames();
 assert.deepEqual(pants.row.slotRoutes.weapon,weapon.row.slotRoutes.weapon);assert.notDeepEqual(pants.pixels,weapon.pixels);
 actor.equipment.legs=p0;assert.deepEqual(await frames(),weapon);
 actor.equipment.weapon=w0;assert.deepEqual(await frames(),start);
 world.clearWorldVisual();console.log('PASS real World 80 steps, W31→W125 and P154→P182 with independent provenance and exact reversal');
})().catch(e=>{console.error(e);process.exitCode=1});
