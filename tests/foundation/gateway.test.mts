import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { request } from "node:https";
import { once } from "node:events";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { generate } from "selfsigned";
import { createDevGateway } from "../../tools/dev-gateway.mjs";

test("one HTTPS origin serves only built files and forwards Secure cookies to the private API", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "mare-gateway-"));
  await writeFile(join(dir, "index.html"), "<h1>Isolated frontend</h1>");
  await writeFile(join(dir, ".env"), "must-not-be-served");
  t.after(async () => {
    await unlink(join(dir, "index.html"));
    await unlink(join(dir, ".env"));
    await rmdir(dir);
  });
  const upstream = createServer((req, res) => {
    if (req.headers.origin === "https://attacker.invalid") {
      res.writeHead(403).end();
      return;
    }
    res.setHeader(
      "Set-Cookie",
      "__Host-probe=opaque; Secure; HttpOnly; SameSite=Lax; Path=/",
    );
    res.end(
      JSON.stringify({
        cookie: req.headers.cookie ?? null,
        forwarded: req.headers["x-forwarded-for"] ?? null,
      }),
    );
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  t.after(() => {
    upstream.closeAllConnections();
    upstream.close();
  });
  const cert = await generate([{ name: "commonName", value: "localhost" }], {
    extensions: [
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          { type: 7, ip: "127.0.0.1" },
        ],
      },
    ],
  });
  const gateway = createDevGateway({
    key: cert.private,
    cert: cert.cert,
    staticRoot: dir,
    onlineRoot: dir,
    upstream: new URL(
      `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`,
    ),
  });
  gateway.listen(0, "127.0.0.1");
  await once(gateway, "listening");
  t.after(() => {
    gateway.closeAllConnections();
    gateway.close();
  });
  const get = (path: string, headers: Record<string, string> = {}) =>
    new Promise<{ status: number; body: string; cookies: string[] }>(
      (resolve, reject) => {
        const req = request(
          {
            hostname: "127.0.0.1",
            port: (gateway.address() as AddressInfo).port,
            path,
            ca: cert.cert,
            headers,
          },
          (res) => {
            let body = "";
            res.on("data", (c) => {
              body += c;
            });
            res.on("end", () =>
              resolve({
                status: res.statusCode!,
                body,
                cookies: res.headers["set-cookie"] ?? [],
              }),
            );
          },
        );
        req.on("error", reject);
        req.end();
      },
    );
  assert.equal((await get("/")).body, "<h1>Isolated frontend</h1>");
  assert.equal((await get("/online/")).status, 200);
  // An absolute request target must never override the private proxy destination.
  assert.equal(
    (
      await get(
        `http://127.0.0.1:${(upstream.address() as AddressInfo).port}/v1/me`,
      )
    ).status,
    400,
  );
  assert.equal((await get("//127.0.0.1/v1/me")).status, 400);
  for (const path of ["/.env", "/.git/HEAD", "/online/../.env", "/%2e%2e/.env"])
    assert.equal((await get(path)).status, 404);
  const response = await get("/v1/me", {
    cookie: "__Host-probe=opaque",
    "x-forwarded-for": "forged",
  });
  assert.deepEqual(JSON.parse(response.body), {
    cookie: "__Host-probe=opaque",
    forwarded: null,
  });
  assert.match(response.cookies[0]!, /Secure; HttpOnly/);
  assert.equal(
    (await get("/v1/me", { origin: "https://attacker.invalid" })).status,
    403,
  );
});
