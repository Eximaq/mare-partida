'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),cv=require(p.join(source,'node_modules/@napi-rs/canvas'));
const root=p.resolve(process.argv[2]||p.join(__dirname,'../dist')),uri='https://fixture.test/index.html';
const pathFor=u=>p.join(root,new URL(u,uri).pathname);
const run=f=>vm.runInThisContext(fs.readFileSync(f.endsWith('/paper-doll-96-lobby.js')&&process.env.LOBBY_TRIAL||f,'utf8'),{filename:f});
global.window=global;
for(const [k,v] of Object.entries({MareItemCatalog:'item-catalog',MareForge:'forge-system',MarePrison:'prison-system',MareHaki:'haki-system',MareAkuma:'akuma-system',MareHakiProgression:'haki-progression',MareBossDungeons:'boss-dungeon-system'}))
 global[k]=require(p.join(source,v+'.js'));
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
 const lobby=MarePaperDoll96Lobby.create({baseURL:uri}),peers=MarePaperDoll96Lobby.create({baseURL:uri,sharedLobby:true});
 await Promise.all([lobby.ready,peers.ready]);assert.equal(lobby.snapshot().state,'ready');
 const player={classId:'healer',appearance96:MareCharacterAppearance.normalize({gender:'masculino',skinColor:'ebony'}),equipment:{}},
  unknown={...player,equipment:{weapon:{def:999999}}},saved=JSON.stringify(player),c=cv.createCanvas(400,350),ctx=c.getContext('2d');
 const frame=(cb)=>{ctx.clearRect(0,0,c.width,c.height);const ok=cb();return {ok,pixels:ctx.getImageData(0,0,c.width,c.height).data.some(v=>v)};};
 const wait=async f=>{const end=Date.now()+10000;for(;;){const r=frame(f);if(r.ok&&r.pixels)return r;if(Date.now()>end)throw Error('approved HD preview unavailable');await new Promise(r=>setTimeout(r,20));}};
 const o={consumer:'world',action:'idle',direction:'south'};
 assert(await lobby.prepareVisual(player,o));
 await wait(()=>!!lobby.drawFittedAvatar(ctx,player,{consumer:'inventory'}));
 await wait(()=>lobby.preview(ctx,player,{...o,consumer:'profile-portrait',appearance:player.appearance96}));
 await wait(()=>lobby.preview(ctx,player,{...o,consumer:'character-creation',appearance:player.appearance96}));
 await wait(()=>peers.draw(ctx,player,{action:'idle',direction:'south',consumer:'shared-lobby',scene:'lobby',x:200,y:220}));
 assert.deepEqual(frame(()=>peers.draw(ctx,unknown,{action:'idle',direction:'south',consumer:'shared-lobby',scene:'lobby',x:200,y:220})),{ok:false,pixels:false});
 assert.deepEqual(frame(()=>lobby.preview(ctx,unknown,{consumer:'profile-portrait',appearance:unknown.appearance96})),{ok:false,pixels:false});
 if(typeof MarePaperDoll96Lobby.selectWorldHDOnly==='function'){
  const b9={...player,equipment:{boots:{def:9}}},
   mixed={...player,equipment:{...b9.equipment,legs:{def:22}}},mixedSave=JSON.stringify(mixed),capture=()=>Buffer.from(ctx.getImageData(0,0,c.width,c.height).data);
  await wait(()=>!!lobby.drawFittedAvatar(ctx,b9,{consumer:'inventory'}));const ownPixels=capture();
  await wait(()=>!!lobby.drawFittedAvatar(ctx,mixed,{consumer:'inventory'}));const info=lobby.snapshot().inventoryPreview;
  assert(info.typedHD);assert.deepEqual(info.omitted,['legs']);assert.equal(info.slotRoutes.boots.item,9);assert.equal(info.slotRoutes.boots.quality,'hd');
  assert(ownPixels.equals(capture()),'the approved native boot/body must survive the pending pants');assert.equal(JSON.stringify(mixed),mixedSave);
  // A changed, invalid identity must not re-use the preceding fitted preview.
  assert.deepEqual(frame(()=>!!lobby.drawFittedAvatar(ctx,unknown,{consumer:'inventory'})),{ok:false,pixels:false});
 }
 assert.equal(JSON.stringify(player),saved);
 console.log('PASS assembled release Canvas: approved inventory, editor portrait, creation, shared peer visible; unrecognized weapon never rendered through old art');
})().catch(e=>{console.error(e);process.exitCode=1;});
