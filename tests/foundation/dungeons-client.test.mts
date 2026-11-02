import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),source=readFileSync(new URL('../../game.js',import.meta.url),'utf8'),session=require('../../apps/account-client/game-session.js');
function extract(name:string){const m=new RegExp('  (?:async )?function '+name+'\\(').exec(source)!;assert(m);const rest=source.slice(m.index+m[0].length),next=rest.search(/\n  (?:async )?function /);return source.slice(m.index,m.index+m[0].length+next);}
test('restored dungeon intentions are strict and cannot supply rewards, ownership, result fruit or position',()=>{
 assert(session.validIntent('dungeon.enter',{dungeonId:'alvida'}));assert(session.validIntent('dungeon.claim',{dungeonId:'morgan'}));assert(session.validIntent('dungeon.craft',{expectedSeq:5}));assert(session.validIntent('dungeon.acknowledge',{itemId:'formed-akuma:fixture:5'}));
 for(const p of [{dungeonId:'unknown'},{dungeonId:'alvida',reward:9},{dungeonId:'alvida',position:{x:1,y:1}},{dungeonId:'alvida',ownerId:'other'}])assert(!session.validIntent('dungeon.claim',p));
 assert(!session.validIntent('dungeon.craft',{expectedSeq:5,fruitId:'chosen'}));assert(!session.validIntent('dungeon.craft',{expectedSeq:-1}));
});
test('online entry requires its real sprite preparation before sending an intent, with no offline persistence',async()=>{
 const calls:any[]=[],box:any={ONLINE_GAME:{controlled:true},dungeonPreparing:false,dungeonRun:null,game:{characterId:'fixture'},MareBossDungeons:{byId:{alvida:{monster:'dungeon-alvida',name:'Alvida'}},status:()=> 'available'},MareSpriteCombatV2:{prepare:async()=>false},toast(){},onlineWorldCommand:async(a:string,p:any)=>calls.push([a,p]),localStorage:{setItem(){throw Error('Demo save');}}};
 runInNewContext(extract('enterBossDungeon')+';globalThis.enter=enterBossDungeon;',box);assert.equal(await box.enter('alvida'),false);assert.equal(calls.length,0);assert.equal(box.dungeonPreparing,false);box.MareSpriteCombatV2.prepare=async()=>true;assert.equal(await box.enter('alvida'),true);assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['dungeon.enter',{dungeonId:'alvida'}]]);
});
test('online chest and formation send intentions without running local reward transitions or saving',async()=>{
 const calls:any[]=[],panels:any[]=[],box:any={ONLINE_GAME:{},dungeonRun:{id:'alvida'},onlineItemCommand:async(a:string,p:any)=>{calls.push([a,p]);return true;},openPanel:(p:string)=>panels.push(p)};
 for(const name of ['claimDungeonChest','formDungeonAkuma'])runInNewContext(extract(name)+`;globalThis.${name}=${name};`,box);
 box.claimDungeonChest();await box.formDungeonAkuma(5);assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['dungeon.claim',{dungeonId:'alvida'}],['dungeon.craft',{expectedSeq:5}]]);assert.deepEqual(panels,['akuma-reveal']);
});
