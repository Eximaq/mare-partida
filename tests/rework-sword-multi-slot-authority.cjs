'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.KAIZOKU_AUDIT_STAGE||path.resolve(__dirname,'..'),release=path.resolve(process.argv[2]||path.join(base,'dist'));
const Module=require('node:module');
if(process.env.COMPOSE_TRIAL){
 for(const filename of ['player-rework-native-hd.js','player-rework-sword0-checkpoint.js']){
  const f=base+'/'+filename,m=new Module(f);m.filename=f;m.paths=Module._nodeModulePaths(base);
  m._compile(fs.readFileSync(process.env.COMPOSE_TRIAL+'/'+filename,'utf8'),f);m.loaded=true;require.cache[f]=m;
 }
}
require(base+'/player-rework-sword0-checkpoint.js');
const {make,cv}=require(base+'/tests/rework-integration-support.cjs'),A=require(base+'/character-appearance');
const loader=require(base+'/tools/rework-hd-test-loader.cjs').create(base),prefix='tools/rework-sword0-checkpoint/';
const catalog=require(path.join(release,prefix,'sword-catalog.json'));
const api=make({fetchJSON:async f=>f===prefix+'sword-catalog.json'?catalog:JSON.parse(fs.readFileSync(path.join(base,f))),
 loadImage:f=>f.startsWith(prefix)?cv.loadImage(path.join(release,f)):loader(f)});
const R=f=>require(path.join(base,f)),skin=global.MareFemaleNamedHairHD.create(R('tools/rework-accessories/head-layer-index.json'),R('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(R('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const reg=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:R('tools/rework-weapon-layers-hd/index.json').femaleRegistrations},{makeCanvas:cv.createCanvas,appearanceRegistry:skin});
async function get(rec,frame){const imgs=new Map(),c=cv.createCanvas(1,1);for(const f of reg.requiredFiles(rec,{frame}))imgs.set(f,await (f.startsWith(prefix)?cv.loadImage(path.join(release,f)):loader(f)));reg.render(c.getContext('2d'),rec,imgs,{frame});return c;}
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);

(async()=>{
 await api.ready;a(await api.warmSwordCheckpoint(),'checkpoint ready');
 const def=Number(process.env.SWORD||1),g=Number(process.env.GLOVE||26),o={consumer:'world',action:'attack-sword',direction:'north'};
 const face=A.normalize({...catalog.appearance96,skinColor:process.env.SKIN||'ebony'});
 const actor=(boot,glove)=>({appearance96:face,classId:'sword',equipment:{
  weapon:{def},...(boot!==null?{boots:{def:boot}}:{}),...(glove?{gloves:{def:g}}:{})}});
 const bare=api.selectVisual(actor(null,false),o), glove=api.selectVisual(actor(null,true),o);
 a(glove?.slotRoutes?.gloves?.item===g,'fixture needs independently selected gloves: '+glove?.id);
 const armed=new Map();for(const b of [8,134]){
  const boot=api.selectVisual(actor(b,false),o),combined=api.selectVisual(actor(b,true),o);
  a(boot?.slotRoutes?.boots?.item===b,'fixture needs independent boots');
  a(combined?.slotRoutes?.boots?.item===b,'failed to compose selected boot '+b+' with independent glove '+g+': '+combined?.id);
  a.equal(combined.slotRoutes.gloves.item,g);a.equal(combined.slotRoutes.weapon.item,def);a.deepEqual(combined.omitted,[]);
  const ourBoot=boot.pack.directions.north.layers.filter(l=>l.id.startsWith('boot'+b+'-'));
  a.deepEqual(combined.pack.directions.north.layers,[...glove.pack.directions.north.layers,...ourBoot]);
  a.deepEqual(combined.material,glove.material);a.deepEqual(combined.states,glove.states);
  a.deepEqual(combined.pack.pivot,glove.pack.pivot);a.deepEqual(combined.pack.directions.north.clip,glove.pack.directions.north.clip);
  armed.set(b,{boot,combined});
 }
 for(let i=0;i<8;i++){
  const frames=[];
  for(const r of [bare,glove,...[...armed.values()].flatMap(v=>[v.boot,v.combined])]){
   const c=await get(r,i);frames.push(pixels(c));c.width=c.height=1;global.gc?.();
  }
  const [x,y,b8,b8g,b134,b134g]=frames;let delta=0,bootsDelta=0;
  for(let j=0;j<x.length;j+=4){
   const u=x.readUInt32LE(j),v=y.readUInt32LE(j);
   for(const [z,c] of [[b8,b8g],[b134,b134g]]){
    const boot=z.readUInt32LE(j),both=c.readUInt32LE(j);
    a(!(u!==v&&u!==boot),'overlap at frame '+i+' px '+j/4);
    a(both===(u!==v?v:boot),'mixed composition conflict at frame '+i+' px '+j/4);
   }
   if(u!==v)delta++;
   if(b8.readUInt32LE(j)!==b134.readUInt32LE(j))bootsDelta++;
  }
  a(delta>0);a(bootsDelta>0);
 }
 a.deepEqual(api.selectVisual(actor(null,true),o),glove);
 console.log('PASS two independent boot swaps preserve own gloves, sword, pose and appearance, 8 phases',def,g,face.skinColor);
})().catch(e=>{console.error(e);process.exitCode=1;});
