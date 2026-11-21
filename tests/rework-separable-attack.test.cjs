'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {cv}=require('./rework-integration-support.cjs');
const api=require('../player-rework-weapon-native-hd.js');
const asset=n=>({url:'assets/'+String(n).repeat(64)+'.png',sha256:String(n).repeat(64),size:[640,640]});
const frames=n=>Array.from({length:8},()=>asset(n));
const approvedAppearance={hair:'original',hairColor:'brown',face:'original',eyeColor:'brown',skin:'light'};
const spec={schema:'approved-separable-attacks-v1',body:'male',nativeCanvas:[640,640],logicalFrame:[160,160],pivot:[80,128],density:4,fps:12,timeline:['0','1','2','3','4','5','6','7',...Array(12).fill('7')],approvedAppearance,directions:{east:{base:frames(1),coats:{151:frames(2),158:frames(3),165:frames(4)},weapons:{15:frames(5)}}}};
const hd=()=>api.create({schema:'native-hd-weapon-layers-v1',records:[],separableAttacks:spec},{makeCanvas:cv.createCanvas});
test('separable attack selects each optional slot independently and never consumes extras',()=>{
 const h=hd();for(const item of [undefined,15])for(const coat of [undefined,151,158,165]){
  if(!item&&!coat)continue;
  const q={item,body:'male',direction:'east',action:'attack-unarmed',appearance:approvedAppearance,equipment:coat?{coat:{def:coat}}:{}};
  assert.equal(h.resolveSeparable({...q,allowExactComposite:false}),null);
  const r=h.resolveSeparable(q);assert(r?.separableAttack);assert.deepEqual(r.equipmentContract,{...(item?{weapon:item}:{}),...(coat?{coat}: {})});assert.equal(r.states[0].layers.length,1+!!coat+!!item);
  for(const slot of ['gloves','head','legs','boots','mystery'])assert.equal(h.resolveSeparable({...q,equipment:{...q.equipment,[slot]:152}}),null);
  assert.equal(h.resolveSeparable({...q,appearance:{...approvedAppearance,hairColor:'pink'}}),null);
  assert.equal(h.resolveSeparable({...q,body:'female'}),null);assert.equal(h.resolveSeparable({...q,action:'walk'}),null);
 }
});
test('separable composition keeps weapon pixels across coat exchange and removal',()=>{
 const h=hd(),images=new Map();for(let n=1;n<=5;n++){const c=cv.createCanvas(640,640),x=c.getContext('2d');x.fillStyle=['','red','blue','green','yellow','purple'][n];x.fillRect(n===5?300:0,0,100,100);images.set('tools/rework-weapon-layers-hd/'+asset(n).url,c)}
 let previous;for(const coat of [undefined,151,158,165]){const r=h.resolveSeparable({item:15,body:'male',direction:'east',action:'attack-unarmed',appearance:approvedAppearance,equipment:coat?{coat}:{}});assert(r);const c=cv.createCanvas(640,640);h.render(c.getContext('2d'),r,images,{frame:0});const pixels=c.getContext('2d').getImageData(300,0,100,100).data;if(previous)assert.deepEqual(pixels,previous);previous=pixels;}
});
test('normal selector refuses the separable adapter after fallback drops equipment',async()=>{
 const fs=require('node:fs'),path=require('node:path'),{make}=require('./rework-integration-support.cjs');
 const world=make({fetchJSON:async p=>{const file=path.join(__dirname,'..',p),j=JSON.parse(fs.existsSync(file)?fs.readFileSync(file):require('node:zlib').gunzipSync(fs.readFileSync(file+'.gz')));return p==='tools/rework-weapon-layers-hd/index.json'?{...j,separableAttacks:spec}:j;}});await world.ready;
 const player={appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'},equipment:{weapon:{def:15},coat:{def:158}}};
 const pose={consumer:'world',action:'attack-unarmed',direction:'east'};
 assert(world.select(player,pose)?.separableAttack);
 assert(!world.select({...player,__reworkSubset:true},pose)?.separableAttack);
 for(const slot of ['gloves','head','legs','boots','cloak','mystery'])assert(!world.select({...player,equipment:{...player.equipment,[slot]:{def:152}}},pose)?.separableAttack,slot);
 for(const action of ['idle','walk','attack-focus','attack-sword','attack-firearm'])assert(!world.select(player,{...pose,action})?.separableAttack,action);
});
test('production separable sources draw through normal renderer and reproduce independently frozen approved rasters',async()=>{
 const {make}=require('./rework-integration-support.cjs'),path=require('node:path'),crypto=require('node:crypto');
 const index=require('../tools/rework-weapon-layers-hd/index.json'),h=api.create(index,{makeCanvas:cv.createCanvas}),world=make();await world.ready;
 const fixture=require('./fixtures/separable-attack15-approved.json'),originals=await require('../player-rework-zip.js').loadArchive(require('node:fs').readFileSync(path.join(__dirname,'fixtures/separable-attack15-approved.zip')),fixture.fixtureZIP),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 const weaponPixels=new Map();let maxRGBDelta=0,comparedFrames=0;
 for(const direction of ['east','west'])for(const coat of [undefined,151,158,165,179])for(const weapon of [undefined,15]){
  if(!coat&&!weapon)continue;
  const p={appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'},equipment:{...(coat?{coat:{def:coat}}:{}),...(weapon?{weapon:{def:weapon}}:{})}},pose={consumer:'world',action:'attack-unarmed',direction};
  const r=world.select(p,pose);assert(r?.separableAttack);assert.deepEqual(r.equipmentContract,{...(weapon?{weapon}:{}),...(coat?{coat}:{})});assert.equal(r.timeline.length,20);assert.equal(r.fps,12);
  const images=new Map(await Promise.all(h.requiredFiles(r).map(async f=>[f,await load(f)])));assert(await world.prepareClip(p,pose));
  for(let frame=0;frame<8;frame++){
   const c=cv.createCanvas(640,640),x=c.getContext('2d');const rendered=h.render(x,r,images,{frame});assert.deepEqual(rendered.pivot,{x:320,y:512});assert.equal(rendered.roundingTolerance,1);assert.equal(rendered.roundingCorrection,false);
   if(weapon){
    const own=cv.createCanvas(640,640).getContext('2d');own.drawImage(images.get('tools/rework-weapon-layers-hd/'+index.separableAttacks.directions[direction].weapons[15][frame].url),0,0);
    const mask=own.getImageData(0,0,640,640).data,a=x.getImageData(0,0,640,640).data,key=direction+'/'+frame;
    if(!weaponPixels.has(key))weaponPixels.set(key,a);else{const baseline=weaponPixels.get(key);for(let n=0;n<a.length;n+=4)if(mask[n+3])for(let q=0;q<4;q++)assert.equal(a[n+q],baseline[n+q],'coat must not change weapon support '+key);}
   }
   if(coat&&weapon){
    const ref=cv.createCanvas(640,640).getContext('2d');if(direction==='west'){ref.translate(640,0);ref.scale(-1,1);}ref.drawImage(await cv.loadImage(Buffer.from(await originals.read(coat+'-east-'+frame+'.png'))),0,0);
    const actual=x.getImageData(0,0,640,640).data,expected=ref.getImageData(0,0,640,640).data;
    assert.equal(crypto.createHash('sha256').update(expected).digest('hex'),fixture.rasterSHA256[coat+'-'+direction+'-'+frame+'.png']);
    // Original files/Pillow reproduce exact RGBA. Canvas premultiplication may
    // round RGB by one; alpha/geometry must remain exactly identical, all64 frames.
    for(let n=0;n<actual.length;n++){const delta=Math.abs(actual[n]-expected[n]);if(n%4!==3)maxRGBDelta=Math.max(maxRGBDelta,delta);assert(n%4===3?delta===0:delta<=1,'source raster '+coat+'/'+direction+'/'+frame+' byte '+n);}comparedFrames++;
   }
   assert(world.draw(cv.createCanvas(640,640).getContext('2d'),p,{...pose,progress:(frame+.1)/20,x:320,y:512}));
  }
 }
 assert.equal(comparedFrames,64);assert.equal(maxRGBDelta,1);
});
test('authored gear ownership excludes coat even under translucent gear pixels',()=>{
 const custom=structuredClone(spec);custom.directions.east.weapons[109]=frames(5).map(a=>({...a,occludesCoat:true}));
 const h=api.create({schema:'native-hd-weapon-layers-v1',records:[],separableAttacks:custom},{makeCanvas:cv.createCanvas}),images=new Map();
 for(let n=1;n<=5;n++){const c=cv.createCanvas(640,640),x=c.getContext('2d');x.fillStyle=n===5?'rgba(90,30,120,0.5)':n===1?'#e0b090':n===2?'red':'blue';x.fillRect(0,0,n===5?20:40,40);images.set('tools/rework-weapon-layers-hd/'+asset(n).url,c);}
 let reference;for(const coat of [undefined,151,158]){
  const r=h.resolveSeparable({item:109,body:'male',direction:'east',action:'attack-unarmed',appearance:approvedAppearance,equipment:coat?{coat}:{}}),c=cv.createCanvas(640,640),x=c.getContext('2d');h.render(x,r,images,{frame:0});const pixels=x.getImageData(0,0,20,40).data;
  if(reference)assert.deepEqual(pixels,reference,'coat must not tint authored gear edges');else reference=pixels;
  if(coat){const external=x.getImageData(30,20,1,1).data;assert.deepEqual([...external],coat===151?[255,0,0,255]:[0,0,255,255]);}
 }
});
test('focus rig stays separate from punch geometry and its twenty-tick clock',()=>{
 const focus={...structuredClone(spec),rig:'male-focus-east-modular8',action:'attack-focus',timeline:['0','1','2','3','4','5','6','7']};focus.directions.east.weapons={32:frames(6)};
 const h=api.create({schema:'native-hd-weapon-layers-v1',records:[],separableAttacks:spec,separableAttackRigs:[focus]},{makeCanvas:cv.createCanvas});
 const q={item:32,body:'male',direction:'east',action:'attack-focus',appearance:approvedAppearance,equipment:{coat:158}},r=h.resolveSeparable(q);assert(r);assert.equal(r.timeline.length,8);assert(r.id.includes('male-focus-east-modular8'));assert.equal(r.states[0].layers.at(-1).sha256,asset(6).sha256);
 for(const action of ['attack-unarmed','walk','idle','attack-firearm'])assert.equal(h.resolveSeparable({...q,action}),null);
 assert.equal(h.resolveSeparable({...q,item:15}),null);assert.equal(h.resolveSeparable({...q,equipment:{coat:158,gloves:152}}),null);
 assert.equal(h.resolveSeparable({...q,item:15,action:'attack-unarmed'})?.timeline.length,20);
});
test('optional authored cuff sockets translate gear without requiring a coat or changing other rigs',()=>{
 const cuff={...structuredClone(spec),rig:'male-punch-native-right-cuff',action:'attack-unarmed'};cuff.directions.east.weapons={118:frames(5).map(a=>({...a,attachment:{name:'native-right-cuff',anchor:[30,30],fallbackOffset:[0,0]}}))};
 cuff.directions.east.coats[151]=frames(2).map(a=>({...a,socket:{name:'native-right-cuff',position:[26,23]}}));
 const h=api.create({schema:'native-hd-weapon-layers-v1',records:[],separableAttacks:spec,separableAttackRigs:[cuff]},{makeCanvas:cv.createCanvas}),q={item:118,body:'male',direction:'east',action:'attack-unarmed',appearance:approvedAppearance};
 const bare=h.resolveSeparable({...q,equipment:{}}),dressed=h.resolveSeparable({...q,equipment:{coat:151}});
 assert.deepEqual(bare.states[0].layers.at(-1).offset,[0,0]);assert.deepEqual(dressed.states[0].layers.at(-1).offset,[-4,-7]);
 assert(!h.resolveSeparable({...q,item:15,equipment:{coat:151}}).states[0].layers.at(-1).offset);
 const images=new Map();for(let n=1;n<=5;n++){const c=cv.createCanvas(640,640),x=c.getContext('2d');x.fillStyle=n===5?'purple':'blue';x.fillRect(n===5?30:0,n===5?30:0,1,1);images.set('tools/rework-weapon-layers-hd/'+asset(n).url,c);}
 const c=cv.createCanvas(640,640),x=c.getContext('2d');h.render(x,dressed,images,{frame:0});assert.deepEqual([...x.getImageData(26,23,1,1).data],[128,0,128,255]);assert.equal(x.getImageData(30,30,1,1).data[3],0);
});
