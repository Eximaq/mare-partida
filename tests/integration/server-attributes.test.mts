import {mkdtemp,copyFile,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createServer as createProxy,request as forward} from "node:http";
import {applyMigrations} from "../../apps/game-server/src/db/migrations.js";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {once} from "node:events";
import type {AddressInfo} from "node:net";
import {test} from "node:test";
import {AuthService} from "../../apps/game-server/src/auth/service.js";
import {createHttpServer} from "../../apps/game-server/src/http.js";
import {createAuthHandler} from "../../apps/game-server/src/auth/routes.js";
import {authDatabase} from "./auth-support.mjs";

const zero={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
async function fixture(service:any,pool:any) {
  const session=await service.login("attributes@example.invalid","fixture");
  const character=await service.createCharacter(session.token,{name:"Attributes",classId:"sword",factionId:"pirate"});
  const lease=await service.acquireControl(session.token,character.id);
  // Owner fixture in the isolated UUID test DB, never the hosted provider or real characters.
  await pool.query("UPDATE mare_game.character_progression SET level=2,experience=80 WHERE character_id=$1",[character.id]);
  const input=(allocation:any={...zero,strength:3,vitality:2},expectedVersion=0)=>({requestId:randomUUID(),action:"attributes.allocate",expectedVersion,control:{epoch:lease.epoch,token:lease.token},payload:{allocation}});
  const send=(command:any)=>service.command(session.token,character.id,command);
  return {session,character,lease,input,send};
}

test("attribute HTTP spends five earned points once, persists on reload, and rejects client authority fields",async()=>authDatabase(async({service,pool,vault})=>{
  const f=await fixture(service,pool);
  const server=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:"https://localhost:9443",cookieSeconds:3600})});
  server.listen(0,"127.0.0.1");await once(server,"listening");
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const send=(body:any,token=f.session.token,id=f.character.id,headers={})=>fetch(`${base}/v1/characters/${id}/commands`,{method:"POST",headers:{"content-type":"application/json",origin:"https://localhost:9443",cookie:`__Host-mare_session=${token}`,"x-csrf-token":vault.csrf(token),...headers},body:JSON.stringify(body)});
  try {
    const command=f.input(),response=await send(command);assert.equal(response.status,200);
    const accepted=await response.json();assert.equal(accepted.state.version,1);assert.equal(accepted.state.experience,"80");assert.equal(accepted.state.gold,"0");
    const expected={catalogId:"online-attributes-v1",allocated:{...zero,strength:3,vitality:2},earned:5,spent:5,available:0,lastRequestId:command.requestId};
    assert.deepEqual(accepted.attributes,expected);
    assert.deepEqual(await (await send(command)).json(),accepted);
    assert.deepEqual((await service.onlineState(f.session.token,f.character.id) as any).attributes,expected);
    assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_attribute_ledger")).rows[0].n,1);
    for(const value of [{...command,accountId:randomUUID()},{...command,ownerId:randomUUID()},{...command,characterId:randomUUID()},
      {...command,payload:{...command.payload,earned:999}}, {...command,payload:{allocation:{...zero,strength:1,ownerId:randomUUID()}}},
      {...command,payload:{allocation:{...zero,strength:-1}}},{...command,payload:{allocation:{...zero,strength:1.5}}},
      {...command,payload:{allocation:{...zero,strength:"1"}}},{...command,payload:{allocation:zero}},
      {...command,payload:{allocation:{...zero,strength:96}}},{...command,payload:{allocation:{strength:1}}}]) assert.equal((await send(value)).status,400);
    assert.equal((await send(f.input({...zero,strength:1},1))).status,409);
    assert.equal((await send(command,f.session.token,f.character.id,{origin:"https://elsewhere.invalid"})).status,403);
    assert.equal((await send(command,f.session.token,f.character.id,{"x-csrf-token":"forged"})).status,403);
    const other=await service.login("other@example.invalid","fixture");
    assert.equal((await send(command,other.token)).status,404);
    assert.equal((await send(command,other.token,randomUUID())).status,404);
    const replacement=await service.login("attributes@example.invalid","fixture");await service.acquireControl(replacement.token,f.character.id,f.lease.epoch);
    assert.equal((await send(command)).status,409,"replay still requires current controller");
  } finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));
