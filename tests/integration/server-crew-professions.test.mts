import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import type pg from 'pg';
import type {AuthService} from '../../apps/game-server/src/auth/service.js';
import {readCrew} from '../../apps/game-server/src/characters/crew.js';
import {readCombatInputs} from '../../apps/game-server/src/characters/combat-inputs.js';
import {creditProfessionKills,creditProfessionPrison,readCharacterCrewBenefits,readProfession} from '../../apps/game-server/src/characters/crew-professions.js';
import {professionWeek} from '../../apps/game-server/src/characters/crew-profession-rules.js';
import {authDatabase} from './auth-support.mjs';

type Command=Parameters<AuthService['command']>[2];
async function transaction<T>(pool:pg.Pool,run:(client:pg.PoolClient)=>Promise<T>){
  const client=await pool.connect();
  try{await client.query('BEGIN');const result=await run(client);await client.query('COMMIT');return result;}
  catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
async function actor(service:AuthService,name:string){
  const {token}=await service.login(randomUUID()+'@example.invalid','fixture');
  const {id}=await service.createCharacter(token,{name,classId:'sword',factionId:'pirate'});
  const control=await service.acquireControl(token,id);
  const state=()=>service.characterState(token,id);
  const act=async(action:string,payload:object={})=>service.command(token,id,{action,payload,requestId:randomUUID(),expectedVersion:(await state()).version,control:{epoch:control.epoch,token:control.token}} as Command);
  await act('items.initialize');
  return {id,state,act};
}

test('profession remains permanent, credits are personal and receipts survive weekly renewal',()=>authDatabase(async({service,pool})=>{
  const a=await actor(service,'Cozinheiro de Teste');
  const read=()=>transaction(pool,c=>readProfession(c,a.id));
  assert.equal((await read())!.profession,null);
  await a.act('crew.profession',{profession:'cook'});
  await assert.rejects(a.act('crew.profession',{profession:'doctor'}),{code:'profession_already_chosen'});
  const before=await a.state(),original=(await read())!.week!;
  assert.equal(original.objectives.find(o=>o.id==='donation')?.available,false);
  assert.equal((await read())!.futureBoss.enabled,false);
  const collect=original.objectives.find(o=>o.id==='collection')!,week=professionWeek(Date.parse(original.startAt)),oldWeek=new Date(week.start-7*86400000);
  await pool.query('UPDATE mare_game.character_professions SET chosen_at=$2 WHERE character_id=$1',[a.id,oldWeek]);
  await pool.query("UPDATE mare_game.profession_weeks SET week_start=$2, issued_at=$3, spec=jsonb_set(spec,'{targets}',$4) WHERE character_id=$1",[a.id,oldWeek.toISOString().slice(0,10),oldWeek,JSON.stringify({donation:1,hunt:1,collection:2,prison:1})]);
  const fresh=(await read())!.week!;
  assert.equal(fresh.earnedXp,0);
  const kill=(id:string,area=collect.area!,monster=collect.monster!)=>({id,area,monster:{type:monster,level:collect.level!}});
  const occurred=new Date(oldWeek.getTime()+86_400_000),oldFloor=original.objectives.find(o=>o.id==='prison')!.floor!;
  const wrong=kill('wrong-map','swamp'),wrongSpecies=kill('wrong-species',collect.area!,'unmatched'),miss=kill('miss');
  await transaction(pool,c=>creditProfessionKills(c,a.id,[wrong,wrongSpecies,miss],occurred,()=>false));
  await transaction(pool,c=>creditProfessionKills(c,a.id,[miss,kill('first')],occurred,()=>true));
  const older=()=>pool.query("SELECT progress,material_count FROM mare_game.profession_weeks WHERE character_id=$1 AND week_start<$2",[a.id,week.key]).then(x=>x.rows[0]);
  assert.equal((await older()).progress.collection,1,'a failed roll stays failed when replayed');
  assert.equal((await older()).material_count,0,'expired materials never return to the live pile');
  await transaction(pool,async c=>{
    await creditProfessionKills(c,a.id,[kill('last'),kill('extra')],occurred,()=>true);
    await creditProfessionPrison(c,a.id,'bad-floor',oldFloor+1,occurred);
    await creditProfessionPrison(c,a.id,'good-floor',oldFloor,occurred);
    await creditProfessionPrison(c,a.id,'good-floor',oldFloor,occurred);
    await creditProfessionKills(c,a.id,[miss,kill('first'),kill('last')],undefined,()=>true);
  });
  const progress=await read();
  assert.equal(progress!.experience,850);
  assert.equal(progress!.week!.earnedXp,0);
  assert.deepEqual(progress!.history.map(x=>x.xp).sort((x,y)=>x-y),[200,250,400]);
  assert.equal(progress!.week!.objectives.find(o=>o.id==='collection')?.progress,0);
  assert.equal((await a.state()).experience,before.experience);
}));

test('server caps professional XP and applies the strongest offline specialist subject to facility level',()=>authDatabase(async({service,pool})=>{
  const a=await actor(service,'Capitão de Teste'),b=await actor(service,'Especialista de Teste');
  const fighter=()=>transaction(pool,async c=>(await readCombatInputs(c,[a.id])).get(a.id)!.fighter(null));
  const before=await fighter();
  await a.act('crew.profession',{profession:'cook'});
  await b.act('crew.profession',{profession:'cook'});
  await a.act('crew.create',{name:'Tripulação de Teste',tag:'TEST',flag:'1'+'0'.repeat(1023),policy:'open',minLevel:1});
  const crew=await transaction(pool,c=>readCrew(c,a.id));
  await b.act('crew.join',{crewId:crew.group!.id});
  const benefits=()=>transaction(pool,c=>readCharacterCrewBenefits(c,a.id));
  assert.equal((await benefits()).cook,.002);
  await pool.query('UPDATE mare_game.character_professions SET experience=10799 WHERE character_id=$1',[b.id]);
  assert.equal((await benefits()).cook,.004,'facility 1 uses at most profession level 2');
  await pool.query("UPDATE mare_game.crews SET facilities=jsonb_set(facilities,'{galley}','5') WHERE id=$1",[crew.group!.id]);
  assert.equal((await benefits()).cook,.018);
  const {week}= (await transaction(pool,c=>readProfession(c,b.id)))!;
  const floor=week!.objectives.find(o=>o.id==='prison')!.floor!;
  await transaction(pool,c=>creditProfessionPrison(c,b.id,'cap-floor',floor));
  assert.equal((await transaction(pool,c=>readProfession(c,b.id)))!.experience,10800);
  assert.equal((await benefits()).cook,.02);
  const boosted=await fighter();
  assert.deepEqual(boosted.allocated,before.allocated);
  // Compare both sides at the same six-decimal precision, not IEEE-754 rounding noise.
  assert.equal(Math.round(boosted.total.vitality*1e6)/1e6,Math.round(before.total.vitality*1.02*1e6)/1e6);
  await b.act('crew.leave');
  assert.equal((await benefits()).cook,.002);
  assert.equal((await transaction(pool,c=>readProfession(c,b.id)))!.level,10);
}));

test('manual potion recovery uses the Doctor bonus without increasing general healing',()=>authDatabase(async({service,pool})=>{
  const a=await actor(service,'Paciente de Teste');
  const doctor=await actor(service,'Doutora de Teste');
  await doctor.act('crew.profession',{profession:'doctor'});
  await a.act('world.initialize');
  await a.act('battle.start');
  const fighter=()=>transaction(pool,async c=>(await readCombatInputs(c,[a.id])).get(a.id)!.fighter(null));
  const before=await fighter();
  const wounded=()=>pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{hp}','1') WHERE character_id=$1",[a.id]);
  const hp=()=>pool.query("SELECT (simulation->>'hp')::float8 hp FROM mare_game.character_battles WHERE character_id=$1",[a.id]).then(r=>r.rows[0].hp as number);
  await wounded();
  await a.act('potions.use');
  const ordinary=(await hp())-1;
  await doctor.act('crew.create',{name:'Tripulação da Cura',tag:'CURA',flag:'1'+'0'.repeat(1023),policy:'open',minLevel:1});
  const crew=await transaction(pool,c=>readCrew(c,doctor.id));
  await a.act('crew.join',{crewId:crew.group!.id});
  await pool.query('UPDATE mare_game.character_professions SET experience=10800 WHERE character_id=$1',[doctor.id]);
  await pool.query("UPDATE mare_game.crews SET facilities=jsonb_set(facilities,'{infirmary}','5') WHERE id=$1",[crew.group!.id]);
  assert.deepEqual(await fighter(),{...before,sourceVersion:(await a.state()).version});
  await wounded();
  await pool.query("UPDATE mare_game.character_battles SET simulation=jsonb_set(simulation,'{potionReadyAt}','1') WHERE character_id=$1",[a.id]);
  await a.act('potions.use');
  assert(Math.abs((await hp())-1-ordinary*1.10)<1e-6);
}));
