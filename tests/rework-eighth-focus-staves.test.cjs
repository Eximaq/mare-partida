'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {make,cv}=require('./rework-integration-support.cjs');
const look={gender:'male',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'};
const catalog=require('../item-catalog').create({forge:require('../forge-system'),prison:require('../prison-system'),haki:require('../haki-system'),akuma:require('../akuma-system'),hakiProgression:require('../haki-progression')}).items;
test('five original staves select independent ordered focus only for proven appearance and bare slots',async()=>{
 const world=make();await world.ready;
 for(const item of [123,124,125,126,127])for(const direction of ['east','west']){
  assert.equal(catalog[item].slot,'weapon');assert.equal(catalog[item].type,item<=124?'strategist':'healer');
  const p={classId:catalog[item].type,appearance96:look,equipment:{weapon:{def:item}}},o={action:'attack-focus',direction,consumer:'world'},r=world.select(p,o);
  assert.equal(r?.id,`authored-ordered-${item}-${direction}`);assert(r.orderedAttack);assert.equal(r.phaseCount,8);assert.equal(r.fps,12);assert.equal(r.contactTick,4);assert.deepEqual(r.equipmentContract,{weapon:item});
  for(const s of r.states){const gear=s.layers.find(l=>l.component==='equipment');assert(gear);assert(s.layers.find(l=>l.id==='grip').depth>gear.depth);assert(s.layers.find(l=>l.id==='headBase').depth>gear.depth);}
  for(const slot of ['coat','legs','boots','gloves','head','cloak','unknown'])assert(!world.select({...p,equipment:{...p.equipment,[slot]:{def:151}}},o)?.orderedAttack,slot);
  for(const q of [{__reworkSubset:true},{appearance96:{...look,gender:'female'}},{appearance96:{...look,hairColor:'pink'}}])assert(!world.select({...p,...q},o)?.orderedAttack);
  for(const action of ['idle','walk','attack-unarmed'])assert(!world.select(p,{...o,action})?.orderedAttack);
  for(const d of ['north','south'])assert(!world.select(p,{...o,direction:d})?.orderedAttack);
  assert(!world.select(p,{...o,weaponless:true})?.orderedAttack);
 }
});
test('80 original lateral staff frames preserve alpha geometry and original depth within Canvas RGB rounding',async()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),index=require('../tools/rework-weapon-layers-hd/index.json'),api=require('../player-rework-weapon-native-hd.js').create(index,{makeCanvas:cv.createCanvas}),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 const proof=require('../tools/rework-weapon-layers-hd/eighth-staff-source-proof.json'),archive=proof.manifest.archives[1],raw=fs.readFileSync(path.join(__dirname,'fixtures',archive.file));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),archive.sha256);const zip=await require('../player-rework-zip.js').loadArchive(raw,archive.sha256);let count=0,maxDelta=0;
 for(const r of index.orderedAttackProfiles.filter(r=>r.item>=123&&r.item<=127)){
  const images=new Map(await Promise.all(api.requiredFiles(r).map(async p=>[p,await load(p)])));
  for(let frame=0;frame<8;frame++){
   const source=await zip.read(`${r.item}/${r.direction}/${String(frame).padStart(2,'0')}.png`);assert.equal(crypto.createHash('sha256').update(source).digest('hex'),r.states[frame].approvedReferenceSHA256);
   const a=cv.createCanvas(640,640).getContext('2d'),b=cv.createCanvas(640,640).getContext('2d');api.render(a,r,images,{frame});b.drawImage(await cv.loadImage(Buffer.from(source)),0,0);const x=a.getImageData(0,0,640,640).data,y=b.getImageData(0,0,640,640).data;
   for(let n=0;n<x.length;n++){const delta=Math.abs(x[n]-y[n]);if(n%4===3)assert.equal(delta,0,`alpha ${r.id}/${frame}`);else assert(delta<=1,`RGB ${r.id}/${frame} byte${n} delta${delta}`);maxDelta=Math.max(maxDelta,delta);}count++;
  }
 }assert.equal(count,80);console.log('EIGHTH_RASTER',JSON.stringify({frames:count,maxDelta}));
});
