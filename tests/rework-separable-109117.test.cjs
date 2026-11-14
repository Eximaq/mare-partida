'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const{make,cv}=require('./rework-integration-support.cjs'),index=require('../tools/rework-weapon-layers-hd/index.json'),api=require('../player-rework-weapon-native-hd.js');
const fixture=require('./fixtures/separable-109117-sources.json');
test('109/117 preserve authored gear, shared rig and independent coats in normal runtime',async()=>{
 const world=make();await world.ready;const h=api.create(index,{makeCanvas:cv.createCanvas}),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 const zip=await require('../player-rework-zip.js').loadArchive(fs.readFileSync(path.join(__dirname,'fixtures/separable-109117-sources.zip')),fixture.fixtureZIP);
 const original=async(item,n)=>{const bytes=await zip.read(item+'/'+n);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),fixture[item].members[item+'/'+n]);return cv.loadImage(Buffer.from(bytes));};
 let cases=0;
 for(const item of [109,117])for(const direction of ['east','west']){
  const bareFrames=new Map();
  for(const coat of [undefined,151,158,165,179]){
   const p={appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'},equipment:{weapon:{def:item},...(coat?{coat:{def:coat}}:{})}},pose={consumer:'world',action:'attack-unarmed',direction};
   const r=world.select(p,pose);assert(r?.separableAttack,'must not route into legacy baked outfits');assert.equal(r.item,item);assert.equal(r.timeline.length,20);assert.equal(r.fps,12);
   assert.deepEqual(r.equipmentContract,{weapon:item,...(coat?{coat}:{})});assert(await world.prepareClip(p,pose));
   const images=new Map(await Promise.all(h.requiredFiles(r).map(async f=>[f,await load(f)])));
   for(let frame=0;frame<8;frame++){
    const c=cv.createCanvas(640,640),x=c.getContext('2d');h.render(x,r,images,{frame});const actual=x.getImageData(0,0,640,640).data;
    const gear=cv.createCanvas(640,640).getContext('2d');gear.drawImage(images.get('tools/rework-weapon-layers-hd/'+index.separableAttackRigs.find(s=>s.directions[direction].weapons[item]).directions[direction].weapons[item][frame].url),0,0);const mask=gear.getImageData(0,0,640,640).data;
    if(!coat){
     bareFrames.set(frame,actual);const ref=cv.createCanvas(640,640).getContext('2d');if(direction==='west'){ref.translate(640,0);ref.scale(-1,1);}
     if(item===117)ref.drawImage(await original(item,'original/117/v1/east/frames/'+String(frame).padStart(2,'0')+'.png'),0,0);
     else for(const layer of ['base','far','near'])ref.drawImage(await original(item,'inputs/'+String(frame).padStart(2,'0')+'-'+layer+'.png'),0,0);
     const expected=ref.getImageData(0,0,640,640).data;for(let n=0;n<actual.length;n++)assert(n%4===3?actual[n]===expected[n]:Math.abs(actual[n]-expected[n])<=1,'original source '+item+'/'+direction+'/'+frame+' byte'+n);
    }else{
     const coatOnly={...r,states:r.states.map(s=>({...s,layers:s.layers.slice(0,-1)}))},before=cv.createCanvas(640,640).getContext('2d');h.render(before,coatOnly,images,{frame});const without=before.getImageData(0,0,640,640).data,bare=bareFrames.get(frame);
     for(let n=0;n<actual.length;n+=4)for(let q=0;q<4;q++)assert.equal(actual[n+q],mask[n+3]?bare[n+q]:without[n+q],mask[n+3]?'authored gear must not change':'outside gear coat must not change');
    }
    if(coat){
     const ref=cv.createCanvas(640,640).getContext('2d');if(direction==='west'){ref.translate(640,0);ref.scale(-1,1);}ref.drawImage(await original(item,(item===117?'male/':'')+coat+'/'+frame+'-east.png'),0,0);
     const expected=ref.getImageData(0,0,640,640).data;
     //Source-original sleeves must cover the same body. Any newly exposed skin
     //would fail this full raster/alpha check, notably phases0/4/7.
     for(let n=0;n<actual.length;n++)assert(n%4===3?actual[n]===expected[n]:Math.abs(actual[n]-expected[n])<=1,'approved sleeve '+item+'/'+coat+'/'+direction+'/'+frame+' byte'+n);
    }
    assert(world.draw(cv.createCanvas(640,640).getContext('2d'),p,{...pose,progress:(frame+.1)/20,x:320,y:512}));cases++;
   }
   for(const slot of ['gloves','head','legs','boots','cloak'])assert(!world.select({...p,equipment:{...p.equipment,[slot]:{def:152}}},pose)?.separableAttack,slot);
   assert(!world.select({...p,__reworkSubset:true},pose)?.separableAttack);
   for(const action of ['walk','idle','attack-focus','attack-firearm'])assert(!world.select(p,{...pose,action})?.separableAttack,action);
  }
 }
 assert.equal(cases,160);
});
