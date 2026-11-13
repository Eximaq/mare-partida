import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const settle = async () => {
  for (let i = 0; i < 12; i++) await new Promise<void>((r) => setImmediate(r));
};
function page(authenticated = false, query = "") {
  const elements = new Map<string, any>(),
    paths: string[] = [],
    redirects: string[] = [],
    listeners: any = {};
  const get = (id: string) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "",
        hidden: false,
        textContent: "",
        setAttribute() {},
        addEventListener(n: string, fn: any) {
          listeners[id + ":" + n] = fn;
        },
      });
    return elements.get(id);
  };
  const requests: any[] = [];
  const modes=['login','signup','recover'].map(mode=>Object.assign(get('mode-'+mode),{dataset:{mode}}));
  runInNewContext(
    readFileSync(
      new URL("../../apps/account-client/login.js", import.meta.url),
      "utf8",
    ),
    {
      document: { getElementById: get, querySelectorAll: () => modes },
      URL,
      AbortSignal,
      location: {
        href: "https://localhost:9443/online/" + query,
        replace: (path: string) => redirects.push(path),
      },
      history: { replaceState() {} },
      fetch: async (path: string, o: any = {}) => {
        paths.push(path);
        requests.push({ path, ...o });
        if (path === "/v1/me")
          return authenticated
            ? Response.json({ character: { id: "fixture" } })
            : Response.json(
                { error: "authentication_required" },
                { status: 401 },
              );
        if (path === "/v1/auth/csrf")
          return Response.json({ csrfToken: "fixture" });
        if(path==='/v1/auth/signup'||path==='/v1/auth/recover')return Response.json({message:'Confira seu e-mail.'},{status:202});
        if (path === "/v1/auth/login") {
          authenticated = true;
          return Response.json({ authenticated: true });
        }
        throw Error(path);
      },
      localStorage: {
        getItem() {
          assert.fail("login cannot read saves");
        },
        setItem() {
          assert.fail("login cannot write saves");
        },
      },
    },
  );
  return { get, listeners, paths, redirects, requests };
}
test("successful login goes directly to the original game with no extra account/gameplay panel", async () => {
  const p = page();
  await settle();
  p.get("email").value = "fixture@example.invalid";
  p.get("password").value = "Local test fixture";
  p.listeners["login-form:submit"]({
    preventDefault() {},
    submitter: p.get("login-submit"),
  });
  await settle();
  assert.deepEqual(p.redirects, ["/game"]);
  assert.equal(p.get("password").value, "");
  assert.ok(p.paths.includes("/v1/auth/login"));
  assert.ok(p.paths.every((path) => !path.includes("commands")));
});

test('invitation belongs only to signup and double submission cannot duplicate confirmation',async()=>{
 const p=page();await settle();
 p.listeners['mode-signup:click']();
 assert.equal(p.get('invite-field').hidden,false);assert.equal(p.get('invite-code').required,true);
 p.get('email').value='invite@example.invalid';p.get('password').value='Isolated fixture password';p.get('invite-code').value='fixture invitation';
 const event={preventDefault(){},submitter:p.get('login-submit')};
 p.listeners['login-form:submit'](event);p.listeners['login-form:submit'](event);await settle();
 const signups=p.requests.filter(r=>r.path==='/v1/auth/signup');assert.equal(signups.length,1);
 assert.equal(JSON.parse(signups[0].body).inviteCode,'fixture invitation');assert.equal(p.get('invite-code').value,'');
 assert.deepEqual(p.redirects,[],'confirmation is required before entering the game');
 p.listeners['mode-login:click']();assert.equal(p.get('invite-field').hidden,true);assert.equal(p.get('invite-code').required,false);
 p.get('password').value='Isolated fixture password';p.get('invite-code').value='stale value';p.listeners['login-form:submit'](event);await settle();
 assert.equal('inviteCode' in JSON.parse(p.requests.find(r=>r.path==='/v1/auth/login').body),false);
 assert.deepEqual(p.redirects,['/game']);
});
test("an existing session goes directly to the game; normal entry contains no duplicate gameplay forms", async () => {
  const p = page(true);
  await settle();
  assert.deepEqual(p.redirects, ["/game"]);
  const html = readFileSync(
    new URL("../../apps/account-client/index.html", import.meta.url),
    "utf8",
  );
  for (const marker of [
    "inventory-form",
    "online-progress",
    "lobby-canvas",
    "attribute-form",
    "combat-attack",
  ])
    assert.equal(html.includes(marker), false, marker);
});

test("failed callback shows fixed guidance without treating the URL as proof of confirmation", async () => {
  const p = page(false, "?auth_error=invalid_auth_flow&code=not-for-display");
  await settle();
  assert.match(p.get('status').textContent, /Não foi possível concluir este link neste navegador/);
  assert.match(p.get('status').textContent, /confirmação do e-mail pode ter ocorrido/);
  assert.ok(!p.get('status').textContent.includes('not-for-display'));
  assert.deepEqual(p.redirects, []);
  assert.deepEqual(p.paths, ['/v1/me'], 'no send, password reset or automatic login');
  const forged = page(false, '?auth_error=unknown-injected-text'); await settle();
  assert.equal(forged.get('status').textContent, '');
});
