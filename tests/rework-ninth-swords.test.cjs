'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {make}=require('./rework-integration-support.cjs');
const look={gender:'male',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'};
test('authored original lateral swords select exact bare source without consuming unsupported slots',async()=>{
 const world=make();await world.ready;
 for(const item of [0,1,68,69])for(const direction of ['east','west']){
  const p={classId:'sword',appearance96:look,equipment:{weapon:{def:item}}},o={action:'attack-sword',direction,consumer:'world'};
  const r=world.select(p,o);assert.equal(r?.id,`authored-ordered-${item}-${direction}`);assert(r.orderedAttack);assert(r.strictSourceIdentity);assert.equal(r.contactTick,4);assert.equal(r.fps,12);assert.equal(r.phaseCount,8);assert.deepEqual(r.nativeCanvas,item===0?[640,640]:item===69?[1024,1024]:[768,768]);assert.deepEqual(r.pivot,item===0?[80,128]:item===69?[128,176]:[96,144]);assert.equal(r.density,4);
  for(const q of [{classId:'gunner'},{classId:undefined},{appearance96:{...look,gender:'female'}},{appearance96:{...look,hairColor:'pink'}},{equipment:{weapon:{def:item,variant:'alternate'}}},...([1,68].includes(item)?[]:[{equipment:{weapon:{def:item},coat:{def:151}}}]),{equipment:{weapon:{def:item},gloves:{def:152}}},{__reworkSubset:true}])assert(!world.select({...p,...q},o)?.orderedAttack,JSON.stringify(q));
  for(const action of ['idle','walk','attack-focus','attack-firearm'])assert(!world.select(p,{...o,action})?.orderedAttack);
  for(const side of ['north','south'])assert(!world.select(p,{...o,direction:side})?.orderedAttack);
 }
});
test('64 original sword references retain alpha, native geometry and source pixels',async()=>{
 const fs=require('fs'),path=require('path'),crypto=require('crypto'),{cv}=require('./rework-integration-support.cjs'),index=require('../tools/rework-weapon-layers-hd/index.json');
 const api=require('../player-rework-weapon-native-hd.js').create(index,{makeCanvas:cv.createCanvas}),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 const archives={};for(const [item,file,hash] of [[0,'sword0-approved-references.zip','e3fdc9e30c72c76b7cf373a3591cfcb8b5617ffe6d37603f8b5926be985420a4'],[1,'sword1-68-approved-references.zip','10f1e918de310fb340376b6a09f3d6270f58d25286c3b37181f06263bb1c86d4'],[69,'sword69-approved-references.zip','dd1313f03f7b4f324067faf35fc2a1a03d80a155eca47c79917c4aab9cfa2b72']]){const raw=fs.readFileSync(path.join(__dirname,'fixtures',file));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),hash);archives[item]=await require('../player-rework-zip.js').loadArchive(raw,hash);}archives[68]=archives[1];let count=0;
 for(const r of index.orderedAttackProfiles.filter(r=>[0,1,68,69].includes(r.item))){const images=new Map;for(const f of api.requiredFiles(r))images.set(f,await load(f));const [w,h]=r.nativeCanvas;
  for(let k=0;k<8;k++){const s=r.states[k],source=await archives[r.item].read(r.item===69?`69/${r.direction}/${String(k).padStart(2,'0')}.png`:s.approvedReferenceSHA256+'.png');assert.equal(crypto.createHash('sha256').update(source).digest('hex'),s.approvedReferenceSHA256);const c=cv.createCanvas(w,h),b=cv.createCanvas(w,h);const out=api.render(c.getContext('2d'),r,images,{frame:k});assert.deepEqual(out.pivot,{x:r.pivot[0]*4,y:r.pivot[1]*4});assert.equal(out.physicalScale,1);b.getContext('2d').drawImage(await cv.loadImage(Buffer.from(source)),0,0);const a=c.getContext('2d').getImageData(0,0,w,h).data,e=b.getContext('2d').getImageData(0,0,w,h).data;let max=0,alpha=0,opaque=0,over1=0,pm=0;
   for(let n=0;n<a.length;n+=4){alpha=Math.max(alpha,Math.abs(a[n+3]-e[n+3]));for(let j=0;j<3;j++){const d=Math.abs(a[n+j]-e[n+j]);max=Math.max(max,d);over1+=d>1;if(e[n+3]===255)opaque=Math.max(opaque,d);pm=Math.max(pm,Math.abs(a[n+j]*a[n+3]-e[n+j]*e[n+3])/255);}}
   console.log(JSON.stringify({item:r.item,direction:r.direction,phase:k,alpha,max,opaque,over1,pm}));assert.equal(alpha,0);assert(max<=1,`${r.item}/${r.direction}/${k} RGB ${max}`);count++;
  }
 }assert.equal(count,64);
});
// Sixteen original1/68 coat combinations are now positive controls in eleventh-production/raster; all other old controls remain.
test('legacy bare and clothed swords retain identical fallback records outside the new strict source signature',async()=>{
 const fs=require('fs'),path=require('path'),zlib=require('zlib');
 const current=make(),baseline=make({fetchJSON:async p=>{const f=path.join(__dirname,'..',p),j=JSON.parse(fs.existsSync(f)?fs.readFileSync(f):zlib.gunzipSync(fs.readFileSync(f+'.gz')));if(p==='tools/rework-weapon-layers-hd/index.json')j.orderedAttackProfiles=j.orderedAttackProfiles.filter(r=>![0,1,68,69].includes(r.item));return j;}});await Promise.all([current.ready,baseline.ready]);let count=0;
 for(const item of [0,1,67,68,69,70])for(const direction of ['east','west','north','south']){
  const p={classId:'sword',appearance96:look,equipment:{weapon:{def:item}}},o={action:'attack-sword',direction};
  const qs=[{...p,appearance96:{...look,hairColor:'pink'}},{...p,appearance96:{...look,gender:'female'}},{...p,__reworkSubset:true},...[151,158,165,179].map(c=>({...p,equipment:{weapon:{def:item},coat:{def:c}}})),{...p,equipment:{weapon:{def:item},gloves:{def:152}}}];
  if([67,70].includes(item)||['north','south'].includes(direction))qs.push(p);
  for(const q of qs){if([1,68].includes(item)&&['east','west'].includes(direction)&&q.equipment.coat&&q.appearance96===look&&q.classId==='sword'&&!q.__reworkSubset)continue;assert.deepEqual(current.select(q,o),baseline.select(q,o),`${item}/${direction}/${JSON.stringify(q)}`);count++;}
  assert(!current.select(p,{...o,weaponless:true})?.orderedAttack);
 }assert.equal(count,192);
});
test('69 padded anatomy is exactly the 768 original within128 margins and has the same physical world anchor',async()=>{
 const {cv}=require('./rework-integration-support.cjs'),path=require('path'),index=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 for(const side of ['east','west']){const a=index.orderedAttackProfiles.find(r=>r.item===1&&r.direction===side),b=index.orderedAttackProfiles.find(r=>r.item===69&&r.direction===side);assert.deepEqual(b.pivot.map((v,i)=>v*4-a.pivot[i]*4),[128,128]);
  for(let k=0;k<8;k++){const x=cv.createCanvas(768,768).getContext('2d'),y=cv.createCanvas(1024,1024).getContext('2d');x.drawImage(await load('tools/rework-weapon-layers-hd/'+a.states[k].layers[0].url),0,0);y.drawImage(await load('tools/rework-weapon-layers-hd/'+b.states[k].layers[0].url),0,0);assert.deepEqual(y.getImageData(128,128,768,768).data,x.getImageData(0,0,768,768).data,side+k);}
 }
});
