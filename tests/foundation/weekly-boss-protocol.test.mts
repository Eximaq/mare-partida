import {test} from 'node:test';
import assert from 'node:assert/strict';
import {characterCommandSchema} from '@mare/shared';
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
