'use strict';
const assert=require('node:assert/strict');
require('../paper-doll.js');require('../paper-doll-assets.js');
const review=require('../paper-doll-review.js'),coverage=require('../paper-doll-coverage.js');
const pack=require('../pixellab-pip-generations/paper-doll-complete-20261026/review-pack.json');
assert(review.requested('?paperDollReview=complete',true));assert(!review.requested('?paperDollReview=complete',false));
const expected={sword:'complete-sword',brawler:undefined,gunner:'complete-firearm',rogue:'complete-daggers',cyborg:'complete-tech',strategist:'complete-compass',healer:'complete-staff'};
for(const [classId,c]of Object.entries(MarePaperDollCatalog.classes))for(const factionId of Object.keys(MarePaperDollCatalog.factions)){
 const player={classId,factionId,devSandbox:true,equipment:{weapon:classId==='brawler'?null:{def:c.weapon}}},before=JSON.stringify(player);
 const a=review.appearance(pack,player);assert.equal(a.pieces.body,'complete-body');assert.equal(a.pieces.weapon,expected[classId]);assert.equal(JSON.stringify(player),before);
 player.equipment.boots={def:8};assert(review.appearance(pack,player).blocked.some(x=>x.code==='unmapped-equipment'));
 player.zoanTransformed=true;assert.equal(review.appearance(pack,player),null);
}
const state=coverage.inspect(pack);assert.equal(state.missingAnatomyAndClothingFrames,0);assert.equal(state.missingWeaponLocomotionFrames,0);assert(Object.values(state.readyByCategory).every(Boolean));assert.equal(state.status,'awaiting-art-review');assert.equal(state.productionReady,false);
(async()=>{
 for(const mutate of [p=>p.completeCategories=false,p=>delete p.categoryWeapons.tech,p=>p.coverage['attack-focus']=['south'],p=>p.rig.animations['attack-tech'].frames=4,p=>p.productionEnabled=true]){
  const data=structuredClone(pack);mutate(data);const r=review.create({search:'?paperDollReview=complete',devActive:true,baseURL:'http://localhost/',fetch:async()=>({ok:true,json:async()=>data}),getImage:()=>{throw Error('invalid data reached images')}});assert.equal((await r.ready).state,'failed');
 }
 console.log('Complete shared package: 28 identities, equipment mapping, full basic coverage, explicit empty hands, normal-save/production gates and malformed manifest guards passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
