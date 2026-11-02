import { isIPv4 } from "node:net";
export function readRadminAccess(value: unknown) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object")
    throw Error("Invalid private access settings");
  const c = value as Record<string, unknown>;
  const address = (v: unknown): v is string =>
    typeof v === "string" && isIPv4(v) && v.startsWith("26.");
  if (!address(c.host) || !address(c.peer) || c.host === c.peer ||
      typeof c.key !== "string" || !c.key || typeof c.cert !== "string" || !c.cert)
    throw Error("Explicit Radmin addresses and certificate required");
  return {
    host: c.host, peer: c.peer, key: c.key, cert: c.cert,
    origin: `https://${c.host}:9444`, peers: [c.host, c.peer],
  };
}

export function localEnvironment(
  source: Record<string, string>,
  parent: NodeJS.ProcessEnv,
  privateAccess?: unknown,
): NodeJS.ProcessEnv {
  const url = new URL(source.DATABASE_URL ?? "");
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/mare_local_alpha"
  )
    throw new Error("Local alpha database required");
  if (
    source.AUTH_PUBLIC_ORIGIN !== "https://localhost:9443" ||
    source.SUPABASE_JWT_ALGORITHM !== "ES256" ||
    source.SESSION_ABSOLUTE_SECONDS !== "86400" ||
    source.SESSION_IDLE_SECONDS !== "7200"
  )
    throw new Error("Approved local authentication policy required");
  const env: NodeJS.ProcessEnv = {};
  for (const k of [
    "PATH",
    "Path",
    "SystemRoot",
    "windir",
    "TEMP",
    "TMP",
    "LOCALAPPDATA",
    "USERPROFILE",
    "APPDATA",
    "ComSpec",
    "PATHEXT",
  ])
    if (parent[k]) env[k] = parent[k];
  for (const k of [
    "DATABASE_URL",
    "AUTH_PUBLIC_ORIGIN",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_JWT_ALGORITHM",
    "AUTH_ENCRYPTION_KEY",
    "SESSION_ABSOLUTE_SECONDS",
    "SESSION_IDLE_SECONDS",
    "PROVIDER_RECHECK_SECONDS",
  ])
    if (source[k]) env[k] = source[k];
  return {
    ...env,
    AUTH_PUBLIC_ORIGIN: readRadminAccess(privateAccess)?.origin ?? env.AUTH_PUBLIC_ORIGIN,
    NODE_ENV: "development",
    HOST: "127.0.0.1",
    PORT: "8788",
    AUTH_ENABLED: "true",
  };
}
export function stopRequestMatches(
  request: unknown,
  state: { instance: string; pid: number },
) {
  return (
    typeof request === "object" &&
    request !== null &&
    "instance" in request &&
    request.instance === state.instance
  );
}