for(const same of [true,false]) test(`concurrent attribute allocation ${same?"replays":"conflicts"} across instances without overspending`,async()=>authDatabase(async({service,pool,provider,vault})=>{
  const f=await fixture(service,pool),command=f.input();
  const second=new AuthService({pool,provider,vault,origin:"https://localhost:9443",policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000}});
  const results=await Promise.allSettled(Array.from({length:8},(_,i)=>(i%2?second:service).command(f.session.token,f.character.id,{...command,requestId:same?command.requestId:randomUUID()} as any)));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,same?8:1);
  for(const r of results) if(r.status==="rejected") assert.equal(r.reason.code,"state_version_conflict");
  const state:any=await second.onlineState(f.session.token,f.character.id);assert.equal(state.attributes.spent,5);assert.equal(state.attributes.available,0);assert.equal(state.state.version,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_attribute_ledger")).rows[0].n,1);
}));
for(const table of ["character_attribute_ledger","character_commands"]) test(`attribute allocation rolls back completely when ${table} rejects its write`,async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool),before=await service.onlineState(f.session.token,f.character.id),command=f.input();
  await pool.query(`ALTER TABLE mare_game.${table} ADD CONSTRAINT reject_fixture CHECK(false) NOT VALID`);
  await assert.rejects(f.send(command),{code:"23514"});
  const after=await service.onlineState(f.session.token,f.character.id);assert.deepEqual(after.state,before.state);assert.deepEqual((after as any).attributes,(before as any).attributes);
  await pool.query(`ALTER TABLE mare_game.${table} DROP CONSTRAINT reject_fixture`);
  assert.equal((await f.send(command)).state.version,1);
}));
test("partial allocations preserve budget on new levels, canonical replay and historical receipts",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool),command=f.input({...zero,strength:2});const original=await f.send(command);
  assert.equal(original.attributes.available,3);
  // Same intent with a different JSON key order is the same command.
  assert.deepEqual(await f.send({...command,payload:{allocation:{spirit:0,intelligence:0,vitality:0,dexterity:0,strength:2}}}),original);
  await assert.rejects(f.send({...command,payload:{allocation:{...zero,strength:3}}}),{code:"idempotency_conflict"});
  await assert.rejects(f.send(f.input({...zero,strength:4},1)),{code:"attribute_points_insufficient"});
  await pool.query("UPDATE mare_game.character_progression SET level=3,experience=185 WHERE character_id=$1",[f.character.id]);
  const next=await f.send(f.input({...zero,spirit:8},1));assert.equal(next.attributes.earned,10);assert.equal(next.attributes.available,0);assert.equal(next.state.version,2);
  assert.deepEqual(await f.send(command),original);
  for(let i=0;i<3;i++) {const view:any=await service.onlineState(f.session.token,f.character.id);assert.equal(view.attributes.spent,10);assert.equal(view.state.version,2);}
}));

