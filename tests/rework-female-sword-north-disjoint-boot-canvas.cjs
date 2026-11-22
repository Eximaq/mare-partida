'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.KAIZOKU_AUDIT_STAGE||path.resolve(__dirname,'..'),release=path.resolve(process.argv[2]||path.join(base,'dist'));
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
 let total=0;
 for(const pants of [Number(process.env.BOOT||8)])for(const def of [Number(process.env.SWORD||0)])for(const skinColor of [process.env.SKIN||'ebony']){
  const appearance96=A.normalize({...(!process.env.CROPPED?{gender:'feminino'}:catalog.appearance96),skinColor,eyeColor:'blue',hairColor:'black'});
  const off={appearance96,classId:'sword',equipment:{weapon:{def}}},on={...off,equipment:{...off.equipment,boots:{def:pants}}};
  const o={consumer:'world',action:'attack-sword',direction:'north'};
  const a0=api.selectVisual(off,o),a1=api.selectVisual(on,o);a(a1?.id.includes(':checkpoint-b'+pants+'-north-no-coat'),[pants,def,skinColor,a1?.id].join(' '));
  const s=a1.pack.directions.north,d=a0.pack.directions.north,own=s.layers.filter(l=>l.id.startsWith('boot'+pants+'-'));
  a.equal(own.length,4);a.deepEqual(s.layers.filter(l=>!own.includes(l)),d.layers);
  a.deepEqual(s.poses,d.poses);a.deepEqual(a0.states,a1.states);a.deepEqual(a0.material,a1.material);a.deepEqual(a0.pack.pivot,a1.pack.pivot);
  const proofs=[];
  for(let i=0;i<8;i++){
   const c0=await get(a0,i),c1=await get(a1,i),raw0=pixels(c0),raw1=pixels(c1),m=cv.createCanvas(c0.width,c0.height),mc=m.getContext('2d'),pad=a1.paddingPhysical||0;
   const rawMasks=[];
   for(const l of own){const name=l.frames[i]+'.png',im=await cv.loadImage(path.join(release,prefix,'assets',name));mc.clearRect(0,0,m.width,m.height);mc.drawImage(im,pad,pad);rawMasks.push(pixels(m));}
   let delta=0,outside=0,hardware=0,holes=0,ground0=0,ground1=0;
   for(let j=0;j<raw0.length;j+=4){
    const y=Math.floor(j/4/m.width),out=raw0.readUInt32LE(j)!==raw1.readUInt32LE(j);
    if(out){delta++;if(rawMasks.every(m=>!m[j+3]))outside++;}
    if(raw0[j+3]&&!raw1[j+3])holes++;
    if(raw0[j+3])ground0=Math.max(y,ground0);
    if(raw1[j+3])ground1=Math.max(y,ground1);
    const front=rawMasks.find((q,n)=>own[n].id.endsWith('front')&&q[j+3]===255);
    if(front&&y>pad+455){if(front.readUInt32LE(j)===raw1.readUInt32LE(j))hardware++;}
   }
   a(delta>1000);a.equal(outside,0);a.equal(holes,0);a(hardware>0);a.equal(ground1,ground0);
   const restored=await get(api.selectVisual(off,o),i);a(pixels(restored).equals(raw0));restored.width=c0.width=c1.width=1; total++;
   proofs.push([delta,hardware,ground0,ground1]);m.width=m.height=1;global.gc?.();
  }
  console.log(pants,def,skinColor,JSON.stringify(proofs));global.gc?.();
 }
 console.log('PASS',total);
})().catch(e=>{console.error(e);process.exit(1)});
