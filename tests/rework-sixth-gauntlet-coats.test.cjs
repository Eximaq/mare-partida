'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {make}=require('./rework-integration-support.cjs');
const appearance96={gender:'male',hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'};
test('111/112 independently select each approved coat without consuming any extra visible slot',async()=>{
 const world=make();await world.ready;
 for(const item of [111,112])for(const coat of [151,158,165,179])for(const direction of ['east','west']){
  const p={appearance96,equipment:{weapon:{def:item},coat:{def:coat}}},o={consumer:'world',action:'attack-unarmed',direction},r=world.select(p,o);
  assert(r?.separableAttack,`${item}/${coat}/${direction}`);assert(r.id.includes(`male-authored-gauntlet${item}-eight`));assert.deepEqual(r.equipmentContract,{weapon:item,coat});assert.equal(r.states[0].layers.length,3);assert(await world.prepareClip(p,o));
  for(const slot of ['gloves','boots','legs','head','cloak'])assert(!world.select({...p,equipment:{...p.equipment,[slot]:{def:152}}},o)?.id.includes(`male-authored-gauntlet${item}-eight`),slot);
  assert(!world.select({...p,__reworkSubset:true},o)?.separableAttack);
  assert(!world.select({...p,appearance96:{...appearance96,hairColor:'pink'}},o)?.separableAttack);
  for(const action of ['idle','walk','attack-focus'])assert(!world.select(p,{...o,action})?.id.includes(`male-authored-gauntlet${item}-eight`));
  const removed=world.select({...p,equipment:{coat:{def:coat}}},o);
  assert(!removed?.id.includes('male-authored-gauntlet'),'removing weapon must not retain its rig');
 }
});
test('128 original coat references retain alpha and geometry with unchanged independent base and weapon',async()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{cv}=require('./rework-integration-support.cjs'),proof=require('../tools/rework-weapon-layers-hd/sixth-coats-source-proof.json'),index=require('../tools/rework-weapon-layers-hd/index.json'),api=require('../player-rework-weapon-native-hd.js'),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..')),h=api.create(index,{makeCanvas:cv.createCanvas}),zip=await require('../player-rework-zip.js').loadArchive(fs.readFileSync(path.join(__dirname,'fixtures/lot6-independent-approved-fixtures.zip')),proof.archives[1].sha256);
 let count=0,exceptionChannels=0,maxPremul=0;const exceptionAlphas={};
 for(const item of [111,112])for(const coat of [151,158,165,179])for(const direction of ['east','west']){
  const opts={item,body:'male',direction,action:'attack-unarmed',appearance:{hair:'original',hairColor:'brown',face:'original',eyeColor:'brown',skin:'light'}},r=h.resolveSeparable({...opts,equipment:{coat}}),bare=h.resolveSeparable(opts);assert(r);
  const images=new Map(await Promise.all(h.requiredFiles(r).map(async p=>[p,await load(p)])));
  for(let frame=0;frame<8;frame++){
   assert.deepEqual(r.states[frame].layers[0],bare.states[frame].layers[0]);assert.equal(r.states[frame].layers[2].sha256,bare.states[frame].layers[1].sha256);
   const name=`${item}/${coat}/${direction}/${String(frame).padStart(2,'0')}.png`,reference=proof.comparisons.find(x=>x.reference===name),raw=await zip.read(name);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),reference.referenceSHA256);
   const a=cv.createCanvas(640,640).getContext('2d'),b=cv.createCanvas(640,640).getContext('2d');h.render(a,r,images,{frame});b.drawImage(await cv.loadImage(Buffer.from(raw)),0,0);const x=a.getImageData(0,0,640,640).data,y=b.getImageData(0,0,640,640).data;
   for(let n=0;n<x.length;n++){
    const delta=Math.abs(x[n]-y[n]),alpha=x[n-n%4+3];if(n%4===3)assert.equal(delta,0,`alpha ${name}`);
    else if(item===111&&alpha>0&&alpha<255){const p=delta*alpha/255;maxPremul=Math.max(maxPremul,p);assert(p<=2,`premul ${name}`);if(delta>1){exceptionChannels++;exceptionAlphas[alpha]=(exceptionAlphas[alpha]||0)+1;}}
    else assert(delta<=1,`RGB ${name} byte${n}`);
   }count++;
  }
 }assert.equal(count,128);assert.equal(exceptionChannels,224);assert.deepEqual(exceptionAlphas,{133:40,180:40,187:40,195:80,207:24});assert.equal(maxPremul,414/255);console.log(JSON.stringify({sixthCanvas:{exceptionChannels,exceptionAlphas,maxPremul}}));
});
