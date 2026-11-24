import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {authDatabase} from './auth-support.mjs';
const require=createRequire(import.meta.url),rules=require('../../attribute-rules.js'),batch=require('../../inventory-batch.js');
const defs=require('../../item-catalog.js').create({forge:require('../../forge-system.js'),prison:require('../../prison-system.js'),haki:require('../../haki-system.js'),akuma:require('../../akuma-system.js'),hakiProgression:require('../../haki-progression.js')}).items;
async function actor(service:any){const a=await service.login(randomUUID()+'@example.invalid','fixture'),c=await service.createCharacter(a.token,{name:'Atributos',classId:'sword',factionId:'pirate'}),l=await service.acquireControl(a.token,c.id);return {id:c.id,read:()=>service.onlineState(a.token,c.id),input:(action:string,expectedVersion:number,payload:any={})=>({action,payload,expectedVersion,requestId:randomUUID(),control:{epoch:l.epoch,token:l.token}}),send:(x:any)=>service.command(a.token,c.id,x)};}
test('batch sale validates every quote, rolls back rejected lots and persists one payment on concurrent replay',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(a.input('items.initialize',0));let o:any=await a.read();const first=o.originalInventory.inventory[0],second={...structuredClone(first),id:randomUUID(),binding:'character',boundToCharacter:a.id,origin:'boss-dungeon'};
 await pool.query('UPDATE mare_game.game_inventory SET inventory=$2 WHERE character_id=$1',[a.id,JSON.stringify([first,second])]);o=await a.read();const p=batch.preview(o.originalInventory,[first.id,second.id],defs);
 await assert.rejects(a.send(a.input('items.sell-batch',1,{items:p.items.map((x:any)=>({...x,unitPrice:x.unitPrice+1}))})));assert.equal((await a.read() as any).state.gold,'120');
 const lock=a.input('items.lock-batch',1,{itemIds:[first.id,second.id],locked:true});await a.send(lock);assert.deepEqual(await a.send(lock),await a.send(lock));await assert.rejects(a.send(a.input('items.sell-batch',2,{items:p.items})));assert.equal((await a.read() as any).originalInventory.inventory.length,2);
 await a.send(a.input('items.lock-batch',2,{itemIds:[first.id,second.id],locked:false}));const sell=a.input('items.sell-batch',3,{items:p.items});const receipts=await Promise.all([a.send(sell),a.send(sell)]);assert.deepEqual(receipts[0],receipts[1]);o=await a.read();assert.equal(o.state.gold,String(120+p.total));assert.equal(o.originalInventory.inventory.length,0);assert.equal(o.state.version,4);assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.game_inventory_events WHERE character_id=$1 AND action='items.sell-batch'",[a.id])).rows[0].n,1);
}));
test('manual allocation, persisted build credits, profile changes and retry conserve earned points',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(a.input('items.initialize',0));await pool.query('UPDATE mare_game.character_progression SET level=3 WHERE character_id=$1',[a.id]);
 await a.send(a.input('attributes.build',1,{profile:'sword',automatic:true}));let version=2;const all=rules.distribute(10,'sword');
 for(let n=0;n<10;n++){const command=a.input('attributes.distribute',version++,{profile:'sword',count:1}),receipt=await a.send(command);assert.deepEqual(await a.send(command),receipt);}
 let o:any=await a.read();assert.deepEqual(o.attributes.allocated,all.allocation);assert.deepEqual(o.attributes.build.credits,all.credits);assert.equal(o.attributes.available,0);await assert.rejects(a.send(a.input('attributes.distribute',version,{profile:'sword',count:1})));
 await a.send(a.input('attributes.build',version,{profile:'brawler',automatic:false}));o=await a.read();assert.deepEqual(o.attributes.allocated,all.allocation);assert.deepEqual(o.attributes.build.credits,rules.empty());assert.equal(o.attributes.build.automatic,false);
}));

test('automatic build grants only the five new level points once, leaving old free points intact',async()=>authDatabase(async({service,pool})=>{
 const a=await actor(service);await a.send(a.input('items.initialize',0));await a.send(a.input('attributes.build',1,{profile:'sword',automatic:true}));await a.send(a.input('journey.begin',2));await a.send(a.input('hunt.begin',3));
 const catalog=require('../../character-catalog.js');await pool.query('UPDATE mare_game.character_progression SET level=2,level_start_experience=$2,experience=$3 WHERE character_id=$1',[a.id,catalog.xpNeeded(1),catalog.xpNeeded(1)+catalog.xpNeeded(2)-20]);await pool.query("UPDATE mare_game.character_hunts SET begun_at=clock_timestamp()-interval '31 seconds' WHERE character_id=$1",[a.id]);
 const command=a.input('hunt.claim',4),receipt=await a.send(command);assert.deepEqual(await a.send(command),receipt);const o:any=await a.read();assert.equal(o.state.level,3);assert.equal(o.attributes.spent,5);assert.equal(o.attributes.available,5);assert.deepEqual(o.attributes.allocated,rules.distribute(5,'sword').allocation);
}));
