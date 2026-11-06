import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const { validIntent } = require("../../apps/account-client/game-session.js");
const { project, derived } = require("../../apps/account-client/game-ui.js");
const source = readFileSync(new URL("../../game.js", import.meta.url), "utf8");

test('a native menu offers control recovery before replay when both control and a response were lost',()=>{
  const elements:any[]=[];
  const element=()=>({dataset:{},classList:{toggle(){},add(){},remove(){}},remove(){},setAttribute(){},querySelector(){return null;},querySelectorAll(){return [];},append(){},prepend(){},parentElement:{querySelector(){return null;}}});
  const dom=new Map(),session={data:{online:{originalInventory:{}}},available:true,controlled:false,busy:false,pending:{requestId:'retained'}};
  const box:any={ONLINE_GAME:session,onlineUI:{close(){}},game:{gold:50},currentPanel:'shop',renderMerchantShop(){},marketAvailable(){return false;},characterTab:null,itemIcon:()=>'',fmt:String,$:(id:string)=>{if(!dom.has(id))dom.set(id,element());return dom.get(id);},document:{querySelectorAll:()=>[],createElement:()=>{const e=element();elements.push(e);return e;}}};
  for(const name of ['MareHakiUI','MarePlayerHub','MareVoyageUI','MareCompendium','MareTalentUI'])box[name]={unmount(){}};
  const a=source.indexOf('  function renderPanel('),b=source.indexOf('  function devApply(',a);
  runInNewContext(source.slice(a,b)+';globalThis.render=renderPanel;',box);
  box.render();assert.equal(elements.at(-1).dataset.onlineAction,'control','an unauthorized replay button alone traps the player');
  session.controlled=true;box.render();assert.equal(elements.at(-1).dataset.onlineAction,'resume');
  assert.equal(session.pending.requestId,'retained','recovering control must retain the same request for replay');
});

