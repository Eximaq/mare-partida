import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { characterCommandSchema, type CharacterCommand, type OriginalItemInstance } from "@mare/shared";
import pg from "pg";
import {readFile} from "node:fs/promises";
import { AuthService } from "../../apps/game-server/src/auth/service.js";
import { marketItemDetails, parseMarketRead } from "../../apps/game-server/src/characters/market.js";
import { lifetimeGold } from "../../apps/game-server/src/characters/dungeons.js";
import { readAchievements } from "../../apps/game-server/src/characters/achievements.js";
import { getGameCatalog } from "../../apps/game-server/src/gameplay/catalog.js";
import { authDatabase } from "./auth-support.mjs";

const { items } = getGameCatalog();
const item = (def: number, fields: Partial<OriginalItemInstance> = {}): OriginalItemInstance =>
  ({ id: randomUUID(), def, level: 44, plus: 2, obtainedAt: 1200, locked: false, ...fields });
const gun = () => item(items.findIndex(x => x.name === "Mosquete de Convés"), {
  rarity: "rare", potential: 88, baseStats: { attack: 28, defense: 0, hp: 14 },
  extras: [{ stat: "dexterity", value: 11 }],
  generation: { version: 1, family: "native", nativeRarity: "rare", source: "market-fixture" },
});
const fruit = (rank: "E" | "A" | "B" | "S") => {
  const def = items.findIndex(x => x.rank === rank && x.type === "akuma_no_mi");
  return item(def, { type: "akuma_no_mi", fruitId: String(items[def]!.fruitId) });
};

async function createActor(service: AuthService, pool: pg.Pool, name: string) {
  const email = randomUUID() + "@example.invalid";
  const login = await service.login(email, "fixture");
  const { id } = await service.createCharacter(login.token, { name, classId: "sword", factionId: "pirate" });
  const lease = await service.acquireControl(login.token, id);
  const control = { epoch: lease.epoch, token: lease.token };
  const input = (payload: object, requestId: string = randomUUID(), expectedVersion = 0) =>
    characterCommandSchema.parse({ requestId, expectedVersion, control, action: "market.execute", payload });
  const send = (command: CharacterCommand, actorId = id) => service.command(login.token, actorId, command);
  const query = (search = "", actorId = id) => service.marketState(login.token, actorId, parseMarketRead(new URLSearchParams(search)));
  await send({ requestId: randomUUID(), expectedVersion: (await service.characterState(login.token, id)).version, control, action: "items.initialize", payload: {} });
  await pool.query("UPDATE mare_game.character_progression SET gold=100000 WHERE character_id=$1", [id]);
  const state = () => service.characterState(login.token, id);
  return { id, email, input, send, query, control, state };
}
async function stock(pool: pg.Pool, id: string, inventory: OriginalItemInstance[]) {
  await pool.query("UPDATE mare_game.game_inventory SET inventory=$2::jsonb WHERE character_id=$1", [id, JSON.stringify(inventory)]);
}

type MarketEntry = { id: string; instanceId?: string; item: { instanceId: string; catalogId: number; rank: string; rarity: string; classId: string }; highestOffer?: number;
  seller?: { id: string; name: string }; ownProposal?: { id: string; version: number; amount: number } | null;
  proposals?: Array<{ buyer: { id: string } }>; listing?: MarketEntry; mailId?: string };
function list(page: Awaited<ReturnType<Awaited<ReturnType<typeof createActor>>["query"]>>) {
  assert.ok("entries" in page);
  return { ...page, entries: page.entries as MarketEntry[] };
}
async function assertRewardBerry(pool: pg.Pool, owner: Awaited<ReturnType<typeof createActor>>, expected: number) {
  const state = await owner.state();
  const client = await pool.connect();
  try {
    assert.equal(await lifetimeGold(client, owner.id, state.gold), expected);
    const achievements = await readAchievements(client, owner.id, state, { power: 0, prison: null, haki: null, fruits: null });
    assert.equal(achievements?.records.coins, expected);
  } finally {
    client.release();
  }
}
const direct = (i: OriginalItemInstance, price = 100) => ({ kind: "market_publish", mode: "direct", itemId: i.id, quantity: 1, price, hours: 24 });

