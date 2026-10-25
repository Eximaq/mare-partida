const assert=require('node:assert/strict');
require('../paper-doll.js');require('../paper-doll-assets.js');
const review=require('../paper-doll-review.js');
const pack=require('../pixellab-pip-generations/paper-doll-unarmed-combat-20261024/review-pack.json');
assert(review.requested('?paperDollReview=unarmed',true));
assert(!review.requested('?paperDollReview=unarmed',false));
for(const cls of Object.keys(MarePaperDollCatalog.classes))for(const faction of Object.keys(MarePaperDollCatalog.factions)){
 const p={classId:cls,factionId:faction,equipment:{},devSandbox:true};const before=JSON.stringify(p);
 assert.equal(review.appearance(pack,p).pieces.body,'unarmed-body');assert.equal(JSON.stringify(p),before);
 p.equipment.weapon={def:MarePaperDollCatalog.classes[cls].weapon};assert.equal(review.appearance(pack,p),null);
 p.equipment={};p.zoanTransformed=true;assert.equal(review.appearance(pack,p),null);
}
(async()=>{
 for(const mutate of [p=>p.unarmedOnly=false,p=>p.coverage.idle=['south'],p=>p.coverage['attack-unarmed']=['south','south'],p=>p.rig.animations['attack-unarmed'].frames=4]){
  const data=structuredClone(pack);mutate(data);
  const r=review.create({search:'?paperDollReview=unarmed',devActive:true,baseURL:'http://localhost/',fetch:async()=>({ok:true,json:async()=>data}),getImage:()=>{throw Error('invalid manifest must fail before images')}});
  assert.equal((await r.ready).state,'failed');
 }
 console.log('Unarmed review: legacy visual clock, frame coverage, 28 identities, equipment/Zoan guards and malformed manifest passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
