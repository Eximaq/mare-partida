import { z } from "zod";
import { decodeJwt } from "jose";
const seconds = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
const schema = z
  .object({
    AUTH_PUBLIC_ORIGIN: z.string().refine((value) => {
      try {
        const u = new URL(value);
        return u.protocol === "https:" && u.origin === value;
      } catch {
        return false;
      }
    }),
    SUPABASE_URL: z.string().regex(/^https:\/\/[a-z0-9-]{1,40}\.supabase\.co$/),
    SUPABASE_PUBLISHABLE_KEY: z.string().refine((value) => {
      if (value.startsWith("sb_publishable_") && value.length > 20) return true;
      try {
        return decodeJwt(value).role === "anon";
      } catch {
        return false;
      }
    }),
    AUTH_ENCRYPTION_KEY: z
      .string()
      .refine(
        (value) =>
          Buffer.from(value, "base64").length === 32 &&
          Buffer.from(value, "base64").toString("base64") === value,
      ),
    SESSION_ABSOLUTE_SECONDS: seconds(3600, 604800),
    SESSION_IDLE_SECONDS: seconds(300, 86400),
    PROVIDER_RECHECK_SECONDS: seconds(60, 900),
    SUPABASE_JWT_ALGORITHM: z.enum(["ES256", "RS256"]).default("ES256"),
  })
  .refine(
    (value) =>
      Number(value.SESSION_IDLE_SECONDS) <=
      Number(value.SESSION_ABSOLUTE_SECONDS),
  );
export type SessionPolicy = {
  absoluteMs: number;
  idleMs: number;
  recheckMs: number;
};
export function readAuthConfig(env: NodeJS.ProcessEnv) {
  if (env.AUTH_ENABLED !== "true") return undefined;
  const result = schema.safeParse(env);
  if (!result.success)
    throw new Error(
      "Invalid authentication configuration; check origin, provider, keys and session policy",
    );
  const c = result.data;
  return {
    origin: c.AUTH_PUBLIC_ORIGIN,
    providerUrl: c.SUPABASE_URL,
    publishableKey: c.SUPABASE_PUBLISHABLE_KEY,
    encryptionKey: Buffer.from(c.AUTH_ENCRYPTION_KEY, "base64"),
    algorithm: c.SUPABASE_JWT_ALGORITHM,
    policy: {
      absoluteMs: c.SESSION_ABSOLUTE_SECONDS * 1000,
      idleMs: c.SESSION_IDLE_SECONDS * 1000,
      recheckMs: c.PROVIDER_RECHECK_SECONDS * 1000,
    },
  };
}
