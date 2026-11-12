import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
const { createSession } = require("../../apps/account-client/game-session.js");
const id = "11111111-1111-4111-8111-111111111111";
function fixture(options:any={}) {
  let version = 0,
    fail = false;
  let renewalStatus=200, acquisitionStatus=200, stateStatus=200;
  const requests: any[] = [],
    storage = new Map();
  const snapshot = () => ({
    ...(options.frameSupport?{sync:{protocol:options.frameProtocol??1}}:{}),
    ...(options.world ? { world: options.world } : {}),
    ...(options.battle ? { battle: options.battle } : {}),
    state: { characterId: id, version, level: 1, experience: "20", gold: "8" },
    progression: { xpIntoLevel: "20", xpForNextLevel: "80" },
    journey: { started: true },
    hunt: { status: "claimed" },
    combat: { status: "available" },
    attributes: {
      allocated: {
        strength: 0,
        dexterity: 0,
        vitality: 0,
        intelligence: 0,
        spirit: 0,
      },
      available: 0,
    },
    inventory: { items: [], equipped: { weapon: null, armor: null } },
    itemCatalog: [],
  });
  const client = createSession({
    ...options,
    uuid: randomUUID,
    storage: {
      getItem: (k: string) => storage.get(k),
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    },
    fetch: async (path: string, o: any = {}) => {
      requests.push({ path, ...o });
      if (path === "/v1/me")
        return Response.json({
          account: { id: "a" },
          character: {
            id,
            name: "Fixture",
            classId: "sword",
            factionId: "pirate",
          },
        });
      if (path === "/v1/auth/csrf") {
        if(options.waitForCsrf)await options.waitForCsrf();
        return Response.json({ csrfToken: "fixture" });
      }
      if (path.endsWith("/online-state")) {
        const requested = snapshot();
        if (version > 0 && options.waitForSnapshot) await options.waitForSnapshot();
        return stateStatus===200?Response.json(requested):Response.json({error:"unavailable"},{status:stateStatus});
      }
      if(path.endsWith('/frame')){
        const frame = {protocol:1,characterId:id,version,serverNow:new Date().toISOString(),simulationAgeMs:40,world:null,battle:null,lobby:{players:[]},party:{group:null,invites:[]},...(options.framePatch||{})};
        if(options.waitForFrame)await options.waitForFrame();
        return Response.json(frame);
      }
      if(path.endsWith('/control/renew'))return renewalStatus===200?Response.json({epoch:1}):Response.json({error:renewalStatus===409?'control_conflict':'unavailable'},{status:renewalStatus});
      if (path.endsWith("/control"))
        return acquisitionStatus===200?Response.json({ epoch: 1, token: "x".repeat(43) }):Response.json({error:'control_conflict'},{status:409});
      if (path.endsWith("/commands")) {
        if (fail) throw new Error("lost reply");
        version++;
        const intent = JSON.parse(o.body);
        return Response.json(options.commandWorld ? {
          requestId: intent.requestId,
          action: intent.action,
          state: snapshot().state,
          world: typeof options.commandWorld==='function'?options.commandWorld(intent):options.commandWorld,
        } : {});
      }
      if (path === "/v1/auth/logout")
        return new Response(null, { status: 204 });
      throw new Error(path);
    },
  });
  return {
    client,
    requests,
    storage,
    stateStatus:(status:number)=>{stateStatus=status;},
    controlStatus:(renewal:number,acquisition=200)=>{renewalStatus=renewal;acquisitionStatus=acquisition;},
    fail: () => {
      fail = true;
    },
    recover: () => {
      fail = false;
    },
  };
}
test("game session owns identity and economic commands; it stores only intent and never auth credentials", async () => {
  const f = fixture();
  await f.client.load();
  assert.equal(f.client.data.character.id, id);
  assert.equal(f.client.data.online.state.gold, "8");
  await f.client.acquire();
  await f.client.command("journey.begin", {});
  assert.equal(f.client.data.online.state.version, 1);
  const c = f.requests.find((r) => r.path.endsWith("/commands"));
  const body = JSON.parse(c.body);
  assert.equal(body.expectedVersion, 0);
  assert.equal(body.payload.accountId, undefined);
  assert.equal(f.storage.size, 0);
});