test('equipment changes after a claimed encounter show the current fighter while active combat keeps its frozen HP',()=>{
  const data:any={character:{name:'Online',classId:'sword',factionId:'pirate'},online:{state:{level:1,gold:'0'},progression:{xpIntoLevel:'0'},attributes:{allocated:{},available:0},combat:{status:'claimed',encounterId:'old',playerHp:20,fighter:{maxHp:60}},combatPreview:{maxHp:84}}};
  const base={equipment:{},stats:{}};
  assert.equal(project(base,data).hp,84,'claimed encounter HP must not override current equipment in the lobby');
  assert.equal(derived({},data).maxHP,84);
  data.online.combat.status='active';
  assert.equal(project(base,data).hp,20);
  assert.equal(derived({},data).maxHP,60,'active encounter remains bound to its starting equipment');
});
test('opening an online menu reaches the capability-aware renderer instead of the old alpha panel',()=>{
  const box:any={ONLINE_GAME:{data:{online:{originalInventory:{}}}},game:{},closeCharacterMenu(){},closeModesMenu(){},closeCaptainMenu(){},currentPanel:null,characterTab:null,$:()=>({classList:{remove(){}}})};
  box.renderPanel=()=>{box.view='original-capability-renderer';};box.onlineUI={open(){box.view='alpha-only';}};
  const a=source.indexOf('  function openPanel('),b=source.indexOf('\n  function ',a+3);
  runInNewContext(source.slice(a,b)+';globalThis.open=openPanel;',box);box.open('inventory');
  assert.equal(box.view,'original-capability-renderer');assert.equal(box.currentPanel,'inventory');
});
test("native online inventory projects only server instances and never aliases server snapshots", () => {
  const item = {
    id: "server-instance",
    def: 8,
    level: 1,
    plus: 0,
    locked: false,
  };
  const data = {
    character: { name: "Online", classId: "sword", factionId: "pirate" },
    online: {
      state: { level: 1, gold: "85" },
      progression: { xpIntoLevel: "0" },
      attributes: { allocated: {}, available: 0 },
      combat: {},
      combatPreview: { maxHp: 60 },
      originalInventory: {
        inventory: [item],
        equipment: { boots: null },
        potions: 5,
        materials: 3,
        forgeVersion: 4,
        forgeSeq: 1,
        forgeHistory: [],
      },
    },
  };
  const g = project(
    { stats: { kills: 0 }, equipment: { boots: { id: "local" } } },
    data,
  );
  assert.equal(g.inventory[0].id, "server-instance");
  assert.equal(g.potions, 5);
  assert.equal(g.materials, 3);
  assert.equal(g.forgeSeq, 1);
  g.inventory[0].locked = true;
  assert.equal(
    item.locked,
    false,
    "UI preview cannot mutate a session snapshot",
  );
});
test("client economic intents allow original actions and reject client-supplied prices, stats and RNG", () => {
  for (const [action, payload] of [
    ["items.initialize", {}],
    ["items.equip", { itemId: "server-instance" }],
    ["items.unequip", { slot: "boots" }],
    ["items.lock", { itemId: "server-instance", locked: true }],
    ["items.sell", { itemId: "server-instance" }],
    ["potions.buy", {}],
    ["potions.use", {}],
    ["potions.buy", {kind: "mana", quantity: 2}],
    ["potions.use", {kind: "mana"}],
    [
      "forge.execute",
      {
        operation: {
          type: "upgrade",
          itemId: "server-instance",
          expectedSeq: 0,
        },
      },
    ],
  ])
    assert.equal(validIntent(action, payload), true);
  for (const [action, payload] of [
    ["potions.buy", { price: 0 }],
    ["potions.buy", { kind: "mana", quantity: 100 }],
    ["potions.use", { kind: "mana", quantity: 2 }],
    ["items.equip", { itemId: "x", attack: 999 }],
    ["items.sell", { itemId: "x", ownerId: "other" }],
    [
      "forge.execute",
      {
        operation: { type: "upgrade", itemId: "x", expectedSeq: 0, random: 0 },
      },
    ],
  ])
    assert.equal(validIntent(action, payload), false);
});
test("original online buttons submit intentions without running offline gold, item or forge mutations", async () => {
  const calls: any[] = [],
    game = { gold: 85, potions: 5, inventory: [], equipment: {}, forgeSeq: 0 };
  const box: any = {
    toast() {},
    saveGame() {},
    updateUI() {},
    MareAkuma: {
      isFruit() {
        throw Error("offline item mutation must not run");
      },
    },
    ONLINE_GAME: { enabled: true },
    game,
    onlineItemCommand: async (a: string, p: any) => {
      calls.push([a, JSON.parse(JSON.stringify(p))]);
      return false;
    },
    MareForge: {
      execute() {
        throw Error("offline RNG must not run");
      },
    },
  };
  for (const [name, next] of [
    ["equipItem", "unequip"],
    ["unequip", "sellItem"],
    ["sellItem", "forgeCost"],
    ["performForgeOperation", "extraListHtml"],
  ]) {
    const start = source.search(
      new RegExp("  (?:async )?function " + name + "\\("),
    );
    const end = source.search(
      new RegExp("  (?:async )?function " + next + "\\("),
    );
    const code = source.slice(start, end);
    runInNewContext(code + ";globalThis.action=" + name, box);
    await box.action(
      name === "unequip"
        ? "boots"
        : name === "performForgeOperation"
          ? { type: "upgrade", itemId: "server-instance", expectedSeq: 0 }
          : "server-instance",
    );
  }
  assert.deepEqual(
    calls.map((c) => c[0]),
    [
      "items.equip",
      "items.unequip",
      "items.sell",
      "forge.execute",
    ],
  );
  assert.deepEqual(game, {
    gold: 85,
    potions: 5,
    inventory: [],
    equipment: {},
    forgeSeq: 0,
  });
});
test("native forge dialog projects its shared UI fields into the strict operation contract", async () => {
  let sent: any;
  const box: any = {
    ONLINE_GAME: { enabled: true },
    onlineItemCommand: async (_a: string, p: any) => {
      sent = p;
      return false;
    },
  };
  const a = source.indexOf("  function performForgeOperation("),
    b = source.indexOf("  function extraListHtml(", a);
  runInNewContext(
    source.slice(a, b) + ";globalThis.run=performForgeOperation;",
    box,
  );
  const accepted = await box.run({
    type: "upgrade",
    itemId: "server-instance",
    expectedSeq: 0,
    pearlItemId: null,
    pearlId: null,
    socket: 0,
    line: NaN,
    itemIds: [],
    slot: "weapon",
  });
  assert.equal(accepted,false,"a rejected online action must keep its confirmation open");
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), {
    operation: { type: "upgrade", expectedSeq: 0, itemId: "server-instance" },
  });
});
