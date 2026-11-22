'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(R+'/'+f);
const {resolveAuditedWorldSlotPlan:plan}=get('player-rework-modular-outfits-hd.js');
assert.equal(typeof plan,'function');
const requested={weapon:{item:114,key:'weapon'},pants:{item:21,key:'legs'},boots:{item:9,key:'boots'}};
const weapon={item:114,quality:'hd',source:'exact-weapon'};
const hd={state:'hd',source:'pants21-own-animation'},missing={state:'no-compatible-pass',reason:'no-signed-pose-pass',authority:'signed-N-receiver'};
const audited=(boots,extra={})=>plan({requested,weapon,outcomes:{pants:hd,boots},allowOmission:true,...extra});
let r=audited(missing);assert(r.ready&&!r.complete);assert.deepEqual(r.omitted,['boots']);
assert.deepEqual(r.slotRoutes,{weapon,legs:{item:21,quality:'hd',source:hd.source},boots:{item:9,quality:'missing',reason:missing.reason}});
assert.equal(r.slotResolution.boots.authority,missing.authority);
assert.equal(audited(missing,{allowOmission:false}).ready,false);
assert.equal(audited(missing,{protectedSubset:omitted=>omitted.includes('boots')}).ready,false);
for(const state of ['unknown','conflict']){const x=audited({state,reason:'own-provider-cannot-attest'});
 assert.equal(x.slotResolution.boots.state,state);assert(!x.ready);assert.deepEqual(x.omitted,[]);}
const fake=audited({state:missing.state,reason:missing.reason});
assert.equal(fake.slotResolution.boots.state,'unknown');assert(!fake.ready);assert.deepEqual(fake.omitted,[]);
assert.equal(audited(missing,{weapon:{...weapon,item:115}}),null);

const W=get('paper-doll-96-lobby.js'),A=get('character-appearance.js'),{make}=get('tests/rework-integration-support.cjs');
const api=make(),cat=get('tools/paper-doll-96-v3/weapons.json'),actor=(e,look={})=>({classId:'gunner',
 appearance96:A.normalize({gender:'masculino',...look}),equipment:{weapon:{def:114},...e}}),opts={direction:'south',action:'attack-firearm',consumer:'world'};
(async()=>{
 await api.ready;
 const carrier=actor({legs:{def:22},boots:{def:9}}),withMissing=actor({...carrier.equipment,head:{def:164}}),snapshot=JSON.stringify(withMissing),
  bare=api.selectVisual(actor({}),opts),complete=api.selectVisual(carrier,opts),partial=api.selectVisual(withMissing,opts);
 assert(complete?.slotResolution&&partial?.slotResolution);
 assert.equal(partial.slotResolution.head.state,'no-compatible-pass');
 assert.deepEqual(partial.slotResolution.legs,complete.slotResolution.legs);
 assert.deepEqual(partial.slotResolution.boots,complete.slotResolution.boots);
 assert.deepEqual(partial.omitted,['head']);
 assert.equal(api.selectVisual(withMissing,opts,false),null);
 assert.deepEqual(partial.states,bare.states);assert.deepEqual(partial.timeline,bare.timeline);assert.equal(partial.fps,bare.fps);
 assert.deepEqual(partial.colorAppearance,bare.colorAppearance);
 for(const action of ['attack','skill'])assert.equal(W.selectWorldHD(api,cat,withMissing,{...opts,action}).id,partial.id);
 assert(!api.selectVisual(actor({boots:{def:999999},legs:{def:22}}),opts)?.slotFallback);
 assert(!api.selectVisual(actor({boots:{def:22},legs:{def:22}}),opts)?.slotFallback);
 assert(!api.selectVisual(actor({boots:{def:9,variant:'other'},legs:{def:22}}),opts)?.slotFallback);
 assert(!api.selectVisual(withMissing,{...opts,weaponless:true})?.slotFallback);
 const hidden={...withMissing,preferences:{hideHeadgear:true}};
 assert.deepEqual(api.selectVisual(hidden,opts).slotResolution,complete.slotResolution);
 assert.equal(JSON.stringify(withMissing),snapshot);
 // Legacy outfit explicitly omitted a keyed glove and must not be
 // promoted to the new certified signed-pose status.
 const legacy={classId:'brawler',appearance96:{gender:'masculino',skin:'original',hair:'original'},
  equipment:{coat:{def:151},legs:{def:133},boots:{def:155},gloves:{def:999999}}};
 const out=api.selectVisual(legacy,{...opts,direction:'north',action:'walk'},false);
 assert.deepEqual(out?.omitted,['gloves']);assert.equal(out.slotResolution,undefined);
 console.log('PASS shared audited slot states, subset protection, invalid item hold, W114 source/clock and omission boundary');
})().catch(e=>{console.error(e);process.exitCode=1});
