'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const{make,cv}=require('./rework-integration-support.cjs'),index=require('../tools/rework-weapon-layers-hd/index.json'),api=require('../player-rework-weapon-native-hd.js'),fixture=require('./fixtures/separable-cuff118-approved.json');
test('118 optional sleeve sockets preserve all64 sources and sixteen bare phases without changing other rigs',async()=>{
 const world=make();await world.ready;const h=api.create(index,{makeCanvas:cv.createCanvas}),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 const zip=await require('../player-rework-zip.js').loadArchive(fs.readFileSync(path.join(__dirname,'fixtures/separable-cuff118-approved.zip')),fixture.fixtureZIP),original=async name=>{const raw=await zip.read(name);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),fixture.members[name]);return cv.loadImage(Buffer.from(raw));};let count=0,translucentExceptions=0,maxPremultipliedDelta=0;
 for(const direction of ['east','west'])for(const coat of [undefined,151,158,165,179]){
  const p={appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'},equipment:{weapon:{def:118},...(coat?{coat:{def:coat}}:{})}},pose={consumer:'world',action:'attack-unarmed',direction};
  const r=world.select(p,pose);assert(r?.separableAttack);assert(r.id.includes('male-punch-native-right-cuff'));assert.equal(r.timeline.length,20);assert.equal(r.fps,12);assert.deepEqual(r.equipmentContract,{weapon:118,...(coat?{coat}:{})});
  assert(await world.prepareClip(p,pose));const images=new Map(await Promise.all(h.requiredFiles(r).map(async f=>[f,await load(f)])));
  for(let frame=0;frame<8;frame++){
   const x=cv.createCanvas(640,640).getContext('2d');h.render(x,r,images,{frame});
   const sourceOffset=coat&&[0,7].includes(frame)?coat===151?[-4,-7]:coat===179?[-1,-3]:[-1,-2]:frame===4?[-3,0]:[0,0];
   const expectedOffset=direction==='east'?sourceOffset:[-sourceOffset[0]||0,sourceOffset[1]];assert.deepEqual(r.states[frame].layers.at(-1).offset,expectedOffset);
   const ref=cv.createCanvas(640,640).getContext('2d');if(direction==='west'){ref.translate(640,0);ref.scale(-1,1);}
   if(coat)ref.drawImage(await original(coat+'/'+frame+'-east.png'),0,0);else{ref.drawImage(await original('base/'+frame+'.png'),0,0);ref.drawImage(await original('equipment/'+frame+'.png'),...sourceOffset);}
   const a=x.getImageData(0,0,640,640).data,b=ref.getImageData(0,0,640,640).data;for(let n=0;n<a.length;n++){
    const delta=Math.abs(a[n]-b[n]),alpha=a[n-n%4+3];
    //118 original layers recompose exactly in Pillow. Canvas premultiplication
    //roundtrips differ at72 translucent RGB channels, not alpha or opaque geometry.
    if(n%4===3)assert.equal(delta,0);else{assert(alpha===255?delta<=1:delta*alpha/255<=2,'118 source '+coat+'/'+direction+'/'+frame+' byte'+n);if(coat){if(delta>1)translucentExceptions++;maxPremultipliedDelta=Math.max(maxPremultipliedDelta,delta*alpha/255);}}
   }
   const without=cv.createCanvas(640,640).getContext('2d'),noWeapon={...r,states:r.states.map(s=>({...s,layers:s.layers.slice(0,-1)}))};h.render(without,noWeapon,images,{frame});const outside=without.getImageData(0,0,640,640).data,gear=cv.createCanvas(640,640).getContext('2d'),layer=r.states[frame].layers.at(-1);gear.drawImage(images.get('tools/rework-weapon-layers-hd/'+layer.url),...expectedOffset);const mask=gear.getImageData(0,0,640,640).data;
   for(let n=0;n<a.length;n+=4)if(!mask[n+3])for(let q=0;q<4;q++)assert.equal(a[n+q],outside[n+q],'outside translated gear cannot change');
   assert(world.draw(cv.createCanvas(640,640).getContext('2d'),p,{...pose,progress:(frame+.1)/20,x:320,y:512}));count++;
  }
  for(const slot of ['gloves','head','legs','boots','cloak'])assert(!world.select({...p,equipment:{...p.equipment,[slot]:{def:152}}},pose)?.separableAttack,slot);
  for(const action of ['idle','walk','attack-focus','attack-firearm'])assert(!world.select(p,{...pose,action})?.separableAttack,action);
  assert(!world.select({...p,__reworkSubset:true},pose)?.separableAttack);
  for(const weapon of [15,109,117]){const other=world.select({...p,equipment:{...p.equipment,weapon:{def:weapon}}},pose);assert(other?.separableAttack);assert(!other.id.includes('native-right-cuff'));assert(!other.states[0].layers.at(-1).offset);}
 }
 assert.equal(count,80);assert.equal(translucentExceptions,72);assert(maxPremultipliedDelta>1&&maxPremultipliedDelta<=2);
});
