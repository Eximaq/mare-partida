import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type pg from "pg";
import type { OriginalItemInstance } from "@mare/shared";
import type { AuthService } from "../../apps/game-server/src/auth/service.js";
import { getGameCatalog } from "../../apps/game-server/src/gameplay/catalog.js";
import { authDatabase } from "./auth-support.mjs";

type MarketResult = {
  kind: string;
  listingId: string;
  version: number;
  proposalId: string;
  proposalVersion: number;
  status: string;
  mailId: string;
  gross: number;
  fee: number;
  net: number;
  collected: number;
};
const gear = (extra: Partial<OriginalItemInstance> = {}): OriginalItemInstance => ({
  id: randomUUID(), def: 0, locked: false, level: 40, plus: 3, obtainedAt: 1200,
  rarity: "epic", potential: 75, baseStats: { attack: 118, defense: 3, hp: 200 },
  extras: [{ stat: "dexterity", value: 9 }], sockets: ["pearl_for_1", null],
  reforgeAttempts: 5, origin: "Ensaio do mercado", ...extra,
});

async function actor(service: AuthService, pool: pg.Pool, name: string, gold = 20_000) {
  const login = await service.login(randomUUID() + "@example.invalid", "fixture");
  const { id } = await service.createCharacter(login.token, { name, classId: "sword", factionId: "pirate" });
  const lease = await service.acquireControl(login.token, id);
  const control = { epoch: lease.epoch, token: lease.token };
  const state = () => service.characterState(login.token, id);
  const act = async (command: { action: "items.initialize"; payload: Record<string, never> } |
    { action: "mail.claim"; payload: { mailId: string } }) => service.command(login.token, id, {
      ...command, requestId: randomUUID(), expectedVersion: (await state()).version, control,
    });
  await act({ action: "items.initialize", payload: {} });
  await pool.query("UPDATE mare_game.character_progression SET gold=$2 WHERE character_id=$1", [id, gold]);
  return { id, state, act };
}

async function market(pool: pg.Pool, id: string, input: object, fee = 1000) {
  return (await pool.query<{ receipt: MarketResult }>(
    "SELECT mare_game.market_command($1,$2::jsonb,$3,20,0) AS receipt", [id, JSON.stringify(input), fee],
  )).rows[0]!.receipt;
}

const listingAction = (pool: pg.Pool, id: string, listing: MarketResult, kind: string, details = {}) =>
  market(pool, id, { kind: "market_" + kind, listingId: listing.listingId, version: listing.version, ...details });
const proposalKey = ({ proposalId, proposalVersion }: MarketResult) => ({ proposalId, proposalVersion });

async function publish(pool: pg.Pool, id: string, item: OriginalItemInstance, config: object, fee = 1000) {
  return market(pool, id, { kind: "market_publish", itemId: item.id, item,
    details: { name: "Sabre de teste", searchName: "sabre de teste", category: "weapons", slot: "weapon" },
    quantity: 1, hours: 24, ...config,
  }, fee);
}

async function setStock(pool: pg.Pool, id: string, inventory: OriginalItemInstance[], equipment = {}) {
  await pool.query("UPDATE mare_game.game_inventory SET inventory=$2::jsonb,equipment=equipment||$3::jsonb WHERE character_id=$1",
    [id, JSON.stringify(inventory), JSON.stringify(equipment)]);
}
async function balance(pool: pg.Pool, id: string) {
  const b = (await pool.query<{ available: string; reserved: string; receivable: string }>(
    "SELECT * FROM mare_game.market_balance($1)", [id],
  )).rows[0]!;
  return [Number(b.available), Number(b.reserved), Number(b.receivable)];
}

