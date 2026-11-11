import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readdir,copyFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {authDatabase} from './auth-support.mjs';
import {applyMigrations} from '../../apps/game-server/src/db/migrations.js';
const require=createRequire(import.meta.url),E=require('../../world-battle.cjs');
const migration='0051_fruit_rework_compatibility.sql';
const privateHash='d28ab5e53df81f190558b406a873618e6848955d0e53b92edc395d254e9c114d';
const publicHash='c6129a2128183184726fcaa7375746ba192117780add77a91867d78a0fc15a1b';

test('fruit rework upgrades only audited battles, preserving every other field and economic row',async()=>{
 const source=new URL('../../apps/game-server/migrations/',import.meta.url),dir=await mkdtemp(join(tmpdir(),'mare-rework-'));
 try{
  for(const name of await readdir(source))if(name<migration)await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async f=>{
   const snapshots=[];
   for(const [hash,mode] of [[privateHash,'solo'],[publicHash,'solo'],[privateHash,'dungeon'],[privateHash,'prison'],[privateHash,'party'],['f'.repeat(64),'unknown']]){
    const login=await f.service.login(randomUUID()+'@example.invalid','fixture');
    const c=await f.service.createCharacter(login.token,{name:'Navegante',classId:'sword',factionId:'pirate'});
    const b=E.create('beach',{maxHP:500,maxEnergy:200},1800000000000,()=>.5);
    Object.assign(b,{rulesHash:hash,hp:123,energy:67,auto:true,cooldowns:[2.3,4.5],pending:{targetId:b.mobs[0].id,remaining:.2},fixtureMode:mode});
    if(mode==='party')b.partyInstanceId=randomUUID();
    if(mode==='dungeon')b.dungeon={id:'alvida',clock:123};
    if(mode==='prison')b.prison={floor:1,clock:234};
    await f.pool.query('INSERT INTO mare_game.character_battles(character_id,simulation,control_epoch) VALUES($1,$2,1)',[c.id,JSON.stringify(b)]);
    snapshots.push({id:c.id,b});
   }
   const tables=['characters','character_progression','game_inventory','character_commands','world_battle_rewards'];
   const snapshot=async()=>Promise.all(tables.map(async table=>(await f.pool.query(`SELECT to_jsonb(t) row FROM mare_game.${table} t ORDER BY to_jsonb(t)::text`)).rows));
   const economicBefore=await snapshot();
   assert.deepEqual(await applyMigrations(f.pool),[migration]);
   for(const {id,b} of snapshots){
    const after=(await f.pool.query('SELECT simulation FROM mare_game.character_battles WHERE character_id=$1',[id])).rows[0].simulation;
    assert.deepEqual(after,{...b,rulesHash:b.fixtureMode==='unknown'?b.rulesHash:E.rulesHash});
    if(b.fixtureMode==='unknown')assert.throws(()=>E.step(after,{dt:.05}),/battle_rules_changed/);
   }
   assert.deepEqual(await snapshot(),economicBefore);
   assert.deepEqual(await applyMigrations(f.pool),[]);
   await f.pool.query(await readFile(new URL(migration,source),'utf8'));
   assert.deepEqual(await snapshot(),economicBefore);
  },dir);
 }finally{await rm(dir,{recursive:true,force:true});}
});
