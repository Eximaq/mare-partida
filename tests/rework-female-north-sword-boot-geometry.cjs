'use strict';
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto'),P=path.resolve(process.env.KAIZOKU_AUDIT_STAGE||process.argv[2]||path.join(__dirname,'..')),D=path.resolve(process.argv[3]||path.join(P,'dist'));
const pref='tools/rework-sword0-checkpoint/', C=require(path.join(D,pref,'sword-catalog.json'));
require(P+'/player-rework-sword0-checkpoint.js');
const {make,cv}=require(P+'/tests/rework-integration-support.cjs'),A=require(P+'/character-appearance'),load=require(P+'/tools/rework-hd-test-loader.cjs').create(P);
const api=make({fetchJSON:async f=>f===pref+'sword-catalog.json'?C:JSON.parse(fs.readFileSync(path.join(P,f))),loadImage:f=>f.startsWith(pref)?cv.loadImage(path.join(D,f)):load(f)});
const o={action:'attack-sword',direction:'north',consumer:'world'};
const p=(w,t,pants,b)=>({classId:'sword',appearance96:A.normalize({...C.appearance96,skinColor:t,eyeColor:'blue',hairColor:'black'}),equipment:{weapon:{def:w},...(pants?{legs:{def:22}}:{}),...(b?{boots:{def:b}}:{})}});
const bytes=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const pix=(q,actor,f)=>{let c;a(q.draw({save(){},restore(){},drawImage(x){c=x}},actor,{...o,progress:(f+.25)/8}));return bytes(c);};
async function batch(actor,r){const b=await api.prepareConfiguration([{player:actor,options:o,source:r}],{resolve:x=>x});try{return Array.from({length:8},(_,i)=>pix(b,actor,i));}finally{b.release();}}
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 await api.ready;a(await api.warmSwordCheckpoint());
 const out=[];
 const boots=process.env.BOOT_PROOF_SET?process.env.BOOT_PROOF_SET.split(',').map(Number):[8,134,141,155];
 for(const boot of boots){
 const g=C.records.find(x=>x.item===boot&&x.slot==='boots'&&x.direction==='north'), ls=g.layers, rs=[...new Set(ls.flatMap(l=>l.frames))];
 a.deepEqual(ls.map(l=>[l.id,l.binding.kind,l.depth]).sort(),[['boot'+boot+'-left-front','fixed',4.1],['boot'+boot+'-left-rear','fixed',-1],['boot'+boot+'-right-front','fixed',4.1],['boot'+boot+'-right-rear','fixed',-1]].sort());
 const images=new Map();for(const h of rs){const f=path.join(D,pref,'assets',h+'.png');a.equal(sha(fs.readFileSync(f)),h);images.set(h,await cv.loadImage(f));}
 for(const id of [68,69])for(const pt of (boot===8?[false,true]:[false]))for(const tone of ['light','ebony']){
 const on=p(id,tone,pt,boot),off=p(id,tone,pt,0),r=api.selectVisual(off,o);a.equal(r?.item,id);
 const {pack,baseRecord}=r,d=pack.directions.north,pad=r.paddingPhysical||0,n=pack.frame.width*4+pad*2;
 const q=api.selectVisual(on,o);
 a.equal(q?.slotRoutes?.boots?.item,boot,JSON.stringify({id,boot,tone,pt}));
 a.deepEqual(q.states,r.states);a.equal(q.paddingPhysical,r.paddingPhysical);a.deepEqual(q.material,r.material);
 a.deepEqual(q.pack.directions.north.layers.filter(l=>l.id.startsWith('boot'+boot+'-')),ls);
 a.deepEqual(q.pack.directions.north.layers.filter(l=>!l.id.startsWith('boot'+boot+'-')),d.layers);
 a.equal(api.selectVisual({...on,equipment:{...on.equipment,boots:{def:boot,variant:'unsupported'}}},o)?.slotRoutes?.boots?.quality,undefined);
 a.notEqual(api.selectVisual({...on,appearance96:{...on.appearance96,gender:'masculino'}},o)?.id,q.id);
 if(pt)a.deepEqual(q.slotRoutes.legs,r.slotRoutes.legs);
 const alias=require(P+'/paper-doll-96-lobby.js').selectWorldHD,W=require(P+'/tools/paper-doll-96-v3/weapons.json');
 for(const action of ['attack','skill'])a.equal(alias(api,W,on,{...o,action})?.id,q.id);
 const offPixels=await batch(off,r),onPixels=await batch(on,q),control=await batch(off,{...r,id:r.id+':no-blade',states:r.states.map(k=>({...k,parts:[]}))});
 const can=cv.createCanvas(n,n),cx=can.getContext('2d');cx.imageSmoothingEnabled=false;
 const trace=[];
 for(let i=0;i<8;i++){
  const A=offPixels[i],B=onPixels[i],Z=control[i];
  let full=0,outside=0,holes=0,touch=0,bootFront=0,bootRear=0,visibleBladeTouch=0,visibleBladeChanged=0,opaqueBladeChanged=0;
  cx.clearRect(0,0,n,n);cx.save();cx.translate(pad,pad);
  for(const part of r.states[i].parts){cx.save();cx.transform(...part.matrix);if(part.sourceClip){cx.beginPath();cx.rect(...part.sourceClip);cx.clip();}cx.drawImage(await load(part.url),0,0);cx.restore();}
  cx.restore();const blade=bytes(can);
  const masks=[];
  for(const face of ['front','rear']){
   cx.clearRect(0,0,n,n);
   for(const l of ls.filter(x=>x.id.endsWith(face)))cx.drawImage(images.get(l.frames[i]),pad,pad);
   masks.push(bytes(can));
  }
  const points=[];
  for(let j=0;j<A.length;j+=4){
   const F=masks[0][j+3],R=masks[1][j+3],H=F||R,W=blade[j+3],before=A.readUInt32LE(j),after=B.readUInt32LE(j),frag=Z.readUInt32LE(j),seen=before!==frag;
   if(H&&W){
    touch++;if(F)bootFront++;if(R)bootRear++;if(seen)visibleBladeTouch++;
    if(seen&&before!==after)visibleBladeChanged++;
    if(W===255&&seen&&before!==after)opaqueBladeChanged++;
    if(points.length<8)points.push([j/4%n,(j/4/n|0),F,R,W,before!==after,seen]);
   }
   if(before!==after){full++;if(!H)outside++;}
   if(A[j+3]&&!B[j+3])holes++;
  }
  a.equal(outside,0);a.equal(holes,0);a.equal(opaqueBladeChanged,0);
  trace.push({i,full,touch,bootFront,bootRear,visibleBladeTouch,visibleBladeChanged,opaqueBladeChanged,points});
 }
 can.width=1;out.push({id,boot,tone,pt,pad,selected:api.selectVisual(on,o)?.id,trace}); 
 console.log(JSON.stringify(out.at(-1)));global.gc?.();
 }
 }
 a.equal(out.reduce((k,v)=>k+v.trace.length,0),boots.reduce((n,b)=>n+(b===8?64:32),0));
 console.log('PASS 8-phase approved depth repro for boot IDs',boots.join(','));
})().catch(e=>{console.error(e);process.exit(1)});
