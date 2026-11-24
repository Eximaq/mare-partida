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
 await api.ready;a(await api.warmSwordCheckpoint(),'checkpoint verified at startup');
 let frames=0;for(const def of (process.env.SWORDS||"0,1,67,68,69,70").split(",").map(Number))for(const direction of ['south','north','east','west'])for(const skinColor of ['light','ebony']){
  const appearance96=A.normalize({...catalog.appearance96,skinColor,eyeColor:'blue',hairColor:'black'});
  const bare={appearance96,classId:'sword',equipment:{weapon:{def}}},dressed={...bare,equipment:{...bare.equipment,legs:{def:22}}};
  const o={consumer:'world',action:'attack-sword',direction};
  const r=api.selectVisual(bare,o),q=api.selectVisual(dressed,o);
  a(q?.id.includes(':checkpoint-p22-'),[def,direction,skinColor,q?.id].join(' '));
  a.deepEqual(r.states,q.states);a.deepEqual(r.material,q.material);a.deepEqual(r.pack.pivot,q.pack.pivot);
  const rr=r.pack.directions[direction],pp=q.pack.directions[direction],p22=pp.layers.find(l=>l.id.startsWith('pants22'));
  a.deepEqual(pp.layers.filter(l=>l!==p22),rr.layers.filter(l=>l.id!=='shorts'));
  a.deepEqual(rr.poses,pp.poses);a.deepEqual(rr.rest,pp.rest);a.deepEqual(rr.clip,pp.clip);
  const [on,off]=await Promise.all([api.prepareConfiguration([{player:dressed,options:o}]),api.prepareConfiguration([{player:bare,options:o}])]);
  try{
  let changes=0,residue=0,maxOff=0,weaponInterior=0;
  for(let i=0;i<8;i++){
   const c0=get(off,bare,o,i),c1=get(on,dressed,o,i),x=pixels(c0),y=pixels(c1);
   const m=cv.createCanvas(c0.width,c0.height),mc=m.getContext('2d'),pad=r.paddingPhysical||0;
   mc.drawImage(await cv.loadImage(path.join(release,prefix,'assets',p22.frames[i]+'.png')),pad,pad);
   const shorts=rr.layers.find(l=>l.id==='shorts'),SHA=shorts.frames?.[i]||shorts.source;
   mc.drawImage(await loader('tools/rework-base-hd/assets/'+SHA+'.png'),pad,pad);
   const raw=pixels(m),g=cv.createCanvas(c0.width,c0.height),gc=g.getContext('2d'),p=r.states[i].parts[0];
   a(p.depth>p22.depth);gc.translate(pad,pad);gc.imageSmoothingEnabled=false;
   gc.transform(...p.matrix);if(p.sourceClip){gc.beginPath();gc.rect(...p.sourceClip);gc.clip()}
   gc.drawImage(await loader(p.url),0,0);const blade=pixels(g),stride=c0.width*4;
   let n=0;
   for(let j=0;j<blade.length;j+=4)if(blade[j+3]>=250&&[-stride-4,-stride,-stride+4,-4,4,stride-4,stride,stride+4].every(k=>blade[j+3+k]>=250)){
     const max=Math.max(...[0,1,2,3].map(k=>Math.abs(x[j+k]-y[j+k])));a(max<=257-blade[j+3],JSON.stringify([def,direction,i,j/4,max,blade[j+3]]));weaponInterior++;
   }
   g.width=g.height=1;
   for(let j=0;j<y.length;j+=4)if(x.readUInt32LE(j)!==y.readUInt32LE(j)){
    n++; if(!raw[j+3]){residue++;maxOff=Math.max(maxOff,...[0,1,2,3].map(k=>Math.abs(x[j+k]-y[j+k])));}
   }
   a(n>500);a(pixels(get(off,bare,o,i)).equals(x));changes+=n;frames++;m.width=m.height=1;
   if(def===0&&(i===0||i===4||i===7)&&skinColor==='ebony')fs.writeFileSync(path.join(__dirname,direction+'-'+i+'.png'),c1.toBuffer('image/png'));
  }
  a.equal(residue,0,'outside original shorts or pants22');console.log(def,direction,skinColor,changes,'offBothAlpha',residue,'chanMax',maxOff,'weaponInterior',weaponInterior);
  }finally{on.release();off.release();}
  global.gc?.();
 }
 console.log('rendered',frames);
})().catch(e=>{console.error(e);process.exit(1)});
