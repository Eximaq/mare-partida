import { GoTrueClient, type Session } from "@supabase/auth-js";
import { createRemoteJWKSet, jwtVerify, customFetch, errors } from "jose";
import { z } from "zod";
import { AuthFault, unauthorized } from "./errors.js";
import type { AuthProvider, ProviderSession } from "./provider.js";

export class SupabaseProvider implements AuthProvider {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly fetch: typeof fetch = async (input, init) => {
    const signal = AbortSignal.any([
      AbortSignal.timeout(4000),
      ...(init?.signal ? [init.signal] : []),
    ]);
    try {
      const response = await fetch(input, {
        ...init,
        signal,
        redirect: "error",
      });
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          size += next.value.length;
          if (size > 65536) {
            await reader.cancel();
            throw new Error("Oversized provider reply");
          }
          chunks.push(next.value);
        }
      }
      return new Response(
        [204, 205, 304].includes(response.status)
          ? null
          : Buffer.concat(chunks),
        { status: response.status, headers: response.headers },
      );
    } catch {
      throw new TypeError("Authentication provider unavailable");
    }
  };
  constructor(
    private readonly config: {
      url: string;
      publishableKey: string;
      algorithm: "ES256" | "RS256";
    },
  ) {
    this.jwks = createRemoteJWKSet(
      new URL(config.url + "/auth/v1/.well-known/jwks.json"),
      { [customFetch]: this.fetch, timeoutDuration: 4000, cacheMaxAge: 300000 },
    );
  }
  private client(state: Record<string, string> = {}) {
    return new GoTrueClient({
      url: this.config.url + "/auth/v1",
      headers: { apikey: this.config.publishableKey },
      storageKey: "mare-auth",
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
      skipAutoInitialize: true,
      debug: false,
      fetch: this.fetch,
      storage: {
        getItem: (key) => state[key] ?? null,
        setItem: (key, value) => {
          state[key] = value;
        },
        removeItem: (key) => {
          delete state[key];
        },
      },
    });
  }
  private failure(error: { status?: number | undefined } | null) {
    if (error)
      throw new AuthFault(
        error.status && [400, 401, 403, 422].includes(error.status) ? 401 : 503,
        "authentication_failed",
      );
  }
  private async request(
    path: string,
    method: string,
    body?: unknown,
    accessToken?: string,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetch(this.config.url + "/auth/v1" + path, {
        method,
        headers: {
          apikey: this.config.publishableKey,
          ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new AuthFault(503, "authentication_unavailable");
    }
    if (!response.ok)
      throw new AuthFault(
        [400, 401, 403, 422].includes(response.status) ? 401 : 503,
        "authentication_failed",
      );
    return response.status === 204 ? null : response.json();
  }
  private async verified(
    session: Pick<Session, "access_token" | "refresh_token"> | null,
  ): Promise<ProviderSession> {
    if (!session) throw unauthorized();
    let payload;
    try {
      ({ payload } = await jwtVerify(session.access_token, this.jwks, {
        issuer: this.config.url + "/auth/v1",
        audience: "authenticated",
        algorithms: [this.config.algorithm],
        requiredClaims: ["sub", "session_id", "iat", "exp"],
        clockTolerance: 0,
      }));
    } catch (error) {
      if (
        error instanceof errors.JOSEError &&
        [
          "ERR_JWT_EXPIRED",
          "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
          "ERR_JWT_CLAIM_VALIDATION_FAILED",
          "ERR_JOSE_ALG_NOT_ALLOWED",
          "ERR_JWKS_NO_MATCHING_KEY",
        ].includes(error.code)
      )
        throw unauthorized();
      throw new AuthFault(503, "authentication_unavailable");
    }
    if (
      !z.uuid().safeParse(payload.sub).success ||
      !z.uuid().safeParse(payload.session_id).success ||
      payload.role !== "authenticated" ||
      typeof payload.iat !== "number" ||
      payload.iat > Math.floor(Date.now() / 1000) + 5 ||
      typeof payload.exp !== "number"
    )
      throw unauthorized();
    const user = await this.request(
      "/user",
      "GET",
      undefined,
      session.access_token,
    );
    const identity = z
      .object({
        id: z.uuid(),
        email_confirmed_at: z
          .string()
          .refine((value) => Number.isFinite(Date.parse(value))),
      })
      .safeParse(user);
    if (!identity.success || identity.data.id !== payload.sub)
      throw unauthorized();
    return {
      provider: new URL(this.config.url).hostname,
      subject: payload.sub!,
      providerSessionId: payload.session_id as string,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: payload.exp * 1000,
    };
  }
  async login(email: string, password: string) {
    const { data, error } = await this.client().signInWithPassword({
      email,
      password,
    });
    this.failure(error);
    return this.verified(data.session);
  }
  async refresh(refreshToken: string) {
    const data = await this.request("/token?grant_type=refresh_token", "POST", {
      refresh_token: refreshToken,
    });
    const result = z
      .object({
        access_token: z.string().min(1),
        refresh_token: z.string().min(1),
      })
      .safeParse(data);
    if (!result.success) throw new AuthFault(503, "authentication_unavailable");
    return this.verified(result.data);
  }
  async start(
    kind: "signup" | "recovery",
    email: string,
    password: string | undefined,
    redirect: string,
  ) {
    const state: Record<string, string> = {};
    const client = this.client(state);
    if (kind === "signup") {
      if (!password) throw new AuthFault(400, "invalid_request");
      const { data, error } = await client.signUp({
        email,
        password,
        options: { emailRedirectTo: redirect },
      });
      this.failure(error);
      if (data.session) throw new AuthFault(503, "email_confirmation_required");
    } else {
      const { error } = await client.resetPasswordForEmail(email, {
        redirectTo: redirect,
      });
      this.failure(error);
    }
    return state;
  }
  async exchange(state: Record<string, string>, code: string) {
    const { data, error } = await this.client({
      ...state,
    }).exchangeCodeForSession(code);
    this.failure(error);
    return this.verified(data.session);
  }
  async logout(session: ProviderSession, scope: "local" | "all") {
    await this.request(
      "/logout?scope=" + (scope === "all" ? "global" : "local"),
      "POST",
      undefined,
      session.accessToken,
    );
  }
  async reset(session: ProviderSession, password: string) {
    await this.request("/user", "PUT", { password }, session.accessToken);
  }
}