test("market commands enforce ownership, retain exact receipts and reveal offers only to their owners", () => authDatabase(async ({ service, pool }) => {
  const seller = await createActor(service, pool, "Comércio Privado");
  const buyer = await createActor(service, pool, "Comprador Privado");
  const observer = await createActor(service, pool, "Observador Privado");
  const weapon = gun(), locked = item(weapon.def, { locked: true });
  const bound = item(weapon.def, { binding: "character", boundToCharacter: seller.id });
  await stock(pool, seller.id, [weapon, locked, bound]);

  assert.throws(() => seller.input({ ...direct(weapon), details: { name: "Falso" } }));
  assert.throws(() => seller.input({ ...direct(weapon), sellerId: buyer.id }));
  assert.throws(() => seller.input({ ...direct(weapon), item: weapon }));
  assert.throws(() => seller.input({ ...direct(weapon), price: 10.5 }));
  assert.throws(() => seller.input({ ...direct(weapon), feeBps: 50 }));
  assert.throws(() => parseMarketRead(new URLSearchParams("view=market&rank=A&rank=B")), { code: "invalid_request" });
  assert.throws(() => parseMarketRead(new URLSearchParams("view=market&minLevel=50&maxLevel=30")), { code: "invalid_request" });
  assert.throws(() => parseMarketRead(new URLSearchParams("view=market&accountId=123")), { code: "invalid_request" });
  await assert.rejects(observer.query("view=inventory", seller.id), { code: "character_not_found" });
  await assert.rejects(observer.send(observer.input(direct(weapon)), seller.id), { code: "character_not_found" });
  await assert.rejects(buyer.send(buyer.input(direct(weapon))), { code: "market_item_unavailable" });
  await assert.rejects(seller.send(seller.input(direct(locked))), { code: "market_item_locked" });
  await assert.rejects(seller.send(seller.input(direct(bound))), { code: "market_item_untradable" });
  assert.deepEqual(list(await seller.query("view=inventory")).entries.map(x => x.instanceId ?? x.item?.instanceId), [weapon.id]);

  const terms = { kind: "market_publish", mode: "auction", itemId: weapon.id, quantity: 1, minOffer: 1000, buyNow: 5000, hours: 24 };
  const publication = seller.input(terms);
  const sent = await seller.send(publication);
  assert.ok(sent.market);
  const listingId = String(sent.market.listingId);
  const version = Number(sent.market.version);
  assert.deepEqual(await seller.send(publication), sent);
  await assert.rejects(seller.send(seller.input({ ...terms, minOffer: 1100 }, publication.requestId)), { code: "idempotency_conflict" });
  assert.equal(list(await seller.query("view=inventory")).entries.length, 0);

  const proposal = buyer.input({ kind: "market_offer", listingId, version, amount: 2300 });
  const offer = await buyer.send(proposal);
  assert.ok(offer.market);
  assert.deepEqual(await buyer.send(proposal), offer);
  const publicEntry = list(await observer.query("view=market")).entries[0]!;
  assert.equal(publicEntry.highestOffer, 2300);
  assert.equal(publicEntry.ownProposal, null);
  assert.ok(!("proposals" in publicEntry));
  assert.ok(!JSON.stringify(publicEntry).includes(buyer.id));
  assert.equal(list(await buyer.query("view=market")).entries[0]!.ownProposal?.id, offer.market.proposalId);
  assert.equal(list(await seller.query("view=sales&status=proposals")).entries[0]!.proposals?.[0]?.buyer.id, buyer.id);
  assert.equal(list(await observer.query("view=sales")).entries.length, 0);
  assert.equal(list(await observer.query("view=offers")).entries.length, 0);
  assert.deepEqual(await seller.query("view=badge"), { pending: 1 });
  await assertRewardBerry(pool, buyer, 100000);

  const accept = seller.input({ kind: "market_accept", listingId, version,
    proposalId: offer.market.proposalId, proposalVersion: offer.market.proposalVersion });
  await assert.rejects(observer.send(observer.input(accept.payload)), { code: "market_not_seller" });
  const sale = await seller.send(accept);
  assert.ok(sale.market);
  assert.deepEqual(await seller.send(accept), sale);
  assert.equal(Number(sale.market.net), 2070);
  assert.equal(list(await buyer.query("view=purchases")).entries[0]!.listing?.item.instanceId, weapon.id);
  assert.equal(list(await observer.query("view=purchases")).entries.length, 0);
  assert.equal(Number((await pool.query("SELECT count(*) AS n FROM mare_game.social_mail WHERE source='market' AND source_id=$1", [listingId])).rows[0]!.n), 1);
  assert.equal(Number((await pool.query("SELECT gold FROM mare_game.character_progression WHERE character_id=$1", [buyer.id])).rows[0]!.gold), 97700);
  await assertRewardBerry(pool, buyer, 100000);
  const claim = await seller.send(seller.input({ kind: "market_collect", saleId: listingId }));
  assert.equal(claim.state.gold, "102070");
  await assertRewardBerry(pool, seller, 100000);
  const newSession = await service.login(buyer.email, "fixture");
  assert.equal(list(await service.marketState(newSession.token, buyer.id, parseMarketRead(new URLSearchParams("view=purchases")))).entries[0]!.mailId, sale.market.mailId);
}));

