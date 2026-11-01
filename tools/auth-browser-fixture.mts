// Explicit, loopback-only test harness. Never imported by server runtime or Docker image.
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { authDatabase } from "../tests/integration/auth-support.mjs";
import { createHttpServer } from "../apps/game-server/src/http.js";
import { createAuthHandler } from "../apps/game-server/src/auth/routes.js";
import { createDevGateway } from "./dev-gateway.mjs";
import { AuthFault } from "../apps/game-server/src/auth/errors.js";

await authDatabase(async ({ service, vault, provider }) => {
  const login = provider.login.bind(provider);
  provider.login = async (email, password) => {
    if (
      !email.endsWith("@example.invalid") ||
      password !== "Local test password only"
    )
      throw new AuthFault(401, "authentication_failed");
    return login(email, password);
  };
  const handler = createAuthHandler({
    service,
    vault,
    origin: "https://localhost:9443",
    cookieSeconds: 3600,
  });
  const server = createHttpServer({
    isReady: async () => true,
    handle: async (req, res) => {
      res.setHeader("X-Mare-Test-Fixture", "local-deterministic-provider");
      await handler(req, res);
    },
  });
  server.listen(8788, "127.0.0.1");
  await once(server, "listening");
  const gateway = createDevGateway({
    key: await readFile("infra/local/localhost.key", "utf8"),
    cert: await readFile("infra/local/localhost.crt", "utf8"),
    staticRoot: resolve("dist"),
    onlineRoot: resolve("apps/account-client"),
    upstream: new URL("http://127.0.0.1:8788"),
  });
  gateway.listen(9443, "127.0.0.1");
  await once(gateway, "listening");
  console.log(
    "LOCAL TEST FIXTURE ONLY: https://localhost:9443/online/ — type stop to close and remove its UUID test database.",
  );
  const input = createInterface({ input: process.stdin });
  await new Promise<void>((resolve) => {
    input.on("line", (line) => {
      if (line === "stop") resolve();
    });
    process.once("SIGINT", resolve);
  });
  input.close();
  gateway.closeAllConnections();
  server.closeAllConnections();
  await Promise.all([
    new Promise<void>((resolve) => gateway.close(() => resolve())),
    new Promise<void>((resolve) => server.close(() => resolve())),
  ]);
});
