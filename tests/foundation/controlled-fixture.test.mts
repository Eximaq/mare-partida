import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('controlled fixture command UUIDs cannot collide between setup and simulation workers',()=>{
 const fixture=new URL('../../tools/load/controlled-fixture.mjs',import.meta.url).href;
 const source=`
  import {Worker} from 'node:worker_threads';
  import {randomUUID} from 'node:crypto';
  await import(${JSON.stringify(fixture)});
  const setup=Array.from({length:100},()=>randomUUID());
  const code=${JSON.stringify(`import {parentPort} from 'node:worker_threads';import {randomUUID} from 'node:crypto';await import(${JSON.stringify(fixture)});parentPort.postMessage(Array.from({length:100},()=>randomUUID()));`)};
  const groups=[setup];
  for(const index of [0,1]){
   const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(code)),{workerData:{databaseUrl:'postgresql://fixture@127.0.0.1:55433/mare_test_'+ 'a'.repeat(32),kind:'party',index,capacityLayout:'6/6',capacityRooms:Array(12).fill('fixture')}});
   groups.push(await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);}));
  }
  console.log(JSON.stringify({total:groups.flat().length,unique:new Set(groups.flat()).size}));
 `;
 const result=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',timeout:15000,windowsHide:true,env:{...process.env,TEST_DATABASE_URL:'postgresql://fixture@127.0.0.1:55433/postgres',MARE_LOAD_LAYOUT:'6/6'}});
 assert.equal(result.status,0,'fixture subprocess completed');
 const value=JSON.parse(result.stdout.trim());assert.equal(value.total,300);
 assert.equal(value.unique,300,'setup and worker commands need disjoint UUID namespaces');
});

test('controlled fixture rejects private and external databases before replacing randomness',()=>{
 const fixture=new URL('../../tools/load/controlled-fixture.mjs',import.meta.url).href;
 const source=`import crypto from 'node:crypto';const before=crypto.randomUUID;let blocked=false;try{await import(${JSON.stringify(fixture)});}catch{blocked=true;}console.log(JSON.stringify({blocked,unchanged:crypto.randomUUID===before}));`;
 for(const url of ['postgresql://fixture@127.0.0.1:55432/postgres','postgresql://fixture@external.example.invalid:5432/postgres']){
  const result=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',timeout:10000,windowsHide:true,env:{...process.env,TEST_DATABASE_URL:url,MARE_LOAD_LAYOUT:'6/6'}});
  assert.equal(result.status,0);assert.deepEqual(JSON.parse(result.stdout.trim()),{blocked:true,unchanged:true});
 }
});

test('room RNG and spawned identities are independent of the order of other rooms',()=>{
 const fixture=new URL('../../tools/load/controlled-fixture.mjs',import.meta.url).href;
 const root=new URL('../../package.json',import.meta.url).href;
 const source=`
  import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
  await import(${JSON.stringify(fixture)});const require=createRequire(${JSON.stringify(root)});
  const E=require('./world-battle.cjs'),C=require('./character-system.js'),P=require('./party-battle.cjs'),nav=require('./world-catalog.cjs').load().navigation('dawn');
  const stats={...C.derive({classId:'sword',level:10,attributes:C.empty()},E.catalog.classes.sword,E.catalog.factions.pirate,{attack:0,defense:0,hp:0}),maxHP:10000,maxEnergy:100};
  const groups=['A','B'].map(id=>{
   const actors=Array.from({length:4},(_,i)=>({id:id+i,b:E.create('beach',stats,1000,()=>.5),hero:{...nav.map.spawn},stats,baseStats:stats,classId:'sword',factionId:'pirate',level:10,connected:true,lastSeen:1000}));
   for(const a of actors)a.b.auto=true;
   return {room:{id,kind:'hunt',area:'beach',mapId:'dawn',mobs:actors[0].b.mobs,hunts:actors[0].b.hunts,respawns:{},seq:0},actors};
  });
  const order=process.env.ROOM_ORDER==='AB'?[0,1]:[1,0];
  for(let tick=1;tick<=20;tick++)for(const i of order){const g=groups[i];P.step(g.room,g.actors,{nav,now:1000+250*tick,dt:.25,rng:()=>{throw Error('fixture must supply per-room RNG');}});}
  console.log(JSON.stringify({hash:createHash('sha256').update(JSON.stringify(groups)).digest('hex'),mobs:groups.map(g=>g.room.mobs.length)}));
 `;
 const run=(order:string)=>{
  const r=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',timeout:15000,windowsHide:true,env:{...process.env,TEST_DATABASE_URL:'postgresql://fixture@127.0.0.1:55433/postgres',MARE_LOAD_LAYOUT:'6/6',ROOM_ORDER:order}});
  assert.equal(r.status,0,'real Party simulation completed');return JSON.parse(r.stdout.trim());
 };
 const ab=run('AB'),ba=run('BA');assert.ok(ab.mobs.every((n:number)=>n>14),'fixture exercises spawned identities');assert.deepEqual(ab,ba);
});