test('commands reuse identity and short-lived memory CSRF instead of serial redundant reads',async()=>{
 const f=fixture();await f.client.load();await f.client.acquire();
 await f.client.command('world.move',{x:100,y:100});await f.client.command('world.stop',{});
 assert.equal(f.requests.filter(r=>r.path==='/v1/me').length,1);
 assert.equal(f.requests.filter(r=>r.path==='/v1/auth/csrf').length,1);
 assert.equal(f.requests.filter(r=>r.path.endsWith('/online-state')).length,3);
 assert.equal(f.storage.size,0);
});

test('confirmed movement and stop use the receipt version without fetching full state', async () => {
  const world = {
    mapId: 'lobby', rulesHash: 'fixture-world', area: null,
    position: { x: 0, y: 0 }, path: [], speed: 100, direction: 'right',
    serverNow: '2026-11-11T12:00:00.000Z', motionUntil: '2026-11-11T12:00:00.000Z',
  };
  const accepted = {
    ...world, path: [{ x: 100, y: 0 }],
    serverNow: '2026-11-11T12:00:00.100Z', motionUntil: '2026-11-11T12:00:01.100Z',
  };
  const stopped = { ...accepted, path: [], serverNow: '2026-11-11T12:00:00.150Z' };
  const f = fixture({
    world, battle: { auto: true, hp: 50 },
    commandWorld: (intent: any) => intent.action === 'world.move' ? accepted : stopped,
  });
  await f.client.load();
  await f.client.acquire();
  await f.client.command('world.move', { x: 100, y: 0 });
  assert.equal(f.requests.filter(r => r.path.endsWith('/online-state')).length, 1);
  assert.deepEqual(f.client.data.online.world, accepted);
  assert.deepEqual(f.client.data.online.battle, { auto: false, hp: 50 });
  assert.equal(f.client.data.online.state.version, 0);
  await f.client.command('world.stop', {});
  assert.deepEqual(f.client.data.online.world, stopped);
  assert.deepEqual(f.requests.filter(r => r.path.endsWith('/commands')).map(r => JSON.parse(r.body).expectedVersion), [0, 1]);
  assert.equal(f.requests.filter(r => r.path.endsWith('/online-state')).length, 1);
  assert.equal(f.storage.size, 0);
});

test('a snapshot taken before an accepted movement cannot rewind the route or its version', async () => {
  const world = {
    mapId: 'lobby', rulesHash: 'fixture-world', position: { x: 0, y: 0 }, path: [],
    serverNow: '2026-11-11T12:00:00.000Z',
  };
  const accepted = { ...world, path: [{ x: 100, y: 0 }], serverNow: '2026-11-11T12:00:00.100Z' };
  let signalRead!: () => void;
  let releaseRead!: () => void;
  const started = new Promise<void>((resolve) => { signalRead = resolve; });
  const release = new Promise<void>((resolve) => { releaseRead = resolve; });
  let hold = false;
  const f = fixture({
    world, commandWorld: accepted,
    waitForSnapshot: () => { if (hold) { signalRead(); return release; } },
  });
  await f.client.load();
  await f.client.acquire();
  await f.client.command('world.move', { x: 100, y: 0 });
  hold = true;
  const stale = f.client.read(true);
  await started;
  hold = false;
  try {
    await f.client.command('world.move', { x: 100, y: 0 });
  } finally {
    releaseRead();
    await stale;
  }
  assert.deepEqual(f.client.data.online.world, accepted);
  assert.equal(f.client.data.online.state.version, 1,'keep the full snapshot while preserving the newer path');
  await f.client.read(true);
  assert.equal(f.client.data.online.state.version, 2);
});

