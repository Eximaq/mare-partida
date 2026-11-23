'use strict';
const {equippedWorldPose}=require('./rework-world-pose-support.cjs');
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');const{make,cv}=require('./rework-integration-support.cjs');const R=process.env.HD_PUBLISHED_ROOT||path.resolve(__dirname,'..'),local=u=>path.join(R,new URL(String(u),'http://localhost/').pathname);
async function checkSwaps(look,fixture,sequence){global.window=global;global.ImageData=cv.ImageData;global.fetch=async u=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(local(u)))});global.document={createElement:t=>t==='canvas'?cv.createCanvas(1,1):{},head:{append(n){try{vm.runInThisContext(fs.readFileSync(local(n.src),'utf8'),{filename:local(n.src)});n.onload();}catch(e){n.onerror(e);}}}};global.Image=class extends cv.Image{set src(v){super.src=fs.readFileSync(local(v));}decode(){return super.decode();}};const native=make();global.MareReworkNativeHD={create:()=>native};const lobby=require(path.join(R,'paper-doll-96-lobby.js')).create({baseURL:'http://localhost/'});await lobby.ready;const custom=look==='custom',gold=require(fixture),p={classId:'sword',factionId:'pirate',appearance96:custom?gold.look:{gender:'feminino',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'},equipment:{coat:{def:151}}},saved=JSON.stringify(p.appearance96);
 const upperByFrame=new Map(),coatByDirection=new Map(),cycles=[];
 let count=0;
 for(const [step,pants] of sequence.entries()){
  if(pants)p.equipment.legs={def:pants};else delete p.equipment.legs;
  const hashes=[];
  for(const direction of ['east','west']){
   const entry=await equippedWorldPose(lobby,p,'walk',direction);
   assert.equal(entry.slotRoutes.coat.item,151);
   if(step)assert.equal(entry.slotRoutes.coat.source,coatByDirection.get(direction));
   else coatByDirection.set(direction,entry.slotRoutes.coat.source);
   if(pants)assert.equal(entry.slotRoutes.legs.item,pants);else assert(!entry.slotRoutes.legs);
   for(const tick of [0,4,7]){
    const c=cv.createCanvas(320,320),ctx=c.getContext('2d');
    assert(lobby.drawWorldVisual(ctx,{action:'walk',direction,progress:(tick+.1)/8,x:160,y:260},p));
    assert.equal(native.snapshot().last.source,entry.source);
    const img=ctx.getImageData(0,0,320,320).data;
    let top=0;while(top<img.length&&img[top+3]===0)top+=4;
    assert(top<img.length,'actor visible');
    const y=Math.floor(top/(320*4)),upper=ctx.getImageData(0,y,320,24).data;
    assert(upper.some((v,i)=>i%4===3&&v===255),'opaque saved head');
    const key=direction+'/'+tick,headHash=crypto.createHash('sha256').update(upper).digest('hex');
    if(step)assert.equal(headHash,upperByFrame.get(key),'changing trousers touched the visible head');
    else upperByFrame.set(key,headHash);
    hashes.push(crypto.createHash('sha256').update(img).digest('hex'));
    count++;c.width=1;
   }
  }
  for(const offset of [0,3])assert.equal(new Set(hashes.slice(offset,offset+3)).size,3,'three distinct frames per walking direction');
  cycles.push(hashes);assert.equal(JSON.stringify(p.appearance96),saved);
 }
 for(let i=0;i<6;i++){
  assert.notEqual(cycles[0][i],cycles[1][i],'two trousers must produce distinct images');
  assert.notEqual(cycles[1][i],cycles[2][i],'removing trousers must change their drawing');
 }
 assert.deepEqual(cycles[3],cycles[0],'A to B to A must restore the same on-map rendering');
 assert.equal(count,24);lobby.clearWorldVisual();console.log('SLOT151_WORLD_COMPLETE',look,count);
}
module.exports={checkSwaps};
