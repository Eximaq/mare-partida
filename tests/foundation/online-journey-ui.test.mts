import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

const source = readFileSync(new URL("../../apps/account-client/account.js", import.meta.url), "utf8");
const id = "11111111-1111-4111-8111-111111111111";
const key = "mare-online-pending-v1";
const settle = async () => { for (let i = 0; i < 10; i++) await new Promise<void>(r => setImmediate(r)); };
class Element {
  hidden = false; disabled = false; value = ""; textContent = ""; required = false; autocomplete = "";
  dataset: Record<string,string> = {}; listeners = new Map<string,(event: any) => void>();
  setAttribute() {} removeAttribute() {} focus() {}
  addEventListener(event: string, listener: (event: any) => void) { this.listeners.set(event, listener); }
}
function page(storage = new Map<string,string>()) {
  const elements = new Map<string,Element>();
  const get = (selector: string) => { if (!elements.has(selector)) elements.set(selector,new Element()); return elements.get(selector)!; };
  const model = { level:1, experience:"0", progression:undefined as any, started: false, hunt: "locked", combatStatus: "locked", canBegin: undefined as boolean|undefined, turn: 0, lastRequestId: null as string|null, attackReady: false, version: 0, characterId: id, failRead: false, controlFailure: false, requests: [] as any[],
    me: null as null | ((signal?: AbortSignal) => Promise<Response>), send: null as null | (() => Promise<Response>),
    control: null as null | (() => Promise<Response>) };
  const timers: Array<() => void> = [];
  const deadlines = new Map<number,()=>void>(); let timerId = 0;
  const snapshot = () => ({ state: { characterId: model.characterId, version: model.version, level: model.level, experience: model.experience, gold: "9007199254740993" }, progression:model.progression, journey: { started: model.started }, hunt: { catalogId:"dock-patrol-v1",name:"Ronda do cais",durationSeconds:30,experience:"20",gold:"8",status:model.hunt,startedAt:null,readyAt:null,serverNow:new Date().toISOString() }, combat:{catalogId:"dock-raider-v1",enemyName:"Fixture enemy",status:model.combatStatus,canBegin:model.canBegin,turn:model.turn,playerHp:30,enemyHp:36,playerMaxHp:30,enemyMaxHp:36,attackReady:model.attackReady,lastRequestId:model.lastRequestId,nextAttackAt:null,lastAttack:null,experience:"30",gold:"12"} });
  runInNewContext(source, {
    URL, AbortController, setTimeout(fn:()=>void) { deadlines.set(++timerId,fn); return timerId; },
    clearTimeout(id:number) { deadlines.delete(id); }, crypto: { randomUUID }, confirm: () => true,
    location: { href: "https://localhost:9443/online/" }, history: { replaceState() {} },
    document: { hidden: false, querySelector: get, querySelectorAll: () => [] },
    setInterval(fn: () => void) { timers.push(fn); },
    sessionStorage: {
      getItem(k: string) { assert.equal(k,key); return storage.get(k) ?? null; },
      setItem(k: string,v: string) { assert.equal(k,key); storage.set(k,v); },
      removeItem(k: string) { assert.equal(k,key); storage.delete(k); },
    },
    localStorage: { getItem() { assert.fail("demo saves must never be read"); }, setItem() { assert.fail("demo saves must never be written"); } },
    fetch: async (path: string, options: any = {}) => {
      if (path === "/v1/auth/csrf") return Response.json({ csrfToken: "fixture" });
      if (path === "/v1/me") return model.me ? model.me(options.signal) : Response.json({ account: { id: "account-fixture" }, character: { id: model.characterId, name: "Fixture", classId: "sword" } });
      if (path.endsWith("/online-state")) { if (model.failRead) throw new TypeError("offline"); return Response.json(snapshot()); }
      if (path.endsWith("/control")) return model.control ? model.control() : Response.json({ epoch: 1, token: "x".repeat(43), leaseSeconds: 120 });
      if (path.endsWith("/control/renew")) return model.controlFailure ? Response.json({ error: "control_conflict" },{ status: 409 }) : Response.json({ epoch:1, leaseSeconds:120 });
      if (path.endsWith("/commands")) {
        model.requests.push(JSON.parse(options.body));
        if (model.send) return model.send();
        const action=model.requests.at(-1).action;
        if(action==="journey.begin") {model.started=true;model.hunt="available";}
        if(action==="hunt.begin") model.hunt="active";
        if(action==="hunt.claim") {model.hunt="claimed";model.combatStatus="available";}
        if(action==="combat.begin") model.combatStatus="active";
        if(action==="combat.attack") {model.turn++;model.attackReady=false;}
        if(action==="combat.claim") model.combatStatus="claimed";
        if(action.startsWith("combat.")) model.lastRequestId=model.requests.at(-1).requestId;
        model.version++;
        return Response.json({ requestId: model.requests.at(-1).requestId, action: "journey.begin", state: snapshot().state });
      }
      if (path === "/v1/auth/logout") return new Response(null,{status:204});
      throw new Error("Unexpected fixture route: " + path);
    },
  });
  const click = (selector: string) => { const fn = get(selector).listeners.get("click"); assert.ok(fn,selector+" must be wired"); fn({}); };
  return { get, model, click, timers, storage, expire: () => { for (const fn of [...deadlines.values()]) fn(); } };
}
test("panel reads server state precisely, requires control and starts the journey without using demo storage", async () => {
  const p=page(); await settle();
  assert.equal(p.get("#online-level").textContent,"1");
  assert.equal(p.get("#online-gold").textContent,"9007199254740993");
  assert.equal(p.get("#journey-start").disabled,true);
  p.click("#control"); await settle(); assert.equal(p.get("#journey-start").disabled,false);
  p.click("#journey-start"); await settle();
  assert.equal(p.model.requests.length,1);
  assert.equal(p.model.requests[0].action,"journey.begin");
  assert.deepEqual(p.model.requests[0].payload,{});
  assert.match(p.get("#journey-state").textContent,/iniciada/);
  assert.equal(p.get("#journey-start").disabled,true);
  assert.equal(p.storage.size,0);
});
test("lost reply is reconciled by a read and concurrent clicks never send twice", async () => {
  const p=page(); await settle(); p.click("#control"); await settle();
  let reject!: (error: Error)=>void;
  p.model.send=()=>new Promise((_resolve,r)=>{reject=r;});
  p.click("#journey-start"); p.click("#journey-start"); await settle();
  assert.equal(p.model.requests.length,1); assert.ok(p.storage.has(key));
  p.model.started=true; p.model.version=1; reject(new TypeError("lost response")); await settle();
  assert.match(p.get("#journey-state").textContent,/iniciada/); assert.equal(p.storage.size,0);
  assert.equal(p.model.requests.length,1);
});
test("reload resumes the same request ID with fresh control, stores no credentials and never auto-posts", async () => {
  const p=page(); await settle(); p.click("#control"); await settle();
  p.model.send=async()=>{throw new TypeError("offline");};
  p.click("#journey-start"); await settle();
  const request=p.model.requests[0]; const saved=JSON.parse(p.storage.get(key)!);
  assert.deepEqual(Object.keys(saved).sort(),["characterId","expectedVersion","requestId"]);
  const reloaded=page(p.storage); await settle(); assert.equal(reloaded.model.requests.length,0);
  assert.equal(reloaded.get("#journey-start").disabled,true);
  reloaded.click("#control"); await settle(); reloaded.click("#journey-start"); await settle();
  assert.equal(reloaded.model.requests[0].requestId,request.requestId);
  assert.equal(reloaded.model.requests[0].expectedVersion,request.expectedVersion);
});
test("offline state disables commands; control renewal failure fences this tab", async () => {
  const p=page(); await settle(); p.click("#control"); await settle();
  p.model.failRead=true; p.click("#online-refresh"); await settle(); assert.equal(p.get("#journey-start").disabled,true);
  p.model.failRead=false; p.click("#online-refresh"); await settle();
  p.model.controlFailure=true; p.timers[1]!(); await settle(); assert.equal(p.get("#journey-start").disabled,true);
  p.click("#journey-start"); await settle(); assert.equal(p.model.requests.length,0);
});
test("stale refresh cannot restore a logged-out view; changing account character drops pending intent and control", async () => {
  const p=page(); await settle(); p.click("#control"); await settle();
  let release!: (r: Response)=>void;
  p.model.me=()=>new Promise(r=>{release=r;}); p.click("#online-refresh"); await settle();
  p.click("#logout"); await settle();
  release(Response.json({ account:{id:"account-fixture"},character:{id,name:"Old",classId:"sword"} })); await settle();
  assert.equal(p.get("#signed-in").hidden,true);
  const other=page(new Map([[key,JSON.stringify({characterId:id,requestId:randomUUID(),expectedVersion:0})]]));
  other.model.characterId="22222222-2222-4222-8222-222222222222";
  await settle(); other.click("#online-refresh"); await settle();
  assert.equal(other.storage.size,0); assert.equal(other.get("#journey-start").disabled,true);
});
test("a delayed control response cannot resurrect control after logout", async () => {
  const p=page(); await settle(); let release!: (r:Response)=>void;
  p.model.control=()=>new Promise(r=>{release=r;}); p.click("#control"); await settle();
  p.click("#logout"); await settle();
  release(Response.json({epoch:1,token:"x".repeat(43),leaseSeconds:120})); await settle();
  assert.equal(p.get("#control-state").textContent,"Nenhum controle solicitado nesta aba.");
  assert.equal(p.get("#journey-start").disabled,true);
});
test("definitive quota refusal explains the wait instead of claiming success", async () => {
  const p=page(); await settle(); p.click("#control"); await settle();
  p.model.send=async()=>Response.json({error:"command_rate_limited"},{status:429});
  p.click("#journey-start"); await settle();
  assert.match(p.get("#journey-message").textContent,/Aguarde um minuto/);
  assert.equal(p.model.requests.length,1); assert.equal(p.model.started,false);
});
test("a stalled account read times out visibly and a later refresh recovers", async () => {
  const p=page(); await settle();
  p.model.me=signal=>new Promise((_resolve,reject)=>signal?.addEventListener("abort",()=>reject(new Error("fixture abort"))));
  p.click("#online-refresh"); await settle(); p.expire(); await settle();
  assert.match(p.get("#status").textContent,/conexão/);
  assert.equal(p.get("#journey-start").disabled,true);
  p.model.me=null; p.click("#online-refresh"); await settle(); assert.equal(p.get("#online-level").textContent,"1");
});


