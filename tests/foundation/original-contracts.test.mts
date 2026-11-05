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
  assert.equal(E.hunt.rewards(area,{...profile,type:slot.type,district:slot.sector},profile.level).xp,Math.round(Math.round(profile.xp/10)*E.hunt.xpByMap(area)));
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
 assert.equal(require('../../contracts-board.js').periodConfig.daily.recurrence,'once');
});

test('daily objectives are stable, validate kill sources and require the sequential fallback',()=>{
 const D=require('../../contract-system.js'),profile={area:'beach',entry:1,region:'Dawn',type:'cesar',name:'César',level:5,maxHP:295,defense:17,magicDefense:8,gold:[22,35],travel:300,slots:14};
 const make=(prisonEligible:boolean)=>D.daily({cycle:10,level:5,cleared:0,seed:0,profiles:[profile,{...profile,entry:75,level:77,type:'satori'}],stats:{attack:70,speed:1.3,huntSpeed:130},prisonEligible});
 const d=make(false);assert.deepEqual(d,make(false));assert.equal(d.endsAt,11*86400000);
 const [combat,berry,fallback]=d.objectives;assert.equal(combat.type,'cesar');assert.equal(fallback.id,'daily-reinforcement');
 D.applyDaily(d,{area:'swamp',monster:{type:'cesar'},berry:100});assert.equal(berry.current,0);
 D.applyDaily(d,{area:'beach',monster:{type:'other'}});assert.equal(berry.current,0);
 const kill={area:'beach',monster:{type:'cesar'},berry:berry.target};
 combat.current=combat.target-1;D.applyDaily(d,kill);assert.equal(fallback.current,0);assert(!D.dailyComplete(d));
 for(let i=0;i<fallback.target;i++)D.applyDaily(d,kill);assert(D.dailyComplete(d));
 const p=make(true);assert.equal(p.objectives[2].id,'daily-reinforcement');
 p.objectives[2]={id:'daily-prison',floor:1,target:1,current:0};
 D.applyDaily(p,{prisonFloor:2});assert.equal(p.objectives[2].current,0);
 D.applyDaily(p,{prisonFloor:1});assert.equal(p.objectives[2].current,1);
 const client=require('../../apps/account-client/game-session.js');
 assert(client.validIntent('contract.claim',{contractId:'daily-reward'}));
 assert(client.validIntent('items.use-xp-boost',{itemId:'11111111-1111-4111-8111-111111111111'}));
});
