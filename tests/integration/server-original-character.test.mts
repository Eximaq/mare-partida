import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {authDatabase} from './auth-support.mjs';
const require=createRequire(import.meta.url),characters=require('../../character-system.js'),rules=require('../../character-catalog.js');
const forge=require('../../forge-system.js');
const definitions=require('../../item-catalog.js').create({forge,prison:require('../../prison-system.js'),haki:require('../../haki-system.js'),akuma:require('../../akuma-system.js'),hakiProgression:require('../../haki-progression.js')}).items;
async function actor(service:any,classId='sword',factionId='pirate'){
 const session=await service.login(randomUUID()+'@example.invalid','fixture');
 const character=await service.createCharacter(session.token,{name:'Original',classId,factionId});
 const lease=await service.acquireControl(session.token,character.id);
 const input=(action:string,version:number,payload:any={})=>({action,expectedVersion:version,payload,requestId:randomUUID(),control:{epoch:lease.epoch,token:lease.token}});
 const send=(command:any)=>service.command(session.token,character.id,command);
 const read=()=>service.onlineState(session.token,character.id);
 return {session,character,input,send,read};
}
test('all original classes and factions derive current server-owned equipment with the original formulas',async()=>authDatabase(async({service,pool})=>{
 const catalog=rules.create({characters});
 for(const cls of Object.keys(catalog.classes))for(const faction of Object.keys(catalog.factions)){
  const a=await actor(service,cls,faction);await a.send(a.input('items.initialize',0));
  const o:any=await a.read(),f=o.combatPreview;
  assert.equal(f.rulesetId,'original-character-v1');assert.equal(f.factionId,faction);
  const expected=characters.derive({classId:cls,level:1,attributes:characters.empty()},catalog.classes[cls],catalog.factions[faction],forge.aggregate(o.originalInventory.equipment,definitions));
  for(const [key,value] of Object.entries(expected))assert.deepEqual(f.stats[key],value,cls+'/'+faction+'/'+key);
  assert.equal(f.maxHp,expected.maxHP);assert.equal(f.cooldownMs,Math.ceil(1000/expected.speed));
 }
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.game_inventory')).rows[0].n,28);
}));
test('server XP crosses the old level20 ceiling and grants points once without importing any client progress',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(a.input('items.initialize',0));await a.send(a.input('journey.begin',1));await a.send(a.input('hunt.begin',2));
 const threshold=18209+rules.xpNeeded(20);
 await pool.query('UPDATE mare_game.character_progression SET level=20,level_start_experience=18209,experience=$1 WHERE character_id=$2',[String(threshold-20),a.character.id]);
 await pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds' WHERE character_id=$1",[a.character.id]);
 const request=a.input('hunt.claim',3),paid=await a.send(request);
 assert.equal(paid.state.level,21);assert.equal(paid.state.experience,String(threshold));
 assert.deepEqual(await a.send(request),paid);
 const before:any=await a.read();assert.equal(before.progression.catalogId,'original-levels-v1');assert.equal(before.progression.maxLevel,null);
 assert.equal(before.progression.xpIntoLevel,'0');assert.equal(before.attributes.earned,100);
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_level_ledger WHERE character_id=$1 AND level=21',[a.character.id])).rows[0].n,1);
}));
test('new original battle snapshots keep HP above300 and freeze formulas after later allocation',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service,'cyborg','marine');await a.send(a.input('items.initialize',0));
 await a.send(a.input('journey.begin',1));await a.send(a.input('hunt.begin',2));
 await pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds' WHERE character_id=$1",[a.character.id]);
 await a.send(a.input('hunt.claim',3));
 const begin=await a.send(a.input('combat.begin',4));assert(begin.combat.playerMaxHp>300);
 const persisted=JSON.stringify(begin.combat.fighter);
 await pool.query('UPDATE mare_game.character_progression SET level=2,level_start_experience=80,experience=80 WHERE character_id=$1',[a.character.id]);
 await a.send(a.input('attributes.allocate',5,{allocation:{strength:0,dexterity:0,vitality:5,intelligence:0,spirit:0}}));
 const current:any=await a.read();assert.equal(JSON.stringify(current.combat.fighter),persisted);
 assert(current.combatPreview.maxHp>current.combat.playerMaxHp);
 await pool.query("UPDATE mare_game.combat_encounters SET next_attack_at=clock_timestamp()-interval '1 second' WHERE character_id=$1",[a.character.id]);
 const round=await a.send(a.input('combat.attack',6));assert.equal(round.combat.fighter.rulesetId,'original-character-v1');
 assert(round.combat.playerHp<=begin.combat.playerMaxHp);
}));

for(const same of [true,false])test(`level21 allocation ${same?'replays':'conflicts'} under concurrency and refuses unearned points`,async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(a.input('items.initialize',0));
 await pool.query('UPDATE mare_game.character_progression SET level=21,level_start_experience=20688,experience=20688 WHERE character_id=$1',[a.character.id]);
 const allocation={...characters.empty(),strength:100},command=a.input('attributes.allocate',1,{allocation});
 const outcomes=await Promise.allSettled(Array.from({length:6},()=>a.send({...command,requestId:same?command.requestId:randomUUID()})));
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,same?6:1);
 for(const r of outcomes)if(r.status==='rejected')assert.equal(r.reason.code,'state_version_conflict');
 const before:any=await a.read();assert.equal(before.attributes.spent,100);assert.equal(before.attributes.available,0);assert.equal(before.state.experience,'20688');
 await assert.rejects(a.send(a.input('attributes.allocate',2,{allocation:{...characters.empty(),strength:1}})),{code:'attribute_points_insufficient'});
 const after:any=await a.read();assert(Date.parse(after.hunt.serverNow)>=Date.parse(before.hunt.serverNow));
 assert.deepEqual({...after,hunt:{...after.hunt,serverNow:before.hunt.serverNow}},before);
 assert.equal((await pool.query('SELECT count(*)::int n FROM mare_game.character_attribute_ledger')).rows[0].n,1);
}));
