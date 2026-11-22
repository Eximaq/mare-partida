'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const rootSource=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),cv=require(p.join(rootSource,'node_modules/@napi-rs/canvas'));
const root=p.resolve(process.argv[2]||rootSource),uri='https://fixture.test/index.html';
const pathFor=u=>p.join(root,new URL(u,uri).pathname);
const run=f=>vm.runInThisContext(fs.readFileSync(f.endsWith('/player-rework-native-hd.js')&&process.env.SIGNED_NATIVE_JS||f.endsWith('/player-rework-modular-outfits-hd.js')&&process.env.SIGNED_OUTFIT_JS||f,'utf8'),{filename:f});
global.window=global;
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
 const appearance96=MareCharacterAppearance.normalize({gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:'ebony'});
 const crypto=require('node:crypto');
 const p={classId:'gunner',appearance96,equipment:{weapon:{def:114},coat:{def:151},gloves:{def:26}}},
  unarmed={...p,equipment:{coat:{def:151},gloves:{def:26}}},snap=JSON.stringify(p);
 const render=async(actor,options)=>{
  const opts={consumer:'world',direction:'south',...options};
  core.requestWorldVisual(actor,opts);
  const deadline=Date.now()+15000;
  while(core.worldVisual()?.state==='loading'&&Date.now()<deadline)await new Promise(r=>setTimeout(r,10));
  assert(core.worldReady(actor),JSON.stringify(core.worldVisual()));
  const row=core.worldVisual().coverage[0],hashes=[];
  const c=cv.createCanvas(400,360),ctx=c.getContext('2d');
  for(let k=0;k<8;k++){
   ctx.clearRect(0,0,400,360);assert(core.drawWorldVisual(ctx,{...opts,x:200,y:230,progress:(k+.25)/8},actor));
   const rgba=ctx.getImageData(0,0,400,360).data;
   assert(rgba.some(Boolean));hashes.push(crypto.createHash('sha256').update(rgba).digest('hex'));
  }
  c.width=1;return {row,hashes,key:core.worldVisual().publishedKey};
 };
 const firearm={action:'attack-firearm',weaponless:false}, punch={action:'attack-unarmed',weaponless:true};
 const before=await render(p,firearm);
 // World uses typed coverage, not the old preview pose's weaponIds trace.
 assert.equal(before.row.weaponless,false);
 assert.equal(before.row.slotRoutes?.weapon?.item,114);
 assert.equal(before.row.slotRoutes?.weapon?.quality,'hd');
 const hide=await render(p,punch);
 assert.equal(hide.row.weaponless,true);
 assert.equal(hide.row.slotRoutes?.weapon,undefined);
 assert.equal(hide.row.slotRoutes?.coat?.item,151);assert.equal(hide.row.slotRoutes?.gloves?.item,26);
 assert.equal(hide.row.slotRoutes?.coat?.quality,'hd');assert.equal(hide.row.slotRoutes?.gloves?.quality,'hd');
 assert.ok(hide.hashes.every((hash,i)=>hash!==before.hashes[i]));
 assert.notEqual(hide.key,before.key);
 const plain=await render(unarmed,{...punch,weaponless:false});
 assert.deepEqual(hide.hashes,plain.hashes);
 assert.deepEqual(await render(p,firearm),before);
 assert.equal(JSON.stringify(p),snap);
 core.clearWorldVisual();
 console.log('PASS World: weaponless HD punch equals unarmed C151/G26 for all eight phases; armed 114 route and exact prior pixels restore, save unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
