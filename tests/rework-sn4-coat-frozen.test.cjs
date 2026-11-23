'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');
const {referenceApi}=require('./rework-south-neck-reference.cjs');
async function bind(api,player,options){
 const source=api.select(player,options);
 assert(source);
 return api.prepareConfiguration([{player,source,options}],{resolve:pose=>pose});
}
function pixels(bundle,player,options,tick){
 const c=cv.createCanvas(512,512),x=c.getContext('2d');
 x.scale(374/105,374/105);
 assert(bundle.draw(x,player,{...options,progress:(tick+.01)/40,x:256*105/374,y:448*105/374}));
 const bytes=Buffer.from(x.getImageData(0,0,512,512).data);c.width=1;return bytes;
}
test('eight frozen coats retain their original cloth and the approved saved neck palette in all eight poses',async()=>{
 const current=make();await current.ready;
 const old=await referenceApi(false),corrected=await referenceApi(true),options={action:'walk',direction:'south'};
 const looks=[{gender:'female',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'},
  {gender:'female',hairStyle:'hair-cropped',hairColor:'blonde',eyeStyle:'face-gentle',eyeColor:'amber',skinColor:'olive'}];
 let count=0;
 for(const coat of [6,7,137,144,158,165,172,179])for(const appearance96 of looks){
  const player={classId:'sword',appearance96,equipment:{coat:{def:coat}}},donor={...player,__southAnatomy:true};
  const spec=current.select(player,options)?.authoredPantsLayer?.spec;assert(spec);
  const [active,historical,expected,frozen]=await Promise.all([[current,player],[old,player],[corrected,player],[current,donor]].map(([api,p])=>bind(api,p,options)));
  try{
   for(const k of [0,1,2,3,5,6,7,8]){
    const t=spec.frameToPhase.indexOf(k),f=spec.phaseMap[k]*5;
    assert(pixels(historical,player,options,t).equals(pixels(frozen,donor,options,f)),coat+' original frame '+k);
    assert(pixels(active,player,options,t).equals(pixels(expected,player,options,t)),coat+' saved neck frame '+k);
    count++;
   }
  }finally{for(const bundle of [active,historical,expected,frozen])bundle.release();}
 }
 assert.equal(count,128);
});

test('source records remain exact and every individual cosmetic choice retains the bridge',async()=>{
 const {createHash}=require('node:crypto'),proof=require('./fixtures/sn4-eight-coat-sources.json');
 const index=require('../tools/rework-modular-outfits-hd/index.json'),{choices}=require('../character-appearance.js');
 const prior=require('./sn4-preservation.cjs').reviewedExtensions(structuredClone(index));
 const hash=value=>createHash('sha256').update(value).digest('hex');
 for(const id of ['147','168','182']){
  assert(prior.authoredPantsSouth.items[id]);delete prior.authoredPantsSouth.items[id];
 }
 const added=prior.authoredPantsSouth.layers.filter(l=>l.item===130);
 assert.deepEqual(added.map(l=>l.id),['coat130-rear-torso','coat130-front-leftUpper','coat130-front-rightUpper',
  'visible-original-hands','coat130-front-original-proportion-core','coat130-front-own-proportion-side-root-lining']);
 prior.authoredPantsSouth.layers=prior.authoredPantsSouth.layers.filter(l=>l.item!==130);
 assert.equal(hash(JSON.stringify(prior)+'\n'),proof.indexCanonicalSHA256BeforeSouthExtension);
 for(const p of proof.records)assert.equal(hash(JSON.stringify(index.records.find(r=>r.id===p.id))),p.sha256);
 const api=make();await api.ready;
 const original={gender:'female',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'};
 const actor={classId:'sword',appearance96:original,equipment:{}},o={action:'walk',direction:'south'};
 let count=0;
 for(const {item} of proof.records){
  actor.equipment={legs:{def:175},coat:{def:item},boots:{def:155},gloves:{def:152}};
  for(const field of ['skinColor','hairColor','eyeColor','hairStyle','eyeStyle'])for(const value of Object.keys(choices[field])){
   actor.appearance96={...original,[field]:value};
   assert.equal(api.select(actor,o)?.authoredPantsLayer?.mappedCoat?.sourceId,'female-torso'+item+'-south-frozen-walk-native');count++;
  }
 }
 assert.equal(count,344);
 for(const e of [{coat:{def:130,variant:'blue'}},{boots:{def:9}},{gloves:{def:25}},{coat:{def:6,variant:'blue'}}]){
  actor.equipment={legs:{def:175},...e};assert(!api.select(actor,o)?.authoredPantsLayer);
 }
 actor.equipment={legs:{def:175},weapon:{def:0}};
 const armed=api.select(actor,o);assert.equal(armed?.carrySouth?.item,0);assert.equal(armed.authoredPantsLayer.item,175);
});