test("hunt UI requires confirmed server readiness and never sends rewards or local time",async()=>{
  const p=page();await settle();p.click("#control");await settle();
  assert.equal(p.get("#hunt-start").disabled,true);
  p.click("#journey-start");await settle();assert.equal(p.get("#hunt-start").disabled,false);
  p.click("#hunt-start");p.click("#hunt-start");await settle();
  assert.equal(p.model.requests.length,2);assert.equal(p.model.requests[1].action,"hunt.begin");
  assert.deepEqual(p.model.requests[1].payload,{});assert.equal(p.get("#hunt-claim").disabled,true);
  p.click("#hunt-claim");await settle();assert.equal(p.model.requests.length,2);
  p.model.hunt="ready";p.click("#online-refresh");await settle();
  assert.equal(p.get("#hunt-claim").disabled,false);p.click("#hunt-claim");await settle();
  assert.equal(p.model.requests[2].action,"hunt.claim");assert.deepEqual(p.model.requests[2].payload,{});
  assert.equal(p.get("#hunt-claim").disabled,true);assert.match(p.get("#hunt-state").textContent,/recebida/);
});

for(const action of ["hunt.begin","hunt.claim"]) test(`lost ${action} survives reload with same ID; GET reconciles committed milestone`,async()=>{
  const p=page();p.model.started=true;p.model.hunt=action==="hunt.begin"?"available":"ready";await settle();
  p.click("#control");await settle();p.model.send=async()=>{throw new TypeError("offline");};
  const button=action==="hunt.begin"?"#hunt-start":"#hunt-claim";
  p.click(button);await settle();assert.equal(p.model.requests.length,1);
  const original=p.model.requests[0], saved=JSON.parse(p.storage.get(key)!);
  assert.deepEqual(Object.keys(saved).sort(),["action","characterId","expectedVersion","requestId"]);
  assert.equal(saved.action,action);
  const reload=page(p.storage);reload.model.started=true;reload.model.hunt=p.model.hunt;await settle();
  assert.equal(reload.model.requests.length,0);reload.click("#control");await settle();
  reload.model.send=async()=>{reload.model.hunt=action==="hunt.begin"?"active":"claimed";throw new TypeError("lost after commit");};
  reload.click(button);await settle();assert.equal(reload.model.requests[0].requestId,original.requestId);
  assert.equal(reload.model.requests[0].expectedVersion,original.expectedVersion);assert.equal(reload.storage.size,0);
});


