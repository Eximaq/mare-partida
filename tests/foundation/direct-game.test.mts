import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
const { createSession } = require("../../apps/account-client/game-session.js");
const id = "11111111-1111-4111-8111-111111111111";
function fixture() {
  let version = 0,
    fail = false;
  let renewalStatus=200, acquisitionStatus=200;
  const requests: any[] = [],
    storage = new Map();
  const snapshot = () => ({
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
      if (path === "/v1/auth/csrf")
        return Response.json({ csrfToken: "fixture" });
      if (path.endsWith("/online-state")) return Response.json(snapshot());
      if(path.endsWith('/control/renew'))return renewalStatus===200?Response.json({epoch:1}):Response.json({error:renewalStatus===409?'control_conflict':'unavailable'},{status:renewalStatus});
      if (path.endsWith("/control"))
        return acquisitionStatus===200?Response.json({ epoch: 1, token: "x".repeat(43) }):Response.json({error:'control_conflict'},{status:409});
      if (path.endsWith("/commands")) {
        if (fail) throw new Error("lost reply");
        version++;
        return Response.json({});
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
