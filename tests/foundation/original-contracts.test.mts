import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
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
test('current common-island profiles preserve the audited balance independently of the new passive hooks',()=>{
 const h=require('../../hunt-system.js'),rows=[];
 for(const a of Object.keys(h.regions).filter(a=>a!=='skypiea-01'))for(const s of h.sectors(a))for(const t of Object.keys(h.archetypes))for(const roll of [0,.5,.999999]){
  // Boss profiles for islands with no boss were NaN before PR207 and are not spawnable.
  if(t==='boss'&&!Number.isFinite(h.regions[a].bossLevel))continue;
  try{rows.push([a,s.id,t,roll,h.profile(a,s.id,t,roll)]);}catch{}
 }
 assert.equal(rows.length,864);assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),'d4d1defa5c965a048f04e34c81fc22da4eb5613c50983123008cb95252a20065');

});
test('shared contracts preserve all ten original objectives, fixed rewards and once-only semantics',()=>{
 const c=require('../../contract-system.js');
 assert.deepEqual(c.quests.map((q:any)=>[q.id,q.target,q.stat??null,q.area??null,q.metric??null,q.gold,q.xp]),[
  ['crab',6,'crab',null,null,85,65],['bandit',5,'bandit',null,null,125,100],['boss',1,'boss',null,null,280,190],
  ['dawn-patrol',20,null,'beach','kills',150,200],['dawn-clear',1,null,'beach','bosses',300,450],
  ['conchas-patrol',30,null,'swamp','kills',450,800],['conchas-clear',1,null,'swamp','kills',160,240],
  ['orange-patrol',40,null,'orange','kills',900,1600],['orange-clear',12,null,'orange','kills',450,800],
  ['rare-patrol',20,null,'rare','kills',1200,2200]]);
 for(const q of c.quests){assert(Object.isFrozen(q));assert.equal(c.progress({stats:{crab:2},hunts:{areas:{beach:{kills:7}}}},q),q.stat==='crab'?2:q.id==='dawn-patrol'?7:0);}
 assert.deepEqual(c.matching({area:'beach',monster:{type:'boss'}}).map((q:any)=>q.id),['boss','dawn-patrol','dawn-clear']);
 assert.deepEqual(c.matching({area:'swamp',monster:{type:'bandit'}}).map((q:any)=>q.id),['bandit','conchas-patrol','conchas-clear']);
 assert.equal(require('../../contracts-board.js').periodConfig.daily.recurrence,'once');
});
