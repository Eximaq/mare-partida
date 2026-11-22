'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const rootSource=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),cv=require(p.join(rootSource,'node_modules/@napi-rs/canvas'));
const root=p.resolve(process.argv[2]||rootSource),uri='https://fixture.test/index.html';
const pathFor=u=>p.join(root,new URL(u,uri).pathname);
const run=f=>vm.runInThisContext(fs.readFileSync(f.endsWith('/player-rework-native-hd.js')&&process.env.SIGNED_NATIVE_JS||f.endsWith('/player-rework-modular-outfits-hd.js')&&process.env.SIGNED_OUTFIT_JS||f.endsWith('/paper-doll-96-lobby.js')&&process.env.SIGNED_LOBBY_JS||f,'utf8'),{filename:f});
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
 const pants={def:22,id:'saved-pants',level:83,plus:13},relic={def:31,id:'saved-relic'},staff={def:125,id:'saved-staff'};
 const actor={classId:'healer',appearance96,equipment:{weapon:relic,legs:pants}},clone={...actor,equipment:{...actor.equipment,weapon:null}},hasher=require('node:crypto');
 let snapshots=0;
 const collect=async(p,action,weaponless=false)=>{
  const o={consumer:'world',direction:'south',action,weaponless};
  const before=JSON.stringify(p);
  core.requestWorldVisual(p,o);
  const end=Date.now()+18000;
  while(core.worldVisual()?.state==='loading'&&Date.now()<end)await new Promise(r=>setTimeout(r,10));
  assert(core.worldReady(p),JSON.stringify(core.worldVisual()));
  const {coverage,publishedKey}=core.worldVisual(),row=coverage[0];
  assert.equal(row.frames,action==='walk'?16:8);assert.deepEqual(row.omitted,[]);assert.equal(row.weaponless,weaponless);
  const c=cv.createCanvas(400,360),ctx=c.getContext('2d'),out=[];
  for(let k=0;k<row.frames;k++){
   ctx.clearRect(0,0,400,360);
   assert(core.drawWorldVisual(ctx,{...o,x:200,y:230,progress:(k+.25)/row.frames},p));
   const rgba=ctx.getImageData(0,0,400,360).data;
   assert(rgba.some(Boolean));out.push(hasher.createHash('sha256').update(rgba).digest('hex'));snapshots++;
  }
  c.width=1;assert.equal(JSON.stringify(p),before);
  return {out,row,publishedKey};
 };
 const first=await collect(actor,'walk');
 assert.equal(first.row.slotRoutes.weapon.item,31);assert.equal(first.row.slotRoutes.legs.item,22);
 actor.equipment.weapon=staff;
 const second=await collect(actor,'walk');
 assert.equal(second.row.slotRoutes.weapon.item,125);
 assert.deepEqual(second.row.slotRoutes.legs,first.row.slotRoutes.legs);
 assert.notEqual(second.row.slotRoutes.weapon.source,first.row.slotRoutes.weapon.source);
 assert.notEqual(second.publishedKey,first.publishedKey);
 assert.notDeepEqual(second.out,first.out);
 const hidden=await collect(actor,'attack-unarmed',true);
 const unarmed=await collect(clone,'attack-unarmed',false);
 assert.equal(hidden.row.slotRoutes?.weapon,undefined);
 assert(hidden.row.source.includes('pants22-attack-unarmed'));
 assert.deepEqual(hidden.out,unarmed.out);
 assert.deepEqual(await collect(actor,'walk'),second);
 actor.equipment.weapon=relic;
 assert.deepEqual(await collect(actor,'walk'),first);
 assert.equal(actor.equipment.legs,pants);
 assert.equal(actor.appearance96,appearance96);
 assert.equal(actor.equipment.weapon,relic);
 core.clearWorldVisual();
 console.log('PASS',snapshots,'normal map frames W31→W125→weaponless→W125→W31, same P22 owner and exact restoration');
})().catch(e=>{console.error(e);process.exitCode=1});
