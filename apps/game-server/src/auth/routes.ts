import type { IncomingMessage, ServerResponse } from "node:http";
import {clientAddress} from "../client-address.js";
import { z } from "zod";
import {
  loginSchema,
  recoverSchema,
  resetSchema,
  logoutSchema,
  emptySchema,
  characterCreateSchema,
  controlSchema,
  renewControlSchema,
  characterCommandSchema,messageIdSchema,
} from "@mare/shared";
import {parseMarketRead} from "../characters/market.js";
import { AuthService } from "./service.js";
import { AuthFault, unauthorized } from "./errors.js";
import { equal, Vault } from "./vault.js";
const SESSION = "__Host-mare_session",
  PREAUTH = "__Host-mare_preauth",
  FLOW = "__Host-mare_flow";
function cookies(request: IncomingMessage) {
  const result = new Map<string, string>();
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const at = part.indexOf("=");
    if (at < 0) continue;
    const name = part.slice(0, at).trim(),
      value = part.slice(at + 1).trim();
    if (![SESSION, PREAUTH, FLOW].includes(name)) continue;
    if (result.has(name) || !/^[A-Za-z0-9_.-]{1,180}$/.test(value))
      throw new AuthFault(400, "invalid_cookie");
    result.set(name, value);
  }
  return result;
}
function setCookie(
  response: ServerResponse,
  name: string,
  value: string,
  seconds: number,
) {
  const previous = response.getHeader("Set-Cookie");
  const headers = Array.isArray(previous)
    ? previous.map(String)
    : previous
      ? [String(previous)]
      : [];
  response.setHeader("Set-Cookie", [
    ...headers,
    `${name}=${value}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=${seconds}`,
  ]);
}
function body(request: IncomingMessage): Promise<unknown> {
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers["content-type"] ?? "",
    )
  )
    throw new AuthFault(415, "json_required");
  if (Number(request.headers["content-length"]) > 8192)
    throw new AuthFault(413, "request_too_large");
  return new Promise((resolve, reject) => {
    let size = 0,
      failed = false;
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      failed = true;
      reject(new AuthFault(408, "request_timeout"));
    }, 3000);
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (failed) return;
      if (size > 8192) {
        failed = true;
        chunks.length = 0;
        clearTimeout(timer);
        reject(new AuthFault(413, "request_too_large"));
        return;
      }
      chunks.push(chunk);
    });
    request.on("aborted", () => {
      clearTimeout(timer);
      reject(new AuthFault(400, "invalid_request"));
    });
    request.on("error", () => {
      clearTimeout(timer);
      reject(new AuthFault(400, "invalid_request"));
    });
    request.on("end", () => {
      clearTimeout(timer);
      if (failed) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new AuthFault(400, "invalid_json"));
      }
    });
  });
}
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new AuthFault(400, "invalid_request");
  return result.data;
};
export function createAuthHandler(options: {
  service: AuthService;
  vault: Vault;
  origin: string;
  cookieSeconds: number;
  trustedProxyIp?: string;
}) {
  const { service, vault, origin } = options;
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    const reply = (status: number, data?: unknown) => {
      if (!response.destroyed)
        response
          .setHeader("Server-Timing", `app;dur=${Math.max(0,Date.now()-started)}`)
          .writeHead(status)
          .end(data === undefined ? "" : JSON.stringify(data));
    };
    const started = Date.now();
    try {
      let ip:string;try{ip=clientAddress(request,options.trustedProxyIp);}catch{throw new AuthFault(400,"invalid_proxy_identity");}
      const url = new URL(request.url ?? "/", origin),
        path = url.pathname;
      const match =
        /^\/v1\/characters\/([0-9a-f-]{36})(?:\/(control)(?:\/(renew))?)?$/.exec(
          path,
        );
      const stateMatch = /^\/v1\/characters\/([0-9a-f-]{36})\/(state|online-state|game-catalog|frame|crew|social|market)$/.exec(path);
      const commandMatch = /^\/v1\/characters\/([0-9a-f-]{36})\/commands$/.exec(path);
      const known = [
        "/v1/auth/csrf",
        "/v1/auth/signup",
        "/v1/auth/login",
        "/v1/auth/recover",
        "/v1/auth/callback",
        "/v1/auth/reset",
        "/v1/auth/logout",
        "/v1/auth/rotate",
        "/v1/me",
        "/v1/hierarchy/ranking",
        "/v1/crews/ranking",
        "/v1/characters",
      ];
      if (!known.includes(path) && !match && !stateMatch && !commandMatch) {
        request.resume();
        reply(404, { error: "not_found" });
        return;
      }
      const get =
        path === "/v1/auth/csrf" ||
        path === "/v1/auth/callback" ||
        path === "/v1/me" || path === "/v1/hierarchy/ranking" || path === "/v1/crews/ranking" ||
        (!!match && !match[2]) || !!stateMatch;
      if (request.method !== (get ? "GET" : "POST")) {
        request.resume();
        response.setHeader("Allow", get ? "GET" : "POST");
        reply(405, { error: "method_not_allowed" });
        return;
      }
      // Gameplay polling and movement share an IP behind the local gateway/NAT.
      // Reserve the original authentication budget instead of letting play traffic consume it.
      const gameplay = path === "/v1/me" || path === "/v1/hierarchy/ranking" || path === "/v1/crews/ranking" || path === "/v1/characters" || !!match || !!stateMatch || !!commandMatch;
      await service.rateLimit((gameplay ? "game-ip:" : "ip:") + ip, gameplay ? 600 : 300, 60);
      const jar = cookies(request),
        session = jar.get(SESSION),
        preauth = jar.get(PREAUTH);
      let binding =
        session ??
        (preauth && vault.validPreauth(preauth) ? preauth : undefined);
      if (path === "/v1/auth/csrf") {
        request.resume();
        if (!binding) {
          binding = vault.preauth();
          setCookie(response, PREAUTH, binding, 600);
        }
        reply(200, { csrfToken: vault.csrf(binding) });
        return;
      }
      if (path === "/v1/auth/callback") {
        request.resume();
        const code = url.searchParams.get("code"),
          flow = jar.get(FLOW);
        if (
          !binding ||
          !flow ||
          !code ||
          code.length > 2048 ||
          url.searchParams.getAll("code").length !== 1
        )
          throw new AuthFault(400, "invalid_auth_flow");
        const result = await service.callback(flow, binding, code);
        setCookie(
          response,
          SESSION,
          result.token,
          result.kind === "recovery" ? 600 : options.cookieSeconds,
        );
        setCookie(response, FLOW, "", 0);
        response.setHeader(
          "Location",
          result.kind === "recovery" ? "/online/?recovery=1" : "/online/",
        );
        reply(303);
        return;
      }
      if (get) {
        request.resume();
        if (!session) throw unauthorized();
        if(path === "/v1/hierarchy/ranking") {
          if(request.headers["transfer-encoding"] || Number(request.headers["content-length"]??0)!==0 || [...url.searchParams.keys()].some(k=>k!=="faction") || url.searchParams.getAll("faction").length>1)throw new AuthFault(400,"invalid_request");
          const faction=url.searchParams.has("faction")?parse(z.enum(["pirate","marine","revolutionary","government"]),url.searchParams.get("faction")):null;
          reply(200,await service.hierarchyRanking(session,faction));return;
        }
        if(path==="/v1/crews/ranking" || stateMatch?.[2]==='crew'){
          if(request.headers["transfer-encoding"] || Number(request.headers["content-length"]??0)!==0)throw new AuthFault(400,"invalid_request");
          if(path==="/v1/crews/ranking"){
            if(url.search)throw new AuthFault(400,"invalid_request");
            reply(200,await service.crewRanking(session));return;
          }
          const q=url.searchParams.get('q')??'',view=url.searchParams.get('view');
          if(!stateMatch||q.length>96||(view!==null&&view!=='identity')||(view!==null&&url.searchParams.has('q'))||[...url.searchParams.keys()].some(k=>k!=='q'&&k!=='view')||url.searchParams.getAll('q').length>1||url.searchParams.getAll('view').length>1)throw new AuthFault(400,"invalid_request");
          reply(200,await service.crewState(session,parse(z.uuid(),stateMatch[1]),q,view==='identity'));return;
        }
        if(stateMatch?.[2]==='market'){
          if(request.headers['transfer-encoding']||Number(request.headers['content-length']??0)!==0)throw new AuthFault(400,'invalid_request');
          reply(200,await service.marketState(session,parse(z.uuid(),stateMatch[1]),parseMarketRead(url.searchParams)));return;
        }
        if(stateMatch?.[2]==='social'){
          if(request.headers["transfer-encoding"]||Number(request.headers["content-length"]??0)!==0)throw new AuthFault(400,'invalid_request');
          const params=url.searchParams;
          const view=parse(z.enum(['badge','contacts','messages','mail','trade']),params.get('view')??'badge');
          const allowed={badge:[],contacts:['q'],messages:['target','before','after'],mail:['tab','before'],trade:['beforeAt','beforeId']}[view];
          for(const key of params.keys())if((key!=='view'&&!(allowed as readonly string[]).includes(key))||params.getAll(key).length!==1)throw new AuthFault(400,'invalid_request');
          const opt=(key:string)=>params.get(key)??undefined;
          const q=opt('q'),before=opt('before'),after=opt('after'),tab=opt('tab'),beforeAt=opt('beforeAt'),beforeId=opt('beforeId');
          if((q&&q.length>40)||(before!==undefined&&after!==undefined)||((beforeAt===undefined)!==(beforeId===undefined)))throw new AuthFault(400,'invalid_request');
          const query={view,search:q,targetId:view==='messages'?parse(z.uuid(),params.get('target')):undefined,
            before:before===undefined?undefined:parse(view==='mail'?z.uuid():messageIdSchema,before),
            after:after===undefined?undefined:parse(messageIdSchema,after),tab:tab===undefined?undefined:parse(z.enum(['pending','claimed']),tab),
            history:beforeAt&&beforeId?{at:parse(z.iso.datetime(),beforeAt),id:parse(z.uuid(),beforeId)}:undefined};
          reply(200,await service.socialState(session,parse(z.uuid(),stateMatch[1]),query));return;
        }
        if (stateMatch) {
          if (url.search || request.headers["transfer-encoding"] || Number(request.headers["content-length"] ?? 0) !== 0)
            throw new AuthFault(400, "invalid_request");
          const id = parse(z.uuid(), stateMatch[1]);
          reply(200, stateMatch[2] === "game-catalog" ? await service.gameCatalog(session,id) : stateMatch[2] === "frame" ? await service.onlineFrame(session,id) : stateMatch[2] === "online-state" ? await service.onlineState(session, id) : await service.characterState(session, id));
          return;
        }
        if (path === "/v1/me") {
          reply(200, await service.me(session));
          return;
        }
        const id = parse(z.uuid(), match?.[1]);
        reply(200, await service.character(session, id));
        return;
      }
      if (
        request.headers.origin !== origin ||
        request.headers["sec-fetch-site"] === "cross-site" ||
        !binding ||
        typeof request.headers["x-csrf-token"] !== "string" ||
        !equal(request.headers["x-csrf-token"], vault.csrf(binding))
      )
        throw new AuthFault(403, "csrf_rejected");
      const value = await body(request);
      if (path === "/v1/auth/login") {
        const credentials = parse(loginSchema, value);
        await service.rateLimit(
          "login-ip:" + ip,
          20,
          60,
        );
        await service.rateLimit("login-email:" + credentials.email, 10, 60);
        const result = await service.login(
          credentials.email,
          credentials.password,
          session,
        );
        setCookie(response, SESSION, result.token, options.cookieSeconds);
        reply(200, { authenticated: true });
        return;
      }
      if (path === "/v1/auth/signup" || path === "/v1/auth/recover") {
        const kind = path.endsWith("signup") ? "signup" : "recovery";
        const credentials =
          kind === "signup"
            ? parse(loginSchema, value)
            : parse(recoverSchema, value);
        await service.rateLimit(
          "email-ip:" + ip,
          10,
          3600,
        );
        await service.rateLimit("email:" + credentials.email, 3, 3600);
        const flow = await service.startFlow(
          kind,
          credentials.email,
          "password" in credentials && typeof credentials.password === "string"
            ? credentials.password
            : undefined,
          binding,
        );
        setCookie(response, FLOW, flow.token, 600);
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(0, 250 - (Date.now() - started))),
        );
        reply(202, {
          message:
            "Se a solicitação puder ser atendida, você receberá as instruções por e-mail.",
        });
        return;
      }
      if (!session) throw unauthorized();
      if (commandMatch) {
        if (url.search) throw new AuthFault(400, "invalid_request");
        reply(200, await service.command(session, parse(z.uuid(), commandMatch[1]), parse(characterCommandSchema, value)));
        return;
      }
      if (path === "/v1/auth/logout") {
        const input = parse(logoutSchema, value);
        await service.logout(session, input.scope);
        setCookie(response, SESSION, "", 0);
        reply(204);
        return;
      }
      if (path === "/v1/auth/rotate") {
        parse(emptySchema, value);
        const result = await service.rotate(session);
        setCookie(response, SESSION, result.token, options.cookieSeconds);
        reply(200, { rotated: true });
        return;
      }
      if (path === "/v1/auth/reset") {
        const input = parse(resetSchema, value);
        try {
          await service.reset(session, input.password);
        } finally {
          setCookie(response, SESSION, "", 0);
        }
        reply(200, { reset: true });
        return;
      }
      if (path === "/v1/characters") {
        reply(
          201,
          await service.createCharacter(
            session,
            parse(characterCreateSchema, value),
          ),
        );
        return;
      }
      const id = parse(z.uuid(), match?.[1]);
      if (match?.[3]) {
        reply(
          200,
          await service.renewControl(
            session,
            id,
            parse(renewControlSchema, value),
          ),
        );
        return;
      }
      const control = parse(controlSchema, value);
      reply(
        200,
        await service.acquireControl(session, id, control.expectedEpoch),
      );
    } catch (error) {
      request.resume();
      const fault =
        error instanceof AuthFault
          ? error
          : new AuthFault(503, "service_unavailable");
      if (fault.status === 413 || fault.status === 408) {
        response.setHeader("Connection", "close");
        response.once("finish", () => request.destroy());
      }
      if (fault.status === 429) response.setHeader("Retry-After", "60");
      reply(fault.status, { error: fault.code });
    }
  };
}