test("combat UI only attacks when server confirms cooldown and never sends HP, RNG or rewards",async()=>{
  const p=page();p.model.started=true;p.model.hunt="claimed";p.model.combatStatus="available";await settle();
  assert.equal(p.get("#combat-start").disabled,true);p.click("#control");await settle();
  p.click("#combat-start");await settle();assert.equal(p.model.requests[0].action,"combat.begin");
  assert.equal(p.get("#combat-attack").disabled,true);p.click("#combat-attack");await settle();assert.equal(p.model.requests.length,1);
  p.model.attackReady=true;p.click("#online-refresh");await settle();p.click("#combat-attack");p.click("#combat-attack");await settle();
  assert.equal(p.model.requests.length,2);assert.equal(p.model.requests[1].action,"combat.attack");assert.deepEqual(p.model.requests[1].payload,{});
  p.model.combatStatus="lost";p.click("#online-refresh");await settle();
  assert.equal(p.get("#combat-attack").disabled,true);assert.equal(p.get("#combat-claim").disabled,true);
});

test("uncertain attack survives another controller's later result; resume replays original ID even after battle ends",async()=>{
  const p=page();p.model.started=true;p.model.hunt="claimed";p.model.combatStatus="active";p.model.attackReady=true;await settle();
  p.click("#control");await settle();p.model.send=async()=>{throw new TypeError("lost reply");};
  p.click("#combat-attack");await settle();const original=p.model.requests[0];
  assert.equal(JSON.parse(p.storage.get(key)!).action,"combat.attack");
  const reload=page(p.storage);reload.model.started=true;reload.model.hunt="claimed";reload.model.combatStatus="won";
  reload.model.turn=3;reload.model.lastRequestId=randomUUID();await settle();
  assert.ok(reload.storage.has(key),"another attack must not confirm this request");assert.equal(reload.model.requests.length,0);
  reload.click("#control");await settle();assert.equal(reload.get("#combat-attack").disabled,false);
  assert.equal(reload.get("#combat-claim").disabled,true);
  reload.model.send=async()=>Response.json({requestId:original.requestId});
  reload.click("#combat-attack");await settle();assert.equal(reload.model.requests[0].requestId,original.requestId);
  assert.equal(reload.model.requests[0].expectedVersion,original.expectedVersion);assert.equal(reload.storage.size,0);
  assert.equal(reload.get("#combat-claim").disabled,false);
});

