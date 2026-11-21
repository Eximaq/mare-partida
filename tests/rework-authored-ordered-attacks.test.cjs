'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs');
const look={gender:'male',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'};
const cases=[[14,'south','attack-unarmed'],[16,'east','attack-focus'],[16,'west','attack-focus'],[31,'east','attack-focus'],[31,'west','attack-focus']];
test('ordered approved attacks select exact independent source before old routes without swallowing slots',async()=>{
 const world=make();await world.ready;
 for(const [item,direction,action] of cases){
  const p={appearance96:look,equipment:{weapon:{def:item}}},o={action,direction,consumer:'world'},r=world.select(p,o);
  assert(r?.orderedAttack,'ordered route '+item+'/'+direction);assert.equal(r.states.length,item===14?12:8);assert.equal(r.timeline.length,item===14?20:8);assert.equal(r.contactTick,item===14?8:4);
  for(const slot of ['coat','legs','boots','gloves','head','cloak','unknown'])assert(!world.select({...p,equipment:{...p.equipment,[slot]:{def:151}}},o)?.orderedAttack,slot);
  for(const q of [{__reworkSubset:true},{appearance96:{...look,gender:'female'}},{appearance96:{...look,hairColor:'pink'}}])assert(!world.select({...p,...q},o)?.orderedAttack);
  for(const act of ['idle','walk'])assert(!world.select(p,{...o,action:act})?.orderedAttack);
  assert(!world.select(p,{...o,weaponless:true})?.orderedAttack);
 }
});
test('prepared world bundle samples authored contact visually without changing gameplay snapshot',async()=>{
 const world=make();await world.ready;
 for(const [item,direction,action] of cases){
  const p={appearance96:look,equipment:{weapon:{def:item}}},o={action,direction,consumer:'world'},bundle=await world.prepareConfiguration([{player:p,options:o}]);
  assert.equal(bundle.coverage[0].source,'authored-ordered-'+item+'-'+direction);assert.deepEqual(bundle.coverage[0].omitted,[]);
  for(const h of [.3,.5,.7]){
   const timing=Object.freeze({locked:true,action,direction,progress:h,hitFrameRatio:h,duration:1.2,elapsed:h*1.2}),before=JSON.stringify(timing);
   assert(bundle.draw(cv.createCanvas(640,640).getContext('2d'),p,{...o,time:timing.elapsed,progress:h,timing}));
   assert.equal(world.snapshot().last.frame,4,'source contact at existing gameplay hit');assert.equal(JSON.stringify(timing),before);
  }
  bundle.release();
 }
});
test('44 original ordered frames preserve source alpha geometry and exact equipment/anatomy operations',async()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),index=require('../tools/rework-weapon-layers-hd/index.json'),api=require('../player-rework-weapon-native-hd.js').create(index,{makeCanvas:cv.createCanvas}),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 const raw=fs.readFileSync(path.join(__dirname,'fixtures/approved-attacks-14-16-31-fixtures.zip'));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),'eac040fa176edf490530d189f618e6c4e06bd978d4bdfe0f78fa80ba424868a4');const zip=await require('../player-rework-zip.js').loadArchive(raw,'eac040fa176edf490530d189f618e6c4e06bd978d4bdfe0f78fa80ba424868a4');
 let count=0,report=[];
 for(const r of index.orderedAttackProfiles.filter(r=>[14,16,31].includes(r.item))){const images=new Map(await Promise.all(api.requiredFiles(r).map(async p=>[p,await load(p)])));
  for(let frame=0;frame<r.states.length;frame++){
   const source=await zip.read(r.item+'/'+r.direction+'/'+String(frame).padStart(2,'0')+'.png');assert.equal(crypto.createHash('sha256').update(source).digest('hex'),r.states[frame].approvedReferenceSHA256);
   const a=cv.createCanvas(640,640).getContext('2d'),b=cv.createCanvas(640,640).getContext('2d');api.render(a,r,images,{frame});b.drawImage(await cv.loadImage(Buffer.from(source)),0,0);const x=a.getImageData(0,0,640,640).data,y=b.getImageData(0,0,640,640).data;let max=0,premul=0,channels=0,alphas={};
   for(let n=0;n<x.length;n++){const d=Math.abs(x[n]-y[n]),alpha=y[n-n%4+3];if(n%4===3)assert.equal(x[n],y[n]);else{if(alpha===255)assert(d<=1);max=Math.max(max,d);premul=Math.max(premul,d*alpha/255);if(d>1){channels++;alphas[alpha]=(alphas[alpha]||0)+1;}if(r.item===16)assert.equal(d,0);if(r.item===31)assert(d<=1);if(r.item===14&&alpha<255)assert(d*alpha/255<=2);}}
   report.push({item:r.item,direction:r.direction,frame,max,premul,channels,alphas});count++;
  }
 }
 const exceptions=report.filter(r=>r.channels);assert.deepEqual(exceptions.map(r=>[r.item,r.frame,r.channels,r.max]),[[14,9,9,4],[14,10,21,7]]);assert.deepEqual(exceptions.map(r=>r.alphas),[{62:1,106:1,116:1,124:1,133:1,167:2,174:1,229:1},{35:2,46:1,47:2,64:1,66:1,68:2,74:1,84:1,107:1,114:1,145:2,156:1,168:1,181:1,190:1,223:1,251:1}]);console.log('M14_MEASURED',JSON.stringify(exceptions));assert.equal(count,44);
});

test('real combat controller A/B preserves cooldown duration impact and unlock across six speeds',async()=>{
 const C=require('../combat-animation.js'),world=make();await world.ready;
 for(const [item,direction,action] of cases.filter(c=>c[1]!=='west')){
  const p={appearance96:look,equipment:{weapon:{def:item}}},o={action,direction,consumer:'world'},bundle=await world.prepareConfiguration([{player:p,options:o}]),ctx=cv.createCanvas(1,1).getContext('2d');
  for(const speed of [.5,1,1.2,1.5,2,4]){
   let impactA=0,impactB=0;const clip={attack:{frames:4,fps:8,impact_frame:2,loop:false}},a=C.create(clip),b=C.create(clip);
   a.play('attack',{direction,attackSpeed:speed,onImpact:()=>impactA++});b.play('attack',{direction,attackSpeed:speed,onImpact:()=>impactB++});const initial=a.snapshot(),seen=new Set();
   for(let i=0;i<400;i++){const timing=Object.freeze(a.snapshot()),before=JSON.stringify(timing);assert(bundle.draw(ctx,p,{...o,progress:timing.progress,time:timing.elapsed,timing}));seen.add(world.snapshot().last.frame);assert.equal(JSON.stringify(timing),before);a.step(initial.duration/400);b.step(initial.duration/400);assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(impactA,impactB);}
   assert.equal(impactA,1);assert(!a.locked());assert.equal(seen.size,item===14?12:8);
  }bundle.release();
 }
});

test('unopted existing sources retain their original phase even when timing is supplied',async()=>{
 const world=make();await world.ready;const p={appearance96:look,equipment:{weapon:{def:111}}},o={action:'attack-unarmed',direction:'east',consumer:'world'},b=await world.prepareConfiguration([{player:p,options:o}]);
 assert(!world.select(p,o).orderedAttack);for(const progress of [0,.3,.5,.9,.999]){assert(b.draw(cv.createCanvas(1,1).getContext('2d'),p,{...o,progress,timing:{locked:true,duration:1,hitFrameRatio:.3}}));assert.equal(world.snapshot().last.frame,Math.floor(progress*8));}b.release();
});