test('a frame returning during movement still refreshes nearby players', async () => {
  const world = {
    mapId: 'lobby', rulesHash: 'fixture-world', position: { x: 0, y: 0 }, path: [],
    serverNow: '2026-11-11T12:00:00.000Z',
  };
  const accepted = { ...world, path: [{ x: 100, y: 0 }], serverNow: '2026-11-11T12:00:00.100Z' };
  let signalRead!: () => void;
  let releaseRead!: () => void;
  const started = new Promise<void>((resolve) => { signalRead = resolve; });
  const release = new Promise<void>((resolve) => { releaseRead = resolve; });
  const lobby = { players: [{ name: 'Navegante' }] };
  const f = fixture({
    world, commandWorld: accepted, frameSupport: true,
    framePatch: { world, lobby },
    waitForFrame: () => { signalRead(); return release; },
  });
  await f.client.load();
  await f.client.acquire();
  const frame = f.client.readFrame();
  await started;
  try {
    await f.client.command('world.move', { x: 100, y: 0 });
  } finally {
    releaseRead();
    await frame;
  }
  assert.deepEqual(f.client.data.online.lobby, lobby);
  assert.deepEqual(f.client.data.online.world, accepted);
});

test('a second intent during reconciliation cannot leave an unsent command for replay',async()=>{
 const f=fixture();await f.client.load();await f.client.acquire();
 let second:Promise<unknown>|undefined;
 const off=f.client.subscribe(()=>{
  if(f.client.busy&&!f.client.pending&&!second)
   second=f.client.command('world.travel',{islandId:'dawn'}).catch((error:any)=>error.code);
 });
 try{await f.client.command('world.stop',{});}finally{off();}
 assert.ok(second);assert.equal(await second,'pending_command');
 assert.equal(f.storage.size,0);assert.equal(f.client.pending,null);
 assert.equal(f.requests.filter(r=>r.path.endsWith('/commands')).length,1);
});

test('CSRF cache is single-flight, expires, clears on rejection/logout and never retries mutations',async()=>{
 let time=0,csrfReads=0,posts=0,status=200;
 const c=createSession({now:()=>time,storage:{removeItem(){},getItem(){return null;}},fetch:async(path:string)=>{
  if(path==='/v1/auth/csrf'){csrfReads++;return Response.json({csrfToken:'fixture'});}
  posts++;return status===200?Response.json({}):Response.json({error:status===403?'csrf_rejected':'session_expired'},{status});
 }});
 await Promise.all([c.api('/test',{}),c.api('/test',{})]);assert.equal(csrfReads,1);
 time=30001;await c.api('/test',{});assert.equal(csrfReads,2);
 status=403;await assert.rejects(c.api('/test',{}));assert.equal(posts,4);
 status=200;await c.api('/test',{});assert.equal(csrfReads,3);
 status=401;await assert.rejects(c.api('/test',{}));status=200;
 await c.api('/test',{});assert.equal(csrfReads,4);
 await c.logout();await c.api('/test',{});assert.equal(csrfReads,5);
 await c.api('/v1/auth/rotate',{});await c.api('/test',{});assert.equal(csrfReads,6);
});

test('active frame polling refreshes CSRF before expiry instead of delaying the next movement',async()=>{
 let time=0;const f=fixture({now:()=>time,frameSupport:true});
 await f.client.load();await f.client.acquire();
 time=26000;await f.client.readFrame();
 assert.equal(f.requests.filter(r=>r.path==='/v1/auth/csrf').length,2,'refresh must start during polling, before a key press');
 time=31000;await f.client.command('world.move',{x:100,y:100});
 assert.equal(f.requests.filter(r=>r.path==='/v1/auth/csrf').length,2,'movement uses the refreshed binding without an extra round trip');
});

test('background CSRF refresh neither blocks valid commands nor extends a failed refresh lifetime',async()=>{
 let time=0,reads=0,rejectRefresh:any;
 const f=fixture({now:()=>time,frameSupport:true,waitForCsrf:()=>{if(++reads===2)return new Promise((_,reject)=>{rejectRefresh=reject;});}});
 await f.client.load();await f.client.acquire();time=26000;await f.client.readFrame();
 assert.equal(reads,2);
 time=27000;await f.client.command('world.move',{x:100,y:100});
 assert.equal(reads,2,'a still-valid binding remains usable during refresh');
 rejectRefresh(new Error('isolated refresh failure'));await new Promise(resolve=>setImmediate(resolve));
 time=31000;await f.client.command('world.stop',{});
 assert.equal(reads,3,'an expired binding still requires a fresh token after a failed refresh');
});

