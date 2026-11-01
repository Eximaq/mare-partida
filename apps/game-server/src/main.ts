import {requestMetrics} from "./metrics.js";
import { once } from "node:events";
import { readConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import { isDatabaseReady } from "./db/migrations.js";
import { readAuthConfig } from "./auth/config.js";
import { SupabaseProvider } from "./auth/supabase.js";
import { Vault } from "./auth/vault.js";
import { AuthService } from "./auth/service.js";
import { createAuthHandler } from "./auth/routes.js";
import { createHttpServer } from "./http.js";

async function main() {
  const config = readConfig(process.env);
  const auth = readAuthConfig(process.env);
  const pool = createPool(config.databaseUrl);
  const vault = auth ? new Vault(auth.encryptionKey) : undefined;
  const service =
    auth && vault
      ? new AuthService({
          pool,
          vault,
          policy: auth.policy,
          origin: auth.origin,
          provider: new SupabaseProvider({
            url: auth.providerUrl,
            publishableKey: auth.publishableKey,
            algorithm: auth.algorithm,
          }),
        })
      : undefined;
  let draining = false;
  const revocations = service
    ? setInterval(() => {
        if (draining) return;
        draining = true;
        void service
          .drainRevocations()
          .catch(() =>
            console.error(
              JSON.stringify({ event: "revocation_retry_pending" }),
            ),
          )
          .finally(() => {
            draining = false;
          });
      }, 10000)
    : undefined;
  revocations?.unref();
  let stopping = false;
  const metrics=requestMetrics();
  const reporter=setInterval(()=>console.log(JSON.stringify(metrics.flush())),60000);reporter.unref();
  const server = createHttpServer({
    onRequest:metrics.record,
    isReady: () => (stopping ? Promise.resolve(false) : isDatabaseReady(pool)),
    ...(auth && vault && service
      ? {
          handle: createAuthHandler({
            ...(config.trustedProxyIp?{trustedProxyIp:config.trustedProxyIp}:{}),
            service,
            vault,
            origin: auth.origin,
            cookieSeconds: auth.policy.absoluteMs / 1000,
          }),
        }
      : {}),
  });
  try {
    server.listen(config.port, config.host);
    await once(server, "listening");
  } catch (error) {
    await pool.end();
    throw error;
  }
  console.log(
    JSON.stringify({
      event: "listening",
      host: config.host,
      port: config.port,
      phase: auth ? "auth-development" : "foundation",
    }),
  );
  const stop = () => {
    if (stopping) return;
    stopping = true;
    clearInterval(revocations);
    clearInterval(reporter);
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exitCode = 1;
    }, 10000);
    deadline.unref();
    server.close(() => {
      void pool.end().finally(() => {
        clearTimeout(deadline);
        console.log(JSON.stringify({ event: "stopped" }));
      });
    });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
main().catch(() => {
  console.error(
    JSON.stringify({
      event: "startup_failed",
      message: "Check local configuration and port availability.",
    }),
  );
  process.exitCode = 1;
});
