import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const source = readFileSync(new URL("../../game.js", import.meta.url), "utf8");
const tick = source.slice(
  source.indexOf("  function tickOnline(dt){"),
  source.indexOf("  function tick(dt){"),
);
test("original world online tick applies no local combat, rewards or regeneration and fences duplicate/uncertain attacks", async () => {
  let moves = 0,
    posts = 0,
    reject: any;
  const game = { hp: 7, xp: 20, gold: 8 };
  const session = { elapsed: 0 };
  const client: any = {
    available: true,
    controlled: false,
    busy: false,
    pending: null,
    data: { online: { combat: { status: "active", attackReady: true } } },
    command: async (action: string, payload: any) => {
      assert.equal(action, "combat.attack");
      assert.deepEqual(Object.keys(payload), []);
      posts++;
      return new Promise((_r, j) => {
        reject = j;
      });
    },
  };
  const box: any = {
    document: { hidden: false },
    game,
    session,
    ONLINE_GAME: client,
    world: {
      time: 0,
      hero: { walking: 0, attackAnim: 0, direction: "front" },
      fx: [],
    },
    keys: new Set(),
    travelPath: [],
    scene: "hunt",
    autoPlay: true,
    onlineAttackWorking: false,
    onlineUI: { error() {} },
    moveManually: () => moves++,
    classCombatController: () => null,
  };
  runInNewContext(tick + ";globalThis.step=tickOnline;", box);
  box.step(0.1);
  assert.equal(posts, 0);
  assert.equal(moves, 0);
  client.controlled = true;
  box.step(0.1);
  box.step(0.1);
  assert.equal(posts, 1);
  assert.equal(game.hp, 7);
  assert.equal(game.gold, 8);
  assert.equal(game.xp, 20);
  reject(new Error("uncertain"));
  await new Promise((r) => setImmediate(r));
  assert.equal(box.autoPlay, false);
  box.step(0.1);
  assert.equal(posts, 1);
  client.available = false;
  const elapsed = session.elapsed;
  box.step(0.1);
  assert.equal(session.elapsed, elapsed, "connection loss pauses simulation");
});

test("the /game route cannot silently boot the demo if its session script fails to load", async () => {
  let storageReads = 0;
  const messages: any[] = [];
  const box: any = {
    location: { pathname: "/game" },
    document: {
      body: {
        classList: { remove() {} },
        replaceChildren: (n: any) => messages.push(n.textContent),
      },
      createElement: () => ({ textContent: "", setAttribute() {} }),
    },
    window: {
      get localStorage() {
        storageReads++;
        throw Error("demo storage touched");
      },
    },
  };
  const prefix =
    source.slice(0, source.indexOf("  const classCombat=")) + "})();";
  await runInNewContext(prefix, box);
  assert.equal(storageReads, 0);
  assert.ok(messages.some((s) => s.includes("carregar")));
});
