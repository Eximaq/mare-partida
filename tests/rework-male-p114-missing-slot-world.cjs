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
 const core=MarePaperDoll96Lobby.create({baseURL:uri});await core.ready;assert.equal(core.snapshot().state,'ready');
 const appearance96=MareCharacterAppearance.normalize({gender:'masculino',hairColor:'black',eyeColor:'blue',skinColor:'ebony'}),hash=require('node:crypto');
 const dir=process.env.DIRECTION==='north'?'north':'south',north=dir==='north',clock=north?8:30;
 const item=def=>({def}),actor=(extra)=>({classId:'gunner',appearance96,equipment:{weapon:item(114),legs:item(north?21:22),...(!north?{boots:item(9)}:{}),...extra}});
 const all=actor(north?{coat:item(151),boots:item(9)}:{coat:item(151),gloves:item(26)}),kept=actor({}),before=JSON.stringify(all);
 const absent=north?['boots','coat']:['coat','gloves'];
 const collect=async(p,action,missing)=>{
  const opts={consumer:'world',direction:dir,action};
  core.requestWorldVisual(p,opts);
  const max=Date.now()+17000;
  while(core.worldVisual()?.state==='loading'&&Date.now()<max)await new Promise(r=>setTimeout(r,10));
  assert(core.worldReady(p),JSON.stringify(core.worldVisual()));
  const row=core.worldVisual().coverage[0];
  assert.equal(row.frames,8);assert.deepEqual(row.omitted.slice().sort(),missing);
  for(const [s,id] of [['weapon',114],['legs',north?21:22],...(!north?[['boots',9]]:[])]){
   assert.equal(row.slotRoutes[s].quality,'hd');assert.equal(row.slotRoutes[s].item,id);
  }
  for(const s of missing)assert.equal(row.slotRoutes[s].quality,'missing');
  const canvas=cv.createCanvas(400,360),ctx=canvas.getContext('2d'),frames=[];
  for(let t=0;t<clock;t++){
   ctx.clearRect(0,0,400,360);assert(core.drawWorldVisual(ctx,{...opts,x:200,y:230,progress:(t+.25)/clock},p));
   const bytes=ctx.getImageData(0,0,400,360).data;assert(bytes.some(Boolean));frames.push(hash.createHash('sha256').update(bytes).digest('hex'));
  }
  canvas.width=1;core.clearWorldVisual();global.gc?.();return frames;
 };
 const ref=await collect(kept,'attack-firearm',[]);
 for(const action of ['attack-firearm','attack','skill'])
  assert.deepEqual(await collect(all,action,absent),ref);
 assert.equal(JSON.stringify(all),before);
 console.log('PASS World',dir,clock*4,'rendered ticks: W114 and signed passes byte-identical, missing slots reported outside save');
})().catch(e=>{console.error(e);process.exitCode=1});