test("a lost attack reply is reconciled only by its matching server request ID",async()=>{
  const p=page();p.model.started=true;p.model.hunt="claimed";p.model.combatStatus="active";p.model.attackReady=true;await settle();
  p.click("#control");await settle();p.model.send=async()=>{p.model.turn=1;p.model.lastRequestId=p.model.requests.at(-1).requestId;throw new TypeError("lost reply");};
  p.click("#combat-attack");await settle();assert.equal(p.model.requests.length,1);assert.equal(p.storage.size,0);
});

for (const action of ["combat.begin","combat.claim"]) test(`a later encounter cannot confirm a pending ${action}`,async()=>{
  const requestId=randomUUID(),storage=new Map([[key,JSON.stringify({characterId:id,requestId,expectedVersion:4,action})]]);
  const p=page(storage);p.model.started=true;p.model.hunt="claimed";p.model.combatStatus="claimed";p.model.lastRequestId=randomUUID();await settle();
  assert.ok(storage.has(key));assert.equal(p.model.requests.length,0);
  p.click("#control");await settle();p.click(action==="combat.begin"?"#combat-start":"#combat-claim");await settle();
  assert.equal(p.model.requests[0].requestId,requestId);assert.equal(storage.size,0);
});
test("repeat encounter button obeys server eligibility without automatically starting or restoring HP",async()=>{
  const p=page();p.model.started=true;p.model.hunt="claimed";p.model.combatStatus="lost";p.model.canBegin=false;await settle();
  p.click("#control");await settle();assert.equal(p.get("#combat-start").disabled,true);
  p.model.canBegin=true;p.click("#online-refresh");await settle();assert.equal(p.get("#combat-start").disabled,false);
  assert.equal(p.model.requests.length,0);p.click("#combat-start");await settle();assert.equal(p.model.requests[0].action,"combat.begin");
});

test("level panel displays server thresholds/earned points, preserves total XP and never allocates automatically",async()=>{
  const p=page();p.model.level=2;p.model.experience="80";p.model.progression={catalogId:"online-levels-v1",maxLevel:20,earnedAttributePoints:5,xpIntoLevel:"0",xpForNextLevel:"105",xpToNextLevel:"105",atCap:false};await settle();
  assert.equal(p.get("#online-level").textContent,"2");assert.equal(p.get("#online-xp").textContent,"80");
  assert.match(p.get("#level-progress").textContent,/0 \/ 105/);assert.match(p.get("#level-points").textContent,/5/);assert.equal(p.model.requests.length,0);
  p.model.level=20;p.model.experience="9223372036854775807";p.model.progression={...p.model.progression,earnedAttributePoints:95,xpIntoLevel:"9223372036854757598",xpForNextLevel:null,xpToNextLevel:null,atCap:true};
  p.click("#online-refresh");await settle();assert.match(p.get("#level-progress").textContent,/máximo/);assert.equal(p.get("#online-xp").textContent,"9223372036854775807");
  p.click("#logout");await settle();assert.equal(p.get("#level-points").textContent,"");
});
test("invalid level metadata blocks online commands instead of presenting forged points",async()=>{
  const p=page();p.model.progression={catalogId:"online-levels-v1",maxLevel:20,earnedAttributePoints:999,xpIntoLevel:"0",xpForNextLevel:"80",xpToNextLevel:"80",atCap:false};await settle();
  p.click("#control");await settle();assert.equal(p.get("#journey-start").disabled,true);assert.equal(p.model.requests.length,0);
});