test("attribute migration preserves existing progression and receipts and starts with all points unspent",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"mare-before-attributes-")),source=new URL("../../apps/game-server/migrations/",import.meta.url);
  for(const name of await readdir(source)) if(name.endsWith(".sql") && name<"0010") await copyFile(new URL(name,source),join(dir,name));
  await authDatabase(async({service,pool})=>{
    const f=await fixture(service,pool);const sync={...f.input(),action:"state.sync",payload:{}};await f.send(sync);
    const before=await service.characterState(f.session.token,f.character.id),receipts=(await pool.query("SELECT * FROM mare_game.character_commands")).rows;
    assert.deepEqual(await applyMigrations(pool),["0010_attribute_allocation.sql", "0011_battle_profiles.sql", "0012_inventory_economy.sql", "0013_continuous_play.sql"]);assert.deepEqual(await applyMigrations(pool),[]);
    assert.deepEqual(await service.characterState(f.session.token,f.character.id),before);assert.deepEqual((await pool.query("SELECT * FROM mare_game.character_commands")).rows,receipts);
    assert.deepEqual((await service.onlineState(f.session.token,f.character.id) as any).attributes,{catalogId:"online-attributes-v1",allocated:zero,earned:5,spent:0,available:5,lastRequestId:null});
    assert.equal((await f.send(f.input())).attributes.available,0);
  },dir);
});
test("attribute budget rejects level one and exhausted versions, and caps spending at earned level twenty points",async()=>authDatabase(async({service,pool})=>{
  const f=await fixture(service,pool);
  await pool.query("UPDATE mare_game.character_progression SET level=1,experience=0 WHERE character_id=$1",[f.character.id]);
  await assert.rejects(f.send(f.input({...zero,strength:1})),{code:"attribute_points_insufficient"});
  await pool.query("UPDATE mare_game.character_progression SET level=20,experience=18209 WHERE character_id=$1",[f.character.id]);
  await pool.query("UPDATE mare_game.characters SET state_version=9007199254740991 WHERE id=$1",[f.character.id]);
  await assert.rejects(f.send(f.input({...zero,strength:95},Number.MAX_SAFE_INTEGER)),{code:"state_version_exhausted"});
  assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_attribute_ledger")).rows[0].n,0);
  await pool.query("UPDATE mare_game.characters SET state_version=0 WHERE id=$1",[f.character.id]);
  const result=await f.send(f.input({...zero,strength:95}));assert.equal(result.attributes.spent,95);assert.equal(result.attributes.available,0);
  await assert.rejects(f.send(f.input({...zero,strength:1},1)),{code:"attribute_points_insufficient"});
}));
test("attribute allocation survives a real lost socket and process reconstruction without charging twice",async()=>authDatabase(async({service,pool,provider,vault})=>{
  const f=await fixture(service,pool),command=f.input();
  const backend=createHttpServer({isReady:async()=>true,handle:createAuthHandler({service,vault,origin:"https://localhost:9443",cookieSeconds:3600})});
  backend.listen(0,"127.0.0.1");await once(backend,"listening");let drop=true,dropped=0;
  const proxy=createProxy((request,response)=>{
    const upstream=forward({hostname:"127.0.0.1",port:(backend.address() as AddressInfo).port,path:request.url,method:request.method,headers:request.headers},reply=>{
      if(drop){drop=false;dropped++;reply.resume();response.destroy();return;}response.writeHead(reply.statusCode!,reply.headers);reply.pipe(response);
    });upstream.on("error",()=>response.destroy());request.pipe(upstream);
  });proxy.listen(0,"127.0.0.1");await once(proxy,"listening");
  const send=()=>fetch(`http://127.0.0.1:${(proxy.address() as AddressInfo).port}/v1/characters/${f.character.id}/commands`,{method:"POST",headers:{"content-type":"application/json",origin:"https://localhost:9443",cookie:`__Host-mare_session=${f.session.token}`,"x-csrf-token":vault.csrf(f.session.token)},body:JSON.stringify(command)});
  try {
    await assert.rejects(send(),TypeError);assert.equal(dropped,1);assert.equal((await service.characterState(f.session.token,f.character.id)).version,1);
    const retry=await send();assert.equal(retry.status,200);const result=await retry.json();assert.equal(result.attributes.spent,5);
    const restarted=new AuthService({pool,provider,vault,origin:"https://localhost:9443",policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000}});
    assert.deepEqual(await restarted.command(f.session.token,f.character.id,command as any),result);
    assert.equal((await pool.query("SELECT count(*)::int n FROM mare_game.character_attribute_ledger")).rows[0].n,1);
  }finally{proxy.closeAllConnections();backend.closeAllConnections();await Promise.all([new Promise<void>(r=>proxy.close(()=>r())),new Promise<void>(r=>backend.close(()=>r()))]);}
}));