test("market escrow, fees and immutable mail delivery use the ordinary Berry wallet and inbox", () =>
  authDatabase(async ({ service, pool }) => {
    const seller = await actor(service, pool, "Comerciante", 0);
    const buyer = await actor(service, pool, "Comprador", 20_000);
    const rival = await actor(service, pool, "Ofertante", 8_000);
    const item = gear();
    const auctionItem = gear({ potential: 87 });
    const blocked = gear({ locked: true });
    const bound = gear({ binding: "character", boundToCharacter: seller.id });
    const equipped = gear();
    await setStock(pool, seller.id, [item, auctionItem, blocked, bound], { weapon: equipped });
    await assert.rejects(publish(pool, seller.id, equipped, { mode: "direct", price: 10 }), { message: "market_item_equipped" });
    await assert.rejects(publish(pool, seller.id, blocked, { mode: "direct", price: 10 }), { message: "market_item_locked" });
    await assert.rejects(publish(pool, seller.id, bound, { mode: "direct", price: 10 }), { message: "market_item_untradable" });
    const trade = randomUUID();
    await pool.query("INSERT INTO mare_game.social_trades(id,initiator_id,target_id,status,expires_at) VALUES($1,$2,$3,'active',clock_timestamp()+interval '2 minutes')", [trade, seller.id, rival.id]);
    await pool.query("INSERT INTO mare_game.social_trade_members(character_id,trade_id) VALUES($1,$2)", [seller.id, trade]);
    await pool.query("INSERT INTO mare_game.social_trade_reservations(character_id,item_id,trade_id,quantity,item) VALUES($1,$2,$3,1,$4)", [seller.id, item.id, trade, JSON.stringify(item)]);
    await assert.rejects(publish(pool, seller.id, item, { mode: "direct", price: 10_009 }), { message: "market_item_reserved" });
    await pool.query("DELETE FROM mare_game.social_trade_members WHERE character_id=$1", [seller.id]);
    const direct = await publish(pool, seller.id, item, { mode: "direct", price: 10_009 });
    const auction = await publish(pool, seller.id, auctionItem, { mode: "auction", minOffer: 1_000, buyNow: 14_000 }, 1500);
    await assert.rejects(publish(pool, seller.id, item, { mode: "direct", price: 10 }), { message: "market_item_unavailable" });
    await assert.rejects(listingAction(pool, seller.id, direct, "buy", { amount: 10_009 }), { message: "market_own_listing" });
    await assert.rejects(listingAction(pool, rival.id, auction, "offer", { amount: 8_001 }), { message: "market_gold_insufficient" });
    await assert.rejects(listingAction(pool, buyer.id, auction, "offer", { amount: 14_001 }), { message: "market_confirm_buy_now" });
    const initial = await listingAction(pool, buyer.id, auction, "offer", { amount: 8_000 });
    assert.deepEqual(await balance(pool, buyer.id), [12_000, 8_000, 0]);
    const revised = await listingAction(pool, buyer.id, auction, "offer", { ...proposalKey(initial), amount: 7_000 });
    assert.deepEqual(await balance(pool, buyer.id), [13_000, 7_000, 0]);
    await assert.rejects(listingAction(pool, buyer.id, auction, "withdraw", proposalKey(initial)), { message: "market_stale" });
    await listingAction(pool, rival.id, auction, "offer", { amount: 6_500 });
    const accepted = await listingAction(pool, seller.id, auction, "accept", { ...proposalKey(revised), amount: 7_000 });
    assert.deepEqual([accepted.gross, accepted.fee, accepted.net], [7_000, 1_050, 5_950]);
    assert.deepEqual(await balance(pool, buyer.id), [13_000, 0, 0]);
    assert.deepEqual(await balance(pool, rival.id), [8_000, 0, 0]);
    await assert.rejects(listingAction(pool, buyer.id, direct, "buy", { amount: 10_000 }), { message: "market_stale" });
    const bought = await listingAction(pool, buyer.id, direct, "buy", { amount: 10_009 });
    assert.deepEqual([bought.gross, bought.fee, bought.net], [10_009, 1_000, 9_009]);
    assert.deepEqual(await balance(pool, buyer.id), [2_991, 0, 0]);
    assert.deepEqual(await balance(pool, seller.id), [0, 0, 14_959]);

    const full = Array.from({ length: getGameCatalog().capacity }, () => gear());
    await setStock(pool, buyer.id, full);
    await buyer.act({ action: "mail.claim", payload: { mailId: bought.mailId } });
    const mail = async () => (await pool.query(
      "SELECT source,attachments,claimed_at FROM mare_game.social_mail WHERE id=$1", [bought.mailId],
    )).rows[0]!;
    assert.deepEqual(await mail(), { source: "market", attachments: [item], claimed_at: null });
    await setStock(pool, buyer.id, []);
    await buyer.act({ action: "mail.claim", payload: { mailId: bought.mailId } });
    await buyer.act({ action: "mail.claim", payload: { mailId: bought.mailId } });
    assert.ok((await mail()).claimed_at);
    assert.deepEqual((await pool.query("SELECT inventory FROM mare_game.game_inventory WHERE character_id=$1", [buyer.id])).rows[0]!.inventory, [item]);
    assert.deepEqual((await mail()).attachments, [item]);

    assert.equal((await market(pool, seller.id, { kind: "market_collect_all" })).collected, 14_959);
    assert.equal((await market(pool, seller.id, { kind: "market_collect_all" })).collected, 0);
    assert.deepEqual(await balance(pool, seller.id), [14_959, 0, 0]);
    assert.equal(Number((await pool.query("SELECT sum(fee) AS fee FROM mare_game.market_commissions")).rows[0]!.fee), 2_050);
  })
);

