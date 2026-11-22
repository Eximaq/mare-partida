'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const rootSource=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),cv=require(p.join(rootSource,'node_modules/@napi-rs/canvas'));
const root=p.resolve(process.argv[2]||rootSource),uri='https://fixture.test/index.html';
const pathFor=u=>p.join(root,new URL(u,uri).pathname);
const run=f=>vm.runInThisContext(fs.readFileSync(f.endsWith('/player-rework-native-hd.js')&&process.env.SIGNED_NATIVE_JS||f.endsWith('/player-rework-modular-outfits-hd.js')&&process.env.SIGNED_OUTFIT_JS||f.endsWith('/paper-doll-96-lobby.js')&&process.env.SIGNED_LOBBY_JS||f,'utf8'),{filename:f});
global.window=global;
for(const [k,v] of Object.entries({MareItemCatalog:'item-catalog',MareForge:'forge-system',MarePrison:'prison-system',MareHaki:'haki-system',MareAkuma:'akuma-system',MareHakiProgression:'haki-progression',MareBossDungeons:'boss-dungeon-system'}))
 global[k]=require(p.join(rootSource,v+'.js'));
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
(async()=>{
 const core=MarePaperDoll96Lobby.create({baseURL:uri});await core.ready;
 const a=MareCharacterAppearance.normalize({gender:'feminino',skinColor:'light',hairColor:'black',eyeColor:'blue'});
 const actor=(slots)=>({classId:'rogue',appearance96:a,equipment:{weapon:{def:73},...Object.fromEntries(Object.entries(slots).map(([key,id])=>[key,{def:id}]))}});
 const pathOpts={consumer:'world',direction:'east',action:'attack-daggers'};
 const collect=async(player,options,omitted,keep)=>{
  const entry=core.requestWorldVisual(player,options);await entry.promise;
  const info=core.worldVisual();assert(core.worldReady(player),JSON.stringify(info));
  const row=info.coverage[0];assert(!row.source.startsWith('native96'));
  assert.deepEqual(row.omitted,omitted);
  for(const slot of keep)assert.equal(row.slotRoutes?.[slot]?.quality,'hd');
  const c=cv.createCanvas(400,360),ctx=c.getContext('2d'),seq=[];
  for(let i=0;i<row.frames;i++){
   ctx.clearRect(0,0,400,360);
   // Even a path with worldView false must not try another wardrobe.
   assert(core.draw(ctx,player,{...options,worldView:false,x:200,y:230,time:.3,progress:(i+.25)/row.frames}));
   const b=ctx.getImageData(0,0,400,360).data;assert(b.some(Boolean));seq.push(require('node:crypto').createHash('sha256').update(b).digest('hex'));
  }
  c.width=1;core.clearWorldVisual();global.gc?.();return seq;
 };
 for(const [initial,missing,keep]of [
  [{gloves:159},{legs:168},['weapon','gloves']],
  [{gloves:159,legs:22},{coat:6},['weapon','gloves','legs']]
 ]){
  const reference=actor(initial),mixed=actor({...initial,...missing}),save=JSON.stringify(mixed);
  assert.deepEqual(await collect(mixed,pathOpts,Object.keys(missing),keep),await collect(reference,pathOpts,[],keep));
  assert.equal(JSON.stringify(mixed),save,'Never mutate equipment or appearance');
 }
 const fallback=actor({gloves:159});
 const f={...pathOpts,action:'unsupported-future-skill'},entry=core.requestWorldVisual(fallback,f);await entry.promise;
 assert(!core.worldReady(fallback));
 assert.equal(core.worldVisual().reason,'no-hd-pose');
 const c=cv.createCanvas(400,360);
 assert(!core.draw(c.getContext('2d'),fallback,{...f,x:200,y:230,worldView:false}));
 console.log('PASS actual World HD: retained G159, P22 and W73 in every frame; unsupported action has no replacement pose.');
})().catch(e=>{console.error(e);process.exitCode=1;});