test("market filters compose, distinguish fruit rank from rarity and page stable public results", () => authDatabase(async ({ service, pool }) => {
  const seller = await createActor(service, pool, "Lojista de Teste");
  const viewer = await createActor(service, pool, "Espadachim de Teste");
  const weapon = gun(), a = fruit("A"), b = fruit("B"), s = fruit("S"), e = fruit("E");
  const extra = Array.from({ length: 24 }, () => gun());
  await stock(pool, seller.id, [weapon, a, b, s, e, ...extra]);
  for (const gear of [weapon, a, b, s, e, ...extra]) {
    const payload = { ...direct(gear, gear.id === weapon.id ? 99 : 120), item: gear, details: marketItemDetails(gear) };
    await pool.query("SELECT mare_game.market_command($1,$2::jsonb,1000,100,0)", [seller.id, JSON.stringify(payload)]);
  }
  const read = async (s: string) => list(await viewer.query(s));
  assert.deepEqual((await read("view=market&category=fruits&rank=A&rarity=legendary")).entries.map(x => x.item.rank), ["A"]);
  assert.deepEqual((await read("view=market&category=fruits&rarity=legendary")).entries.map(x => x.item.rank).sort(), ["A", "B"]);
  assert.deepEqual((await read("view=market&category=fruits&rarity=supreme")).entries.map(x => x.item.rank), ["S"]);
  assert.deepEqual((await read("view=market&category=fruits&fruitType=paramecia&rank=E")).entries.map(x => x.item.rank), ["E"]);

  const filters = new URLSearchParams({ view: "market", q: "  MOSQUETE DE CONVES ", category: "weapons", classId: "gunner",
    minLevel: "40", maxLevel: "44", minPotential: "85", attribute: "dexterity", origin: "native", sort: "price_asc" });
  const first = await read(filters.toString());
  assert.equal(first.entries[0]!.item.instanceId, weapon.id);
  assert.equal(first.entries.length, 24);
  assert.equal(first.hasMore, true);
  assert.ok(first.entries.every(e => e.item.classId === "gunner"), "Sword user can see gunner gear");
  filters.set("page", "2");
  const second = await read(filters.toString());
  assert.equal(second.entries.length, 1);
  assert.equal(second.hasMore, false);
  assert.ok(first.entries.every(e => e.id !== second.entries[0]!.id));
}));

test("a custom runtime role can publish and buy through the authorized API but cannot rewrite market rows",()=>authDatabase(async f=>{
 const role='market_'+randomUUID().replaceAll('-',''),password=randomUUID().replaceAll('-','');
 await f.pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
 let runtime:pg.Pool|undefined;
 try{
  await f.pool.query((await readFile(new URL('../../infra/postgres/grant-auth.sql',import.meta.url),'utf8')).replaceAll('mare_runtime','"'+role+'"'));
  const url=new URL(f.pool.options.connectionString!);url.username=role;url.password=password;runtime=new pg.Pool({connectionString:url.href,max:2});
  const service=new AuthService({pool:runtime,provider:f.provider,vault:f.vault,policy:{absoluteMs:3600000,idleMs:300000,recheckMs:60000},origin:'https://localhost:9443'});
  const seller=await createActor(service,f.pool,'Runtime Seller'),buyer=await createActor(service,f.pool,'Runtime Buyer'),weapon=gun();
  await stock(f.pool,seller.id,[weapon]);
  const publication=await seller.send(seller.input(direct(weapon)));
  const listingId=String(publication.market!.listingId),version=Number(publication.market!.version);
  assert.equal(list(await buyer.query('view=market')).entries.length,1);
  const command=buyer.input({kind:'market_buy',listingId,version,amount:100});
  const purchase=await buyer.send(command);assert.deepEqual(await buyer.send(command),purchase);
  assert.equal((await f.pool.query("SELECT count(*)::int n FROM mare_game.social_mail WHERE source='market' AND source_id=$1",[listingId])).rows[0].n,1);
  for(const table of ['market_listings','market_proposals','market_commissions','market_notifications']){
   await assert.rejects(runtime.query('DELETE FROM mare_game.'+table+' WHERE false'),{code:'42501'});
  }
 }finally{await runtime?.end();await f.pool.query('DROP OWNED BY "'+role+'"; DROP ROLE "'+role+'"');}
}));
