'use strict';
const path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {test}=require('node:test');
const {cv}=require('./rework-integration-support.cjs');
const root=path.resolve(__dirname,'..');
const local=url=>path.join(root,new URL(String(url),'http://localhost/').pathname);
const appearance={version:1,gender:'feminino',skinStyle:'natural',skinColor:'olive',hairStyle:'hair-cropped',hairColor:'blonde',eyeStyle:'original',eyeColor:'amber'};

test('normal WorldVisual keeps four native walk directions with pants21 and three valid carry classes',{timeout:180000},async()=>{
 global.window=global;global.location={href:'http://localhost/'};global.ImageData=cv.ImageData;
 global.fetch=async url=>{const file=local(url),bytes=fs.existsSync(file)?fs.readFileSync(file):zlib.gunzipSync(fs.readFileSync(file+'.gz'));return{ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
 global.document={createElement:tag=>tag==='canvas'?cv.createCanvas(1,1):{},head:{append(node){try{vm.runInThisContext(fs.readFileSync(local(node.src),'utf8'),{filename:local(node.src)});node.onload();}catch(error){node.onerror(error);}}}};
 global.Image=class extends cv.Image{set src(v){if(String(v).startsWith('blob:'))this.pending=require('node:buffer').resolveObjectURL(v).arrayBuffer().then(b=>{super.src=Buffer.from(b);});else super.src=fs.readFileSync(local(v));}async decode(){await this.pending;return super.decode();}};
 const lobby=require('../paper-doll-96-lobby.js').create({baseURL:'http://localhost/'});
 await lobby.ready;
 const actor={factionId:'pirate',appearance96:{...appearance}},saved=JSON.stringify(appearance);
 const directions=['north','south','east','west'];
 const ticks=[0,4,5,9,10,14,15,18,24,25,34,35,38];
 let count=0;
 try{
  for(const [weapon,cls,attack] of [[0,'sword','attack-sword'],[5,'gunner','attack-firearm'],[17,'strategist','attack-focus']]){
   actor.classId=cls;actor.equipment={legs:{def:21},weapon:{def:weapon}};
   assert.equal(lobby.resolve(actor)?.body,'feminino');
   const previous=lobby.worldVisual()?.publishedKey;
   lobby.requestWorldVisual(actor,{actions:['attack',attack,'skill'],scope:'four-walk-directions'});
   if(previous)assert.equal(lobby.worldVisual().publishedKey,previous,'keep a prepared character while changing slots');
   for(let i=0;i<8500&&lobby.worldVisual()?.state==='loading';i++)await new Promise(resolve=>setTimeout(resolve,10));
   const prepared=lobby.worldVisual();
   assert.equal(prepared.state,'ready',JSON.stringify(prepared));assert.equal(prepared.publishedKey,prepared.key);
   for(const direction of directions){
    const route=prepared.coverage.find(x=>x.action==='walk'&&x.direction===direction);
    assert(route?.source&&!route.source.startsWith('native96/'), weapon+'/'+direction+': '+JSON.stringify(route));
    assert.equal(route.frames,40);
    const images=new Set();
    for(const tick of ticks){
     const canvas=cv.createCanvas(320,320),ctx=canvas.getContext('2d');
     assert(lobby.drawWorldVisual(ctx,{action:'walk',direction,time:(tick+.1)/40,x:160,y:256}));
     const pixels=ctx.getImageData(0,0,320,320).data;
     assert(pixels.some((value,i)=>i%4===3&&value>0), weapon+'/'+direction+'/'+tick);
     images.add(crypto.createHash('sha256').update(pixels).digest('hex'));canvas.width=1;count++;
    }
    assert(images.size>1,'walk does not freeze');
   }
   assert.equal(JSON.stringify(actor.appearance96),saved);
  }
  assert.equal(count,156);
 }finally{lobby.clearWorldVisual();}
});