test('identity changes still refresh the character metadata used by talents and faction UI',async()=>{
 const f=fixture();await f.client.load();await f.client.acquire();
 await f.client.command('profile.identity',{name:'Fixture',classId:'brawler',factionId:'marine',appearance:{version:1,gender:'male',eyeColor:'black',eyeStyle:'default',hairColor:'black',hairStyle:'short',skinColor:'light',skinStyle:'default'}});
 assert.equal(f.requests.filter(r=>r.path==='/v1/me').length,2);
});

test('expired controller resumes without takeover and concurrent renewal shares one attempt',async()=>{
 const f=fixture();await f.client.load();await f.client.acquire();f.controlStatus(409);
 await Promise.all([f.client.renew(),f.client.renew()]);
 assert.equal(f.client.controlled,true);
 assert.equal(f.requests.filter(r=>r.path.endsWith('/control/renew')).length,1);
 const claims=f.requests.filter(r=>r.path.endsWith('/control'));
 assert.equal(claims.length,2);assert.deepEqual(JSON.parse(claims[1].body),{});
});
test('resumption never displaces a valid controller and transient errors retain the renewal handle',async()=>{
 const f=fixture();await f.client.load();await f.client.acquire();f.controlStatus(503);
 await assert.rejects(f.client.renew());assert.equal(f.client.controlled,true);
 assert.equal(f.requests.filter(r=>r.path.endsWith('/control')).length,1);
 f.controlStatus(409,409);await assert.rejects(f.client.renew());assert.equal(f.client.controlled,false);
 f.controlStatus(200,200);await f.client.renew();assert.equal(f.client.controlled,true);
 assert.ok(f.requests.filter(r=>r.path.endsWith('/control')).every(r=>JSON.stringify(JSON.parse(r.body))==='{}'));
});
test("uncertain mutation requires explicit same-ID replay and never auto-posts during reload", async () => {
  const f = fixture();
  await f.client.load();
  await f.client.acquire();
  f.fail();
  await assert.rejects(f.client.command("combat.begin", {}));
  const saved = JSON.parse([...f.storage.values()][0]);
  assert.equal(JSON.stringify(saved).includes("token"), false);
  const posts = f.requests.filter((r) => r.path.endsWith("/commands")).length;
  await f.client.read();
  assert.equal(
    f.requests.filter((r) => r.path.endsWith("/commands")).length,
    posts,
  );
  f.recover();
  await f.client.resume();
  const calls = f.requests.filter((r) => r.path.endsWith("/commands"));
  assert.equal(
    JSON.parse(calls[0].body).requestId,
    JSON.parse(calls[1].body).requestId,
  );
  assert.equal(f.storage.size, 0);
});
test("session rejects client authority payloads and logout drops character and control", async () => {
  const f = fixture();
  await f.client.load();
  await f.client.acquire();
  await assert.rejects(
    f.client.command("inventory.buy", {
      itemId: "dock-scrap-v1",
      quantity: 1,
      price: 0,
    }),
  );
  await f.client.logout();
  assert.equal(f.client.data, null);
  assert.equal(f.client.controlled, false);
});

