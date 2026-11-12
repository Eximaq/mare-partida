import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {characterCommandSchema} from '../../packages/shared/src/index.js';
const require=createRequire(import.meta.url);
const command={requestId:'11111111-1111-4111-8111-111111111111',expectedVersion:0,control:{epoch:1,token:'x'.repeat(43)},action:'contract.claim',payload:{contractId:'crab'}};
test('contract intent contains only a canonical ID, never progress, ownership or reward values',()=>{
 const client=require('../../apps/account-client/game-session.js');
 assert(characterCommandSchema.safeParse(command).success);
 assert(client.validIntent(command.action,command.payload));
 for(const extra of ['gold','xp','count','progress','claimed','accountId','ownerId','characterId','resetAt']){
  const payload={...command.payload,[extra]:999};
  assert(!characterCommandSchema.safeParse({...command,payload}).success);
  assert(!client.validIntent(command.action,payload));
 }
 for(const contractId of ['weekly','__proto__','crab\u0000',"crab' OR 1=1",'CRAB'])assert(!characterCommandSchema.safeParse({...command,payload:{contractId}}).success);
});
test('every authored common monster gets deterministic points and the new attack interval',()=>{
 const E=require('../../world-battle.cjs'),C=require('../../character-system.js'),B=require('../../monster-behavior.js'),raw=require('../../monster-catalog.js');
 for(const area of Object.keys(E.hunt.regions))for(const slot of B.slots(area).filter((s:any)=>!s.boss)){
  const profile=E.hunt.profile(area,slot.sector,slot.type,0),base=raw[slot.type];
  assert.deepEqual(profile,E.hunt.profile(area,slot.sector,slot.type,.999));
  assert.equal(profile.attributePoints,3*C.earned(base.level));
  assert.equal(profile.attackSec,base.attack_seconds/2.25);
  assert.equal(profile.speed,base.move_speed*2);
  assert.equal(profile.accuracy,1);
  assert.equal(profile.defense,Math.round(Math.round((base.physical_defense+.24*profile.attributes.defense)*1.3)*1.2));
  assert.equal(profile.magicDefense,Math.round(base.magic_defense*1.2));
  assert.equal(E.hunt.rewards(area,{...profile,type:slot.type,district:slot.sector},profile.level).xp,2*Math.round(Math.round(profile.xp/10)*E.hunt.xpByMap(area)));
 }
});
test('shared contracts preserve original IDs, fixed rewards and migrated once-only objectives',()=>{
 const c=require('../../contract-system.js');
 assert.deepEqual(c.quests.map((q:any)=>[q.id,q.target,q.stat??null,q.area??null,q.metric??null,q.gold,q.xp]),[
  ['crab',6,null,'beach','kills',85,65],['bandit',5,null,'swamp','kills',125,100],['boss',1,'boss',null,null,280,190],
  ['dawn-patrol',20,null,'beach','kills',150,200],['dawn-clear',1,null,'beach','bosses',300,450],
  ['conchas-patrol',30,null,'swamp','kills',450,800],['conchas-clear',1,null,'swamp','kills',160,240],
  ['orange-patrol',40,null,'orange','kills',900,1600],['orange-clear',12,null,'orange','kills',450,800],
  ['rare-patrol',20,null,'rare','kills',1200,2200]]);
 for(const q of c.quests){assert(Object.isFrozen(q));assert.equal(c.progress({stats:{crab:2},hunts:{areas:{beach:{kills:7}}}},q),['crab','dawn-patrol'].includes(q.id)?7:0);}
 assert.deepEqual(c.matching({area:'beach',monster:{type:'boss'}}).map((q:any)=>q.id),['crab','boss','dawn-patrol','dawn-clear']);
 assert.deepEqual(c.matching({area:'swamp',monster:{type:'helmeppo'}}).map((q:any)=>q.id),['bandit','conchas-patrol','conchas-clear']);
 assert.equal(require('../../contracts-board.js').periodConfig.journey.recurrence,'once');
});

test('daily and weekly targets use the measured rates and preserve issued progress',()=>{
 const D=require('../../contract-system.js'),input={cycle:10,level:35};
 const daily=D.daily(input),weekly=D.weekly(input);
 assert.deepEqual(daily,D.daily(input));assert.equal(daily.endsAt,11*86400000);
 assert.equal(daily.objectives[0].target,1080);
 assert.deepEqual(weekly.objectives.map((q:any)=>q.target),daily.objectives.map((q:any)=>7*q.target));
 const kill={area:'other',monster:{type:'other',level:20},berry:100,reward:{}};
 D.applyDaily(daily,kill);D.applyDaily(weekly,kill);
 assert.deepEqual(daily.objectives.map((q:any)=>q.current),[0,0]);
 assert.deepEqual(weekly.objectives.map((q:any)=>q.current),[1,100]);
 D.applyDaily(daily,{...kill,monster:{...kill.monster,level:35}});
 assert.deepEqual(daily.objectives.map((q:any)=>q.current),[1,100]);
 assert.equal(D.rebalanceDaily(daily,{...input,level:80}),daily);
 const cyborg={...input,classId:"cyborg"};
 assert.equal(D.daily(cyborg).objectives[0].target,324);
 assert.equal(D.weekly(cyborg).objectives[0].target,2268);
 const old={...daily,revision:undefined,objectives:[...daily.objectives,{id:'daily-reinforcement',current:3}]};
 assert.equal(D.rebalanceDaily(old,input).objectives[0].current,4);
 const client=require('../../apps/account-client/game-session.js');
 for(const id of ['daily-reward','weekly-reward'])assert(client.validIntent('contract.claim',{contractId:id}));
 assert(client.validIntent('items.use-xp-boost',{itemId:'11111111-1111-4111-8111-111111111111'}));
});
