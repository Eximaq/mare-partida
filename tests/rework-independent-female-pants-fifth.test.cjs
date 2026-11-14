'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path');
const{make}=require('./rework-integration-support.cjs'),api=require('../player-rework-modular-outfits-hd.js');
const appearance={hair:'original',hairColor:'brown',face:'original',eyeColor:'brown',skin:'light'};
const fixture={schema:'independent-female-pants-v1',records:[168].flatMap(item=>['east','west'].map(direction=>({id:'independent-female-pants'+item+'-'+direction+'-walk',item,body:'female',direction,action:'walk',equipment:{pants:item},approvedAppearance:appearance,sourceRefs:[],pack:{density:4,frame:{width:128,height:128},pivot:{x:64,y:112},directions:{[direction]:{clip:{frames:40,fps:40,loop:true},rest:{},poses:Array.from({length:40},()=>({})),layers:[]}}}})))};
test('independent female pants require exact original sources without consuming other slots',()=>{
 const h=api.create({schema:'rework-modular-outfits-hd-v1',records:[],independentPants:fixture});
 for(const item of [168])for(const direction of ['east','west']){
  const q={body:'female',direction,action:'walk',equipment:{legs:{def:item}},appearance};
  const r=h.resolveIndependentPants?.(q);assert(r?.independentPants);assert.equal(r.id,'independent-female-pants'+item+'-'+direction+'-walk');assert.equal(r.pack.directions[direction].clip.frames,40);
  for(const slot of ['coat','gloves','boots','head','weapon','cloak','unknown'])assert.equal(h.resolveIndependentPants({...q,equipment:{...q.equipment,[slot]:{def:152}}}),null);
  assert.equal(h.resolveIndependentPants({...q,appearance:{...appearance,hairColor:'pink'}}),null);assert.equal(h.resolveIndependentPants({...q,body:'male'}),null);
  for(const action of ['idle','attack-unarmed'])assert.equal(h.resolveIndependentPants({...q,action}),null);
 }
});
test('normal female walk routes independent pants only before any equipment subset fallback',async()=>{
 const world=make({fetchJSON:async p=>{const f=path.join(__dirname,'..',p),data=JSON.parse(fs.existsSync(f)?fs.readFileSync(f):require('node:zlib').gunzipSync(fs.readFileSync(f+'.gz')));return p==='tools/rework-modular-outfits-hd/index.json'?{...data,independentPants:fixture}:data;}});await world.ready;
 const p={appearance96:{gender:'female',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'},equipment:{legs:{def:168}}},o={consumer:'world',action:'walk',direction:'east'};
 assert(world.select(p,o)?.independentPants);assert(!world.select({...p,__reworkSubset:true},o)?.independentPants);
 for(const slot of ['gloves','boots','cloak','head','weapon'])assert(!world.select({...p,equipment:{...p.equipment,[slot]:{def:152}}},o)?.independentPants);
});
test('all80 production walking ticks reproduce24 independent source renders with original per-item bases and approved mirrors',async()=>{
 const{cv}=require('./rework-integration-support.cjs'),crypto=require('node:crypto'),proof=require('./fixtures/independent-female-pants-fifth-approved.json'),zip=await require('../player-rework-zip.js').loadArchive(fs.readFileSync(path.join(__dirname,'fixtures/independent-female-pants-fifth-approved.zip')),proof.fixtureZIP),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 const index=JSON.parse(fs.readFileSync(path.join(__dirname,'../tools/rework-modular-outfits-hd/index.json'))),h=api.create(index),world=make();await world.ready;
 const timeline=[2,5,4,1,5,3,2,5,3,2,5,3].flatMap((n,i)=>Array(n).fill(i));assert.equal(timeline.length,40);let ticks=0;
 for(const item of [168])for(const direction of ['east','west']){
  const p={appearance96:{gender:'female',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'},equipment:{legs:{def:item}}},o={consumer:'world',action:'walk',direction},r=world.select(p,o);assert(r?.independentPants);assert.equal(r.pack.directions[direction].clip.fps,40);assert.deepEqual(r.pack.pivot,{x:64,y:112});assert(await world.prepareClip(p,o));
  const images=new Map(await Promise.all(h.requiredFiles(r).map(async f=>[f,await load(f)]))),refs=new Map();
  for(let phase=0;phase<12;phase++){const name=item+'-'+direction+'-'+phase+'-composition.png',raw=await zip.read(name);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),proof.members[name]);const c=cv.createCanvas(512,512).getContext('2d');c.drawImage(await cv.loadImage(Buffer.from(raw)),0,0);refs.set(phase,c.getImageData(0,0,512,512).data);}
  for(let tick=0;tick<40;tick++){
   const c=cv.createCanvas(512,512).getContext('2d');h.render(c,r,images,{frame:tick,makeCanvas:cv.createCanvas});assert.deepEqual(c.getImageData(0,0,512,512).data,refs.get(timeline[tick]),'approved '+item+'/'+direction+'/tick'+tick);
   assert(world.draw(cv.createCanvas(512,512).getContext('2d'),p,{...o,progress:(tick+.1)/40,x:256,y:448}));ticks++;
  }
  assert(!world.select({...p,equipment:{}},o)?.independentPants);
 }
 assert.equal(ticks,80);
});