test("game projection removes offline starter rewards and uses only server HP, XP, gold and points", () => {
  const { project, derived } = require("../../apps/account-client/game-ui.js");
  const base = {
    name: "Local",
    gold: 120,
    potions: 4,
    materials: 3,
    inventory: [{ def: 8 }],
    equipment: { weapon: { def: 0 } },
    attributes: { strength: 999 },
    stats: { kills: 999 },
  };
  const fighter = {
    maxHp: 38,
    attackMin: 13,
    attackMax: 17,
    armor: 1,
    cooldownMs: 1860,
    total: {
      strength: 15,
      dexterity: 14,
      vitality: 9,
      intelligence: 6,
      spirit: 6,
    },
  };
  const data = {
    character: { id, name: "Online", classId: "sword", factionId: "pirate" },
    online: {
      state: { level: 2, experience: "80", gold: "8" },
      progression: { xpIntoLevel: "0", xpForNextLevel: "105" },
      attributes: {
        available: 5,
        allocated: {
          strength: 0,
          dexterity: 0,
          vitality: 0,
          intelligence: 0,
          spirit: 0,
        },
      },
      combatPreview: fighter,
      combat: {
        status: "active",
        encounterId: "fixture",
        fighter,
        playerHp: 7,
      },
    },
  };
  const g = project(base, data);
  assert.equal(g.name, "Online");
  assert.equal(g.gold, 8);
  assert.equal(g.hp, 7);
  assert.equal(g.potions, 0);
  assert.equal(g.materials, 0);
  assert.deepEqual(g.inventory, []);
  assert.equal(g.equipment.weapon, null);
  assert.equal(g.attributePoints, 5);
  assert.equal(g.stats.kills, 0);
  assert.equal(base.gold, 120);
  assert.equal(derived({ maxHP: 999 }, data).maxHP, 38);
});


test('network meter times existing state reads, ages failed reads and clears on logout',async()=>{
 let clock=0;const f=fixture({monotonic:()=>clock+=25});
 assert.deepEqual(f.client.network,{rttMs:null,ageMs:null,intervalMs:null});
 await f.client.load();assert.equal(f.client.network.rttMs,25);
 assert.equal(f.requests.length,2,'meter sends no requests');
 clock+=750;await f.client.read(true);assert.ok(f.client.network.intervalMs>=750);
 const measured=f.client.network;measured.rttMs=999;assert.equal(f.client.network.rttMs,25,'read-only copy');
 clock+=6000;f.stateStatus(503);await assert.rejects(f.client.read(true));assert.equal(f.client.available,false);assert.ok(f.client.network.ageMs>=6000);assert.equal(f.client.network.rttMs,25);
 await f.client.logout();assert.deepEqual(f.client.network,{rttMs:null,ageMs:null,intervalMs:null});
});


test('compact reads preserve static state, fall back on changed version and ignore forged identity',async()=>{
 const f=fixture({frameSupport:true});await f.client.load();const inventory=f.client.data.online.inventory;
 await f.client.readFrame();assert.equal(f.client.data.online.inventory,inventory);assert.equal(f.requests.filter(r=>r.path.endsWith('/online-state')).length,1);
 await f.client.acquire();await f.client.command('world.stop');await f.client.readFrame();assert.equal(f.client.data.online.state.version,1);
 const bad=fixture({frameSupport:true,framePatch:{characterId:'forged'}});await bad.client.load();await assert.rejects(bad.client.readFrame(),{code:'invalid_server_state'});assert.equal(bad.client.available,false);
 const changed=fixture({frameSupport:true,framePatch:{version:99}});await changed.client.load();await changed.client.readFrame();assert.equal(changed.requests.filter(r=>r.path.endsWith('/online-state')).length,2);
 const old=fixture();await old.client.load();await old.client.readFrame();assert.equal(old.requests.filter(r=>r.path.endsWith('/frame')).length,0,'older server remains supported');
});

