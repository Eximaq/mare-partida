import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {characterCommandSchema} from '@mare/shared';
const {validIntent}=createRequire(import.meta.url)('../../apps/account-client/game-session.js');
const envelope={requestId:'11111111-1111-4111-8111-111111111111',expectedVersion:0,control:{epoch:1,token:'x'.repeat(43)},action:'weeklyBoss.execute'};
test('weekly boss accepts bounded intent but refuses client HP, rewards, clocks and identities',()=>{
 for(const payload of [{op:'test'},{op:'leave'},{op:'activate',revision:1},{op:'join',eventId:'11111111-1111-4111-8111-111111111111'},{op:'cancel',eventId:'11111111-1111-4111-8111-111111111111',version:1}]){
  assert(characterCommandSchema.safeParse({...envelope,payload}).success,'weekly boss intent must exist');
  for(const key of ['hp','damage','gold','experience','now','dt','ownerId','isAdmin','accountId','reward'])assert.equal(characterCommandSchema.safeParse({...envelope,payload:{...payload,[key]:1}}).success,false);
 }
});
test('official configuration cannot claim another map, permit infinite players or skip balance approval',()=>{
 const config={mapId:'marineford',spawn:{x:300,y:300},entry:{x:500,y:300},maxPlayers:4,minLevel:10,durationMinutes:60,balanceApproved:true,profile:{hp:10000,attack:50,defense:20,magicDefense:20,speed:80,reach:65,attackSec:2,aoeCooldown:8,aoeRadius:120,aoeWindup:1,aoeMultiplier:1.6,level:50,leash:480}};
 assert(characterCommandSchema.safeParse({...envelope,payload:{op:'configure',revision:1,config}}).success);
 for(const change of [{mapId:'dawn'},{maxPlayers:999},{balanceApproved:false}])assert.equal(characterCommandSchema.safeParse({...envelope,payload:{op:'configure',revision:1,config:{...config,...change}}}).success,false);
});

test('the weekly HUD and server agree on admiral commands and strict profile fields',()=>{
 const profile={speed:70,reach:65,attackSec:3,aoeCooldown:7,aoeWindup:1.2,level:180,leash:700};
 const config={mapId:'marineford',spawn:{x:1536,y:1280},entry:{x:1536,y:1824},maxPlayers:4,minLevel:1,durationMinutes:15,balanceApproved:true,profile};
 const id='11111111-1111-4111-8111-111111111111';
 const check=(payload:unknown,allowed:boolean)=>{
  assert.equal(characterCommandSchema.safeParse({...envelope,payload}).success,allowed,JSON.stringify(payload));
  assert.equal(!!validIntent(envelope.action,payload),allowed,JSON.stringify(payload));
 };
 for(const boss of [{},{bossId:'akainu'},{bossId:'aokiji'},{bossId:'kizaru'}]){
  check({op:'test',...boss},true);
  check({op:'activate',revision:1,...boss},true);
  check({op:'configure',revision:1,config,...boss},true);
 }
 const legacy={...config,profile:{...profile,hp:10000,attack:50,defense:20,magicDefense:20,aoeRadius:120,aoeMultiplier:1.6}};
 check({op:'configure',revision:1,config:legacy},true);
 for(const q of [{...profile,speed:undefined},{...profile,hp:1.5},{...profile,aoeRadius:241},{...profile,damage:1}]){
  check({op:'configure',bossId:'akainu',revision:1,config:{...config,profile:q}},false);
 }
 check({op:'configure',bossId:'ace',revision:1,config},false);
 check({op:'configure',bossId:'akainu',revision:1,config:{...config,balanceApproved:false}},false);
 check({op:'activate',bossId:'ace',revision:1},false);
 check({op:'test',bossId:'ace'},false);
 for(const payload of [{op:'join',eventId:id},{op:'leave'},{op:'cancel',eventId:id,version:1},{op:'join-swords'}]){
  check(payload,true);
  check({...payload,bossId:'akainu'},false);
 }
});
