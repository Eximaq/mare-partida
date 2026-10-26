const assert=require('node:assert/strict');
require('../paper-doll.js');require('../paper-doll-assets.js');
const review=require('../paper-doll-review.js');
const pack=require('../pixellab-pip-generations/paper-doll-rogue-20261025/review-pack.json');
assert(review.requested('?paperDollReview=rogue',true));
assert(!review.requested('?paperDollReview=rogue',false));
for(const factionId of Object.keys(MarePaperDollCatalog.factions)){
 const player={classId:'rogue',factionId,devSandbox:true,equipment:{weapon:{def:12}}};
 const before=JSON.stringify(player);
 assert.equal(review.appearance(pack,player).pieces.weapon,'rogue-weapon');
 assert.equal(JSON.stringify(player),before);
 player.equipment.weapon={def:0};assert.equal(review.appearance(pack,player),null);
 player.equipment.weapon={def:13};assert(review.appearance(pack,player).blocked.some(x=>x.code==='unmapped-equipment'));
 player.zoanTransformed=true;assert.equal(review.appearance(pack,player),null);
}
(async()=>{
 for(const mutate of [p=>p.classId='sword',p=>p.categoryWeapons.daggers='missing',p=>p.coverage['attack-daggers']=['east','east'],p=>p.rig.animations['attack-daggers'].frames=4]){
  const data=structuredClone(pack);mutate(data);
  const runtime=review.create({search:'?paperDollReview=rogue',devActive:true,baseURL:'http://localhost/',fetch:async()=>({ok:true,json:async()=>data}),getImage:()=>{throw Error('invalid manifest reached images')}});
  assert.equal((await runtime.ready).state,'failed');
 }
 console.log('Rogue review: explicit DEV gate, four factions, equipment mapping, Zoan and malformed manifest guards passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