test("market closes only once under competing purchases, accept/withdraw and accept/buy-now", () =>
  authDatabase(async ({ service, pool }) => {
    const seller = await actor(service, pool, "Capitão Vendedor", 0);
    const buyer = await actor(service, pool, "Capitão Comprador");
    const rival = await actor(service, pool, "Capitão Rival");
    const items = Array.from({ length: 5 }, () => gear());
    await setStock(pool, seller.id, items);
    const direct = await publish(pool, seller.id, items[0]!, { mode: "direct", price: 1000 });
    const bought = await Promise.allSettled([buyer, rival].map(p => listingAction(pool, p.id, direct, "buy", { amount: 1000 })));
    assert.equal(bought.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(Number((await pool.query("SELECT count(*) AS n FROM mare_game.social_mail WHERE source='market' AND source_id=$1", [direct.listingId])).rows[0]!.n), 1);

    const auction = await publish(pool, seller.id, items[1]!, { mode: "auction", minOffer: 1000 });
    const held = await listingAction(pool, buyer.id, auction, "offer", { amount: 2_000 });
    const accept = () => listingAction(pool, seller.id, auction, "accept", proposalKey(held));
    const withdraw = () => listingAction(pool, buyer.id, auction, "withdraw", proposalKey(held));
    const race = await Promise.allSettled([accept(), withdraw()]);
    assert.ok(race.filter(r => r.status === "fulfilled").length <= 1);
    if (race.every(r => r.status === "rejected")) {
      assert.ok(race.every(r => r.status === "rejected" && r.reason?.message === "market_busy"));
      await withdraw();
    }
    const firstState = (await pool.query("SELECT status FROM mare_game.market_proposals WHERE id=$1", [held.proposalId])).rows[0]!.status;
    assert.ok(["accepted", "withdrawn"].includes(firstState));
    assert.equal((await balance(pool, buyer.id))[1], 0);

    const immediate = await publish(pool, seller.id, items[2]!, { mode: "auction", minOffer: 1000, buyNow: 4_000 });
    const bid = await listingAction(pool, buyer.id, immediate, "offer", { amount: 3_000 });
    const now = () => listingAction(pool, rival.id, immediate, "buy", { amount: 4_000 });
    const secondRace = await Promise.allSettled([listingAction(pool, seller.id, immediate, "accept", proposalKey(bid)), now()]);
    assert.ok(secondRace.filter(r => r.status === "fulfilled").length <= 1);
    if (secondRace.every(r => r.status === "rejected")) await now();
    assert.equal(Number((await pool.query("SELECT count(*) AS n FROM mare_game.market_commissions WHERE listing_id=$1", [immediate.listingId])).rows[0]!.n), 1);
    assert.equal((await balance(pool, buyer.id))[1], 0);

    const cancellable = await publish(pool, seller.id, items[3]!, { mode: "auction", minOffer: 1000 });
    const expiring = await publish(pool, seller.id, items[4]!, { mode: "auction", minOffer: 1000 });
    const before = (await balance(pool, rival.id))[0]!;
    await listingAction(pool, rival.id, cancellable, "offer", { amount: 1_500 });
    await listingAction(pool, rival.id, expiring, "offer", { amount: 2_000 });
    assert.deepEqual((await balance(pool, rival.id)).slice(0, 2), [before - 3_500, 3_500]);
    const cancelled = await listingAction(pool, seller.id, cancellable, "cancel");
    assert.equal(cancelled.status, "cancelled");
    await pool.query("UPDATE mare_game.market_listings SET created_at=clock_timestamp()-interval '2 days',expires_at=clock_timestamp()-interval '1 second' WHERE id=$1", [expiring.listingId]);
    assert.equal((await pool.query("SELECT mare_game.market_expire(20) AS count")).rows[0]!.count, 1);
    assert.equal((await pool.query("SELECT mare_game.market_expire(20) AS count")).rows[0]!.count, 0);
    assert.deepEqual((await balance(pool, rival.id)).slice(0, 2), [before, 0]);
    assert.deepEqual((await pool.query(
      "SELECT status,attachments FROM mare_game.market_listings l JOIN mare_game.social_mail m ON m.id=l.delivery_mail_id WHERE l.id=$1",
      [expiring.listingId],
    )).rows[0], { status: "expired", attachments: [items[4]] });
  })
);

test("expiry skips a character held by the game worker and retries without losing escrow", () =>
  authDatabase(async ({ service, pool }) => {
    const seller = await actor(service, pool, "Vendedor em Espera", 0);
    const buyer = await actor(service, pool, "Jogador em Combate");
    const item = gear();
    await setStock(pool, seller.id, [item]);
    const auction = await publish(pool, seller.id, item, { mode: "auction", minOffer: 1_000 });
    const held = await listingAction(pool, buyer.id, auction, "offer", { amount: 5_000 });
    const worker = await pool.connect();
    try {
      await worker.query("BEGIN");
      await worker.query("SELECT pg_advisory_xact_lock(hashtextextended($1,1296126533))", [buyer.id]);
      await assert.rejects(listingAction(pool, seller.id, auction, "accept", proposalKey(held)), { message: "market_busy" });
      await pool.query("UPDATE mare_game.market_listings SET created_at=clock_timestamp()-interval '2 days',expires_at=clock_timestamp()-interval '1 second' WHERE id=$1", [auction.listingId]);
      assert.equal((await pool.query("SELECT mare_game.market_expire(20) AS count")).rows[0]!.count, 0);
      assert.deepEqual(await balance(pool, buyer.id), [15_000, 5_000, 0]);
    } finally {
      await worker.query("ROLLBACK");
      worker.release();
    }
    assert.equal((await pool.query("SELECT mare_game.market_expire(20) AS count")).rows[0]!.count, 1);
    assert.deepEqual(await balance(pool, buyer.id), [20_000, 0, 0]);
    const mail = (await pool.query("SELECT attachments FROM mare_game.social_mail WHERE character_id=$1 AND source='market' AND source_id=$2", [seller.id, auction.listingId])).rows[0]!;
    assert.deepEqual(mail.attachments, [item]);
  })
);
