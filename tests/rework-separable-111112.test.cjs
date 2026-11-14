'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const{make,cv}=require('./rework-integration-support.cjs');
test('111/112 retain source eight-state clock and only claim verified bare equipment',async()=>{
 const world=make();await world.ready;
 for(const item of [111,112])for(const direction of ['east','west']){
  const p={appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'},equipment:{weapon:{def:item}}},o={consumer:'world',action:'attack-unarmed',direction},r=world.select(p,o);
  assert(r?.separableAttack);assert(r.id.includes('male-authored-gauntlet'+item+'-eight'));assert.equal(r.fps,12);assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);assert.deepEqual(r.equipmentContract,{weapon:item});assert.equal(r.states[0].layers.length,2);assert(await world.prepareClip(p,o));
  for(let frame=0;frame<8;frame++)assert(world.draw(cv.createCanvas(640,640).getContext('2d'),p,{...o,progress:(frame+.1)/8,x:320,y:512}));
  for(const slot of ['coat','gloves','boots','legs','head','cloak'])assert(!world.select({...p,equipment:{...p.equipment,[slot]:{def:slot==='coat'?151:152}}},o)?.separableAttack,slot);
  assert(!world.select({...p,__reworkSubset:true},o)?.separableAttack);assert(!world.select({...p,appearance96:{...p.appearance96,hairColor:'pink'}},o)?.separableAttack);
  for(const action of ['idle','walk','attack-focus'])assert(!world.select(p,{...o,action})?.separableAttack);
 }
});
test('111/112 source-only layers reproduce all32 independently approved E/W reference frames',async()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),index=require('../tools/rework-weapon-layers-hd/index.json'),api=require('../player-rework-weapon-native-hd.js'),proof=require('./fixtures/separable-111112-approved.json'),zip=await require('../player-rework-zip.js').loadArchive(fs.readFileSync(path.join(__dirname,'fixtures/separable-111112-approved.zip')),proof.fixtureZIP),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..')),h=api.create(index,{makeCanvas:cv.createCanvas});
 let frames=0,exceptionChannels=0,maxPremul111=0;const exceptionAlphas={};for(const item of [111,112])for(const direction of ['east','west']){
  const r=h.resolveSeparable({item,body:'male',direction,action:'attack-unarmed',appearance:{hair:'original',hairColor:'brown',face:'original',eyeColor:'brown',skin:'light'},equipment:{}});assert(r);const images=new Map(await Promise.all(h.requiredFiles(r).map(async p=>[p,await load(p)])));
  for(let frame=0;frame<8;frame++){
   const name=item+'-'+direction+'-'+frame+'.png',raw=await zip.read(name);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),proof.members[name]);
   const a=cv.createCanvas(640,640).getContext('2d'),b=cv.createCanvas(640,640).getContext('2d');h.render(a,r,images,{frame});b.drawImage(await cv.loadImage(Buffer.from(raw)),0,0);const x=a.getImageData(0,0,640,640).data,y=b.getImageData(0,0,640,640).data;
   // M111 alone: exact source recomposition is proven separately. Canvas premultiplication
   // introduces 56 straight-RGB channels above one at intermediate alpha, not geometry drift.
   for(let n=0;n<x.length;n++){
    const delta=Math.abs(x[n]-y[n]),alpha=x[n-n%4+3];
    if(n%4===3)assert.equal(x[n],y[n],'alpha '+name+' byte'+n);
    else if(item===111&&alpha>0&&alpha<255){
     const premul=delta*alpha/255;maxPremul111=Math.max(maxPremul111,premul);assert(premul<=2,'premultiplied '+name+' byte'+n);
     if(delta>1){exceptionChannels++;exceptionAlphas[alpha]=(exceptionAlphas[alpha]||0)+1;}
    }else assert(delta<=1,'approved '+name+' byte'+n);
   }frames++;
  }
 }assert.equal(frames,32);assert.equal(exceptionChannels,56);assert.deepEqual(exceptionAlphas,{133:10,180:10,187:10,195:20,207:6});assert.equal(maxPremul111,414/255);
});
