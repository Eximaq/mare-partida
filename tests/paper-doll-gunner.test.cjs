const assert=require('node:assert/strict');
require('../paper-doll.js');require('../paper-doll-assets.js');
const review=require('../paper-doll-review.js');
const pack=require('../pixellab-pip-generations/paper-doll-gunner-20261025/review-pack.json');
assert(review.requested('?paperDollReview=gunner',true));
assert(!review.requested('?paperDollReview=gunner',false));
for(const factionId of Object.keys(MarePaperDollCatalog.factions)){
 const player={classId:'gunner',factionId,devSandbox:true,equipment:{weapon:{def:4}}};
 const before=JSON.stringify(player);
 assert.equal(review.appearance(pack,player).pieces.weapon,'gunner-weapon');
 assert.equal(JSON.stringify(player),before);
 player.equipment.weapon={def:0};assert.equal(review.appearance(pack,player),null);
 player.equipment.weapon={def:5};assert(review.appearance(pack,player).blocked.some(x=>x.code==='unmapped-equipment'));
 player.zoanTransformed=true;assert.equal(review.appearance(pack,player),null);
}
(async()=>{
 for(const mutate of [p=>p.classId='sword',p=>p.categoryWeapons.firearm='missing',p=>p.coverage['attack-firearm']=['east','east'],p=>p.rig.animations['attack-firearm'].frames=4]){
  const data=structuredClone(pack);mutate(data);
  const runtime=review.create({search:'?paperDollReview=gunner',devActive:true,baseURL:'http://localhost/',fetch:async()=>({ok:true,json:async()=>data}),getImage:()=>{throw Error('invalid manifest reached images')}});
  assert.equal((await runtime.ready).state,'failed');
 }
 console.log('Gunner review: explicit DEV gate, four factions, equipment mapping, Zoan and malformed manifest guards passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
