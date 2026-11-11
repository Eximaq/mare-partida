import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../../apps/account-client/game-ui.js", import.meta.url), "utf8");

function mountWithClock() {
  let now = 10_000;
  let timerId = 0;
  const timers = new Map<number, { due: number; fn: () => void; repeat: number }>();
  const events = new Map<string, () => void>();
  const reads: Array<{ at: number; kind: string }> = [];
  const meter = { setAttribute() {}, remove() {}, dataset: {}, textContent: "", title: "" };
  const clock = {
    Date: { now: () => now },
    performance: { now: () => now },
    setInterval(fn: () => void, delay: number) { return schedule(fn, delay, delay); },
    setTimeout(fn: () => void, delay: number) { return schedule(fn, delay); },
    clearInterval(id: number) { timers.delete(id); },
    clearTimeout(id: number) { timers.delete(id); },
    document: {
      hidden: false,
      createElement: () => meter,
      body: { append() {} },
      addEventListener() {},
      removeEventListener() {},
    },
    addEventListener(name: string, fn: () => void) { events.set(name, fn); },
    MareOnlineGameUI: null as any,
  };
  function schedule(fn: () => void, delay: number, repeat = 0) {
    const id = ++timerId;
    timers.set(id, { due: now + delay, fn, repeat });
    return id;
  }
  async function tick(at: number) {
    now = at;
    for (const [id, timer] of [...timers]) {
      if (timer.due > now) continue;
      if (timer.repeat) timer.due += timer.repeat;
      else timers.delete(id);
      timer.fn();
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  const client = {
    available: true,
    controlled: true,
    busy: false,
    data: { online: { battle: {} } },
    network: { rttMs: 102, ageMs: 395, intervalMs: 759 },
    subscribe() {},
    async read() { reads.push({ at: now, kind: "full" }); },
    async readFrame() { reads.push({ at: now, kind: "frame" }); },
    async renew() {},
  };
  runInNewContext(source, clock);
  clock.MareOnlineGameUI.mount(client, { message() {} });
  return { tick, reads, meter, client, close: () => events.get("pagehide")?.() };
}

test("a timer firing just before the 750 ms deadline does not lose a polling slot", async () => {
  const f = mountWithClock();
  try {
    await f.tick(10_251);
    await f.tick(10_500);
    await f.tick(10_750);
    await f.tick(11_000);
    await f.tick(11_001);
    assert.deepEqual(f.reads, [
      { at: 10_251, kind: "full" },
      { at: 11_001, kind: "frame" },
    ]);
  } finally {
    f.close();
  }
});

test("the meter distinguishes HTTP latency and the interval between state updates", async () => {
  const f = mountWithClock();
  try {
    await f.tick(11_000);
    assert.match(f.meter.textContent, /Ping HTTP: 102 ms/);
    assert.match(f.meter.textContent, /Atualizações: 759 ms/);
    assert.match(f.meter.title, /395 ms/);
    f.client.network.ageMs = 6_000;
    await f.tick(12_000);
    assert.match(f.meter.textContent, /Sem atualizar há 6000 ms/);
  } finally {
    f.close();
  }
});
