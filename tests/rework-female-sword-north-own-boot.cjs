'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..'),release=path.resolve(process.argv[2]||path.join(base,'dist'));
require('../player-rework-sword0-checkpoint.js');
const {make,cv}=require(base+'/tests/rework-integration-support.cjs'),A=require(base+'/character-appearance');
const loader=require(base+'/tools/rework-hd-test-loader.cjs').create(base),prefix='tools/rework-sword0-checkpoint/';
const catalog=require(path.join(release,prefix,'sword-catalog.json'));
const api=make({fetchJSON:async f=>f===prefix+'sword-catalog.json'?catalog:JSON.parse(fs.readFileSync(path.join(base,f))),
 loadImage:f=>f.startsWith(prefix)?cv.loadImage(path.join(release,f)):loader(f)});
function get(bundle,p,o,i){let im;
 a(bundle.draw({save(){},restore(){},drawImage(x){im=x}},p,{...o,progress:(i+.2)/8}));a(im);return im;
}
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
(async()=>{
 await api.ready;a(await api.warmSwordCheckpoint(),'checkpoint ready');
 let total=0;
 for(const pants of [22])for(const def of [0,1,67,68,70])for(const skinColor of ['light','ebony']){
  const appearance96=A.normalize({...catalog.appearance96,skinColor,eyeColor:'blue',hairColor:'black'});
  const off={appearance96,classId:'sword',equipment:{weapon:{def},legs:{def:pants}}},on={...off,equipment:{...off.equipment,boots:{def:9}}};
  const o={consumer:'world',action:'attack-sword',direction:'north'};
  const a0=api.selectVisual(off,o),a1=api.selectVisual(on,o);a(a1?.id.endsWith(':north-own-b9'),[pants,def,skinColor,a1?.id].join(' '));
  const s=a1.pack.directions.north,d=a0.pack.directions.north,own=s.layers.filter(l=>l.id.startsWith('boot9-'));
  a.equal(own.length,4);a.deepEqual(s.layers.filter(l=>!own.includes(l)),d.layers);
  a.deepEqual(s.poses,d.poses);a.deepEqual(a0.states,a1.states);a.deepEqual(a0.material,a1.material);a.deepEqual(a0.pack.pivot,a1.pack.pivot);
  const [b0,b1]=await Promise.all([api.prepareConfiguration([{player:off,options:o}]),api.prepareConfiguration([{player:on,options:o}])]);
  const proofs=[];
  try {for(let i=0;i<8;i++){
   const c0=get(b0,off,o,i),c1=get(b1,on,o,i),raw0=pixels(c0),raw1=pixels(c1),m=cv.createCanvas(c0.width,c0.height),mc=m.getContext('2d'),pad=a1.paddingPhysical||0;
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
   a(delta>1000);a.equal(outside,0);a.equal(holes,0);a(hardware>0);
   a(pixels(get(b0,off,o,i)).equals(raw0)); total++;
   proofs.push([delta,hardware,ground0,ground1]);m.width=m.height=1;
  }}finally{b0.release();b1.release();}
  console.log(pants,def,skinColor,JSON.stringify(proofs));global.gc?.();
 }
 for(const p of [21,133,147,168,175,182])a(!api.selectVisual({appearance96:A.normalize(catalog.appearance96),classId:'sword',equipment:{weapon:{def:0},legs:{def:p},boots:{def:9}}},{action:'attack-sword',direction:'north',consumer:'world'})?.id.endsWith(':north-own-b9'));
 console.log('PASS',total);
})().catch(e=>{console.error(e);process.exit(1)});
