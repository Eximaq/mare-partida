import { readFile, writeFile, mkdir, open, unlink } from "node:fs/promises";
import { spawn, fork } from "node:child_process";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { once } from "node:events";
import { createDevGateway } from "./dev-gateway.mts";
import {
  localEnvironment,
  stopRequestMatches,
} from "./local-server-policy.mts";
const root = fileURLToPath(new URL("../", import.meta.url)),
  dir = join(root, "infra/local/continuous");
const lock = join(dir, "lock.json"),
  request = join(dir, "stop.json");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function state() {
  try {
    return JSON.parse(await readFile(lock, "utf8"));
  } catch {
    return undefined;
  }
}
function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function ready() {
  try {
    return (
      await fetch("http://127.0.0.1:8788/health/ready", {
        signal: AbortSignal.timeout(1000),
      })
    ).ok;
  } catch {
    return false;
  }
}
async function free(port: number) {
  const s = createServer();
  s.listen(port, "127.0.0.1");
  await once(s, "listening");
  await new Promise<void>((r) => s.close(() => r()));
}
async function supervise() {
  await mkdir(dir, { recursive: true });
  const current = {
    instance: randomUUID(),
    pid: process.pid,
    phase: "starting",
    startedAt: new Date().toISOString(),
  };
  const handle = await open(lock, "wx", 0o600);
  await handle.writeFile(JSON.stringify(current));
  await handle.close();
  let api: ReturnType<typeof fork> | undefined,
    gateway: ReturnType<typeof createDevGateway> | undefined,
    timer: NodeJS.Timeout | undefined;
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    if (gateway) {
      gateway.closeAllConnections();
      await new Promise<void>((r) => gateway!.close(() => r()));
    }
    if (api && api.exitCode === null) {
      const done = once(api, "exit");
      api.send("local-stop");
      const deadline = setTimeout(() => api?.kill(), 15000);
      await done;
      clearTimeout(deadline);
    }
    const latest = await state();
    if (latest?.instance === current.instance)
      await unlink(lock).catch(() => {});
    await unlink(request).catch(() => {});
  };
  try {
    await free(8788);
    await free(9443);
    const env = localEnvironment(
      parseEnv(await readFile(join(root, ".env.server.local"), "utf8")),
      process.env,
    );
    const { readConfig } = await import("../apps/game-server/dist/config.js");
    const { readAuthConfig } = await import(
      "../apps/game-server/dist/auth/config.js"
    );
    readConfig(env);
    readAuthConfig(env);
    const settings = JSON.parse(
      await readFile(join(dir, "settings.json"), "utf8"),
    );
    api = fork(join(root, "apps/game-server/dist/main.js"), [], {
      cwd: root,
      env,
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    });
    for (let i = 0; i < 100; i++) {
      if (await ready()) break;
      if (api.exitCode !== null) throw new Error("API startup failed");
      await pause(100);
    }
    if (!(await ready())) throw new Error("API/database not ready");
    gateway = createDevGateway({
      key: await readFile(settings.key, "utf8"),
      cert: await readFile(settings.cert, "utf8"),
      staticRoot: join(root, "dist"),
      onlineRoot: join(root, "apps/account-client"),
      upstream: new URL("http://127.0.0.1:8788"),
    });
    gateway.listen(9443, "127.0.0.1");
    await once(gateway, "listening");
    await writeFile(lock, JSON.stringify({ ...current, phase: "running" }), {
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        event: "local_alpha_ready",
        url: "https://localhost:9443/online/",
      }),
    );
    timer = setInterval(() => {
      void readFile(request, "utf8")
        .then(JSON.parse)
        .then((value) => {
          if (stopRequestMatches(value, current)) void stop();
        })
        .catch(() => {});
    }, 500);
    api.once("exit", () => {
      if (!stopping) void stop();
    });
    process.once("SIGINT", () => void stop());
    process.once("SIGTERM", () => void stop());
  } catch {
    await stop();
    throw new Error(
      "Local startup failed; check build, installation, database and free ports",
    );
  }
}
async function main() {
  const action = process.argv[2] ?? "status";
  if (action === "supervise") return supervise();
  const s = await state(),
    running = !!s && Number.isInteger(s.pid) && alive(s.pid);
  if (action === "status") {
    console.log(
      running && (await ready())
        ? "Servidor local ativo: https://localhost:9443/online/"
        : "Servidor local parado ou indisponivel.",
    );
    return;
  }
  if (action === "stop") {
    if (!running) {
      console.log("Servidor local ja esta parado. PostgreSQL preservado.");
      return;
    }
    await writeFile(request, JSON.stringify({ instance: s.instance }), {
      mode: 0o600,
    });
    for (let i = 0; i < 180; i++) {
      if (!(await state())) {
        console.log(
          "Auth, API e HTTPS parados. Banco e personagens preservados.",
        );
        return;
      }
      await pause(100);
    }
    throw new Error(
      "Shutdown not confirmed; no unrelated process was terminated",
    );
  }
  if (action !== "start") throw new Error("Use start, stop or status");
  if (running) {
    if (s.phase === "running" && (await ready())) {
      console.log("Servidor local ja esta ativo.");
      return;
    }
    throw new Error("An installation process already owns the lock");
  }
  if (s) {
    await unlink(lock);
    await unlink(request).catch(() => {});
  }
  await mkdir(dir, { recursive: true });
  const log = await open(join(dir, "server.log"), "a", 0o600);
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), "supervise"],
    {
      cwd: root,
      env: localEnvironment(
        parseEnv(await readFile(join(root, ".env.server.local"), "utf8")),
        process.env,
      ),
      detached: true,
      windowsHide: true,
      stdio: ["ignore", log.fd, log.fd],
    },
  );
  child.unref();
  await log.close();
  for (let i = 0; i < 180; i++) {
    const next = await state();
    if (next?.phase === "running" && (await ready())) {
      console.log("Servidor iniciado: https://localhost:9443/online/");
      return;
    }
    await pause(100);
  }
  throw new Error(
    "Startup not confirmed; inspect private infra/local/continuous/server.log",
  );
}
main().catch(() => {
  console.error(
    "Operacao local nao concluida. Confira banco, build e instalacao; nenhum dado foi apagado.",
  );
  process.exitCode = 1;
});
