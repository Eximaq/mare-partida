'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const rootSource=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),cv=require(p.join(rootSource,'node_modules/@napi-rs/canvas'));
const root=p.resolve(process.argv[2]||rootSource),uri='https://fixture.test/index.html';
const pathFor=u=>p.join(root,new URL(u,uri).pathname);
const run=f=>vm.runInThisContext(fs.readFileSync(f.endsWith('/player-rework-native-hd.js')&&process.env.SIGNED_NATIVE_JS||f,'utf8'),{filename:f});
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


(async()=>{const core=MarePaperDoll96Lobby.create({baseURL:uri});await core.ready;
 assert.equal(core.snapshot().state,'ready',JSON.stringify(core.snapshot()));
 const appearance96=MareCharacterAppearance.normalize({gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:'ebony'});
 const captures=new Map();
 for(const [direction,boots,legs] of [['south',9,21],['south',9,22],['south',9,null],['north',null,21]]){
  const actor={classId:'gunner',appearance96,equipment:{weapon:{def:114},boots:boots?{def:boots}:null,legs:legs?{def:legs}:null}},
   saved=JSON.stringify(actor),ticks=direction==='south'?30:8;
  for(const action of ['attack-firearm','attack']){
   core.requestWorldVisual(actor,{action,direction,consumer:'world'});
   const end=Date.now()+15000;while(core.worldVisual().state==='loading'&&Date.now()<end)await new Promise(r=>setTimeout(r,10));
   assert(core.worldReady(actor),JSON.stringify(core.worldVisual()));
   const row=core.worldVisual().coverage[0];assert.equal(row.action,action);assert.equal(row.direction,direction);assert.equal(row.frames,8);
   assert.equal(row.slotRoutes?.weapon?.item,114);assert.equal(row.slotRoutes?.boots?.item??null,boots);assert.equal(row.slotRoutes?.legs?.item??null,legs);assert.deepEqual(row.omitted,[]);
   const canvas=cv.createCanvas(400,360),ctx=canvas.getContext('2d'),frames=[];
   for(let t=0;t<ticks;t++){ctx.clearRect(0,0,400,360);assert(core.drawWorldVisual(ctx,{action,direction,x:200,y:230,progress:(t+.25)/ticks},actor));const rgba=Buffer.from(ctx.getImageData(0,0,400,360).data);assert(rgba.some(v=>v));frames.push(require('node:crypto').createHash('sha256').update(rgba).digest('hex'));}
   const key=[direction,boots,legs].join('/');if(action==='attack-firearm')captures.set(key,{source:row.source,frames});else assert.deepEqual({source:row.source,frames},captures.get(key));
   assert.equal(JSON.stringify(actor),saved);canvas.width=1;
  }
 }
 const [a,b,c]=[...captures.values()];assert.notEqual(a.source,b.source);assert.notEqual(a.source,c.source);assert.notDeepEqual(a.frames,b.frames);assert.notDeepEqual(a.frames,c.frames);
 core.clearWorldVisual();console.log('PASS actual map generic Flintlock P114 98 ticks, exact explicit parity and cache isolation across three distinct South loadouts');
})().catch(e=>{console.error(e);process.exitCode=1});