test('Party motion preserves public metadata and requires full refresh on roster changes',()=>{
 const {mergePartyMotion}=require('../../apps/account-client/game-session.js');
 const full={group:{id:'g',leaderId:'a',members:[{id:'a',name:'Captain',maxHp:100,appearance96:{hair:'fixture'}}]},invites:[{id:'invitation'}]};
 const merged=mergePartyMotion(full,{group:{id:'g',leaderId:'a',members:[{id:'a',hp:80,connected:true,world:null}],activity:null}});
 assert.equal(merged.group.members[0].hp,80);assert.equal(merged.group.members[0].name,'Captain');assert.equal(merged.invites,full.invites);assert.equal((full.group.members[0] as any).hp,undefined);
 assert.equal(mergePartyMotion(full,{group:{id:'g',members:[{id:'other'}]}}),null);
 assert.equal(mergePartyMotion(full,{group:null}),null);
});
test('a newer compact request can return full progress and Dawn positions in one response',async()=>{
 const world={mapId:'dawn',position:{x:40,y:80},path:[]};
 const fullState={sync:{protocol:2},state:{characterId:id,version:1,level:2,experience:'80',gold:'30'},world,battle:null,lobby:{players:[]},party:{group:null,invites:[]}};
 const f=fixture({frameSupport:true,frameProtocol:2,framePatch:{protocol:2,version:1,fullState}});
 await f.client.load();
 await f.client.readFrame();
 assert.equal(f.requests.filter(r=>r.path.endsWith('/online-state')).length,1);
 assert.equal(new Headers(f.requests.find(r=>r.path.endsWith('/frame')).headers).get('x-mare-state-version'),'0');
 assert.deepEqual(f.client.data.online,fullState);
 const forged=fixture({frameSupport:true,frameProtocol:2,framePatch:{protocol:2,version:1,fullState:{...fullState,state:{...fullState.state,characterId:'other'}}}});
 await forged.client.load();
 await assert.rejects(forged.client.readFrame(),{code:'invalid_server_state'});
 assert.equal(forged.client.data.online.state.version,0);
});
test('an older failed read cannot undo a newer successful connection; authentication failure still closes it',async()=>{
 const pending:Array<{resolve:(value:Response)=>void;reject:(reason:Error)=>void}>=[];
 const c=createSession({storage:{getItem(){return null;},removeItem(){}},fetch:async(path:string)=>path==='/v1/me'?Response.json({character:{id,name:'Fixture',classId:'sword',factionId:'pirate'}}):new Promise<Response>((resolve,reject)=>pending.push({resolve,reject}))});
 const snapshot=(version:number)=>Response.json({state:{characterId:id,version,level:1,experience:'0',gold:'0'}});
 const load=c.load();await new Promise(r=>setImmediate(r));pending[0]!.resolve(snapshot(0));await load;
 const stale=c.read(true),denied=assert.rejects(stale,/offline/),fresh=c.read(true);pending[2]!.resolve(snapshot(2));await fresh;
 pending[1]!.reject(new Error('offline'));await denied;
 assert.equal(c.available,true,'late network error must not hide newer authorized state');assert.equal(c.data.online.state.version,2);
 const oldAuth=c.read(true),rejected=assert.rejects(oldAuth,{status:401}),latest=c.read(true);pending[4]!.resolve(snapshot(3));await latest;
 pending[3]!.resolve(Response.json({error:'session_expired'},{status:401}));await rejected;
 assert.equal(c.available,false,'401 remains fail-closed even when responses are reordered');assert.equal(c.data,null);
});

test('a stalled frame observes the polling deadline and the following frame recovers',async()=>{
 const character={id,name:'Fixture',classId:'sword',factionId:'pirate'};
 const snapshot={sync:{protocol:1},state:{characterId:id,version:0,level:1,experience:'0',gold:'0'}};
 let stall=true;
 const c=createSession({storage:{getItem(){return null;},removeItem(){}},fetch:async(path:string,options:any)=>{
  if(path==='/v1/me')return Response.json({character});
  if(path.endsWith('/online-state'))return Response.json(snapshot);
  if(stall)return new Promise((_resolve,reject)=>{
   const guard=setTimeout(()=>reject(new Error('polling deadline was ignored')),250);
   options.signal.addEventListener('abort',()=>{clearTimeout(guard);reject(options.signal.reason);},{once:true});
  });
  return Response.json({protocol:1,characterId:id,version:0,serverNow:new Date().toISOString(),world:null,battle:null,lobby:{},party:null});
 }});
 await c.load();
 await assert.rejects(c.readFrame({signal:AbortSignal.timeout(20)}),{name:'TimeoutError'});
 assert.equal(c.available,false);
 assert.equal(c.data.character.id,id);
 stall=false;
 await c.readFrame();
 assert.equal(c.available,true);
});
