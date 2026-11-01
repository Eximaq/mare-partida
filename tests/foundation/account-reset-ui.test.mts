import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

const source = readFileSync(new URL("../../apps/account-client/account.js", import.meta.url), "utf8");
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise<void>(r => setImmediate(r)); };
class Element {
  hidden = false; disabled = false; value = ""; textContent = "";
  required = false; autocomplete = ""; dataset: Record<string, string> = {};
  listeners = new Map<string, (event: any) => void>();
  setAttribute() {} removeAttribute() {} focus() {}
  addEventListener(name: string, fn: (event: any) => void) { this.listeners.set(name, fn); }
}
function page(reset: () => Promise<Response>) {
  const elements = new Map<string, Element>();
  const get = (id: string) => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id)!; };
  const modes = ["login", "signup", "recover"].map(mode => { const e = new Element(); e.dataset.mode = mode; return e; });
  const location = { href: "https://localhost:9443/online/?recovery=1" };
  let resets = 0;
  runInNewContext(source, {
    URL, location, history: { replaceState(_s: unknown, _t: string, url: string) { location.href = new URL(url, location.href).href; } },
    document: { hidden: false, querySelector: get, querySelectorAll: () => modes }, setInterval() {},
    fetch: async (path: string) => {
      if (path === "/v1/auth/csrf") return Response.json({ csrfToken: "fixture-only" });
      if (path === "/v1/auth/reset") { resets++; return reset(); }
      throw new Error("Unexpected fixture request");
    },
  });
  const button = new Element(); button.textContent = "Salvar nova senha";
  const submit = () => get("#reset-form").listeners.get("submit")!({ preventDefault() {}, submitter: button });
  return { get, location, submit, resets: () => resets };
}
for (const code of ["password_reset_unconfirmed", "authentication_required", "transport"] as const) {
  test(`reset ${code}: consume form, retain guidance and do not submit again`, async () => {
    const p = page(async () => {
      if (code === "transport") throw new TypeError("fixture connection lost");
      return Response.json({ error: code }, { status: code === "authentication_required" ? 401 : 503 });
    });
    p.get("#new-password").value = "Fixture password only";
    p.submit(); await settle();
    assert.equal(p.get("#reset-form").hidden, true);
    assert.equal(p.get("#signed-out").hidden, false);
    assert.equal(p.get("#panel-title").textContent, "Entrar na conta");
    assert.match(p.get("#status").textContent, /senha|recuperação/i);
    assert.doesNotMatch(p.get("#status").textContent, /Senha alterada\./);
    assert.equal(p.get("#new-password").value, "");
    assert.equal(p.location.href, "https://localhost:9443/online/");
    p.submit(); await settle(); assert.equal(p.resets(), 1);
  });
}
test("two submissions while reset is pending send only one request", async () => {
  let resolve!: (r: Response) => void;
  const p = page(() => new Promise(r => { resolve = r; }));
  p.submit(); p.submit(); await settle(); assert.equal(p.resets(), 1);
  resolve(Response.json({ reset: true })); await settle();
  assert.equal(p.get("#reset-form").hidden, true);
  assert.equal(p.get("#status").textContent, "Senha alterada. Entre novamente.");
});
test("validation refusal keeps recovery available for a corrected password", async () => {
  let attempt = 0;
  const p = page(async () => ++attempt === 1 ? Response.json({ error: "invalid_request" }, { status: 400 }) : Response.json({ reset: true }));
  p.submit(); await settle(); assert.equal(p.get("#reset-form").hidden, false);
  assert.equal(p.get("#status").textContent, "Confira os campos informados.");
  p.submit(); await settle(); assert.equal(p.resets(), 2);
  assert.equal(p.get("#reset-form").hidden, true);
});
