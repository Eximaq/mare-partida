import { createServer } from "node:https";
import type { Socket } from "node:net";
import { request as proxyRequest } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { pathToFileURL } from "node:url";

export function createDevGateway(options: {
  key: string;
  cert: string;
  staticRoot: string;
  onlineRoot: string;
  upstream: URL;
  access?: { host: string; peers: string[] };
  redirectOrigin?: string;
}) {
  if (
    options.upstream.protocol !== "http:" ||
    options.upstream.hostname !== "127.0.0.1" ||
    options.upstream.username ||
    options.upstream.password
  ) {
    throw new Error("Development gateway requires a private loopback upstream");
  }
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ttf": "font/ttf",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
  };
  const server = createServer(
    { key: options.key, cert: options.cert, maxHeaderSize: 8192 },
    (req, res) => {
      if (options.access && (
        !options.access.peers.includes(req.socket.remoteAddress ?? "") ||
        req.headers.host !== options.access.host
      )) {
        res.writeHead(421, { Connection: "close" }).end("Unavailable");
        return;
      }
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store");
      const fail = (status: number) => {
        if (!res.headersSent)
          res
            .writeHead(status, { "Content-Type": "text/plain" })
            .end("Unavailable");
        else res.destroy();
      };
      let path: string;
      try {
        if (
          !req.url?.startsWith("/") ||
          req.url.startsWith("//") ||
          req.url.includes("\\")
        ) {
          fail(400);
          return;
        }
        path = decodeURIComponent(
          new URL(req.url ?? "/", "https://localhost").pathname,
        );
      } catch {
        fail(400);
        return;
      }
      if (options.redirectOrigin && (req.method === "GET" || req.method === "HEAD") &&
          (path.startsWith("/online/") || path === "/game")) {
        res.writeHead(302, { Location: options.redirectOrigin + req.url }).end();
        return;
      }
      if (path.startsWith("/v1/") || path.startsWith("/health/")) {
        const headers = { ...req.headers };
        for (const key of [
          "host",
          "connection",
          "forwarded",
          "x-forwarded-for",
          "x-forwarded-host",
          "x-forwarded-proto",
          "proxy-authorization",
          "proxy-connection",
        ])
          delete headers[key];
        const upstream = proxyRequest(
          new URL(options.upstream.origin + req.url),
          { method: req.method, headers, timeout: 10000 },
          (incoming) => {
            res.writeHead(incoming.statusCode ?? 502, incoming.headers);
            incoming.pipe(res);
          },
        );
        upstream.on("timeout", () => upstream.destroy());
        upstream.on("error", () => fail(502));
        req.on("aborted", () => upstream.destroy());
        req.pipe(upstream);
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        req.resume();
        fail(405);
        return;
      }
      req.resume();
      if (
        path.includes("\\") ||
        path.split("/").some((part) => part.startsWith("."))
      ) {
        fail(404);
        return;
      }
      const online = path.startsWith("/online/");
      const root = resolve(online ? options.onlineRoot : options.staticRoot);
      const relative = online ? path.slice("/online/".length) : path.slice(1);
      const candidate = resolve(
        root,
        path === "/game" ? "index.html" : relative + (path.endsWith("/") ? "index.html" : ""),
      );
      const type = types[extname(candidate)];
      if (!candidate.startsWith(root + sep) || !type) {
        fail(404);
        return;
      }
      void (async () => {
        const [canonicalRoot, canonicalFile] = await Promise.all([
          realpath(root),
          realpath(candidate),
        ]);
        if (
          !canonicalFile.startsWith(canonicalRoot + sep) ||
          !(await stat(canonicalFile)).isFile()
        ) {
          fail(404);
          return;
        }
        res.setHeader("Content-Type", type);
        if (online)
          res.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
          );
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        if(path === "/game") {
          const html=await readFile(canonicalFile,"utf8");
          const boot='<script defer src="/online/game-session.js"></script><script defer src="/online/game-ui.js"></script><link rel="stylesheet" href="/online/game.css">';
          res.end(html.includes('<head>')?html.replace('<head>','<head>'+boot):boot+html);
          return;
        }
        const stream = createReadStream(canonicalFile);
        stream.on("error", () => fail(404));
        stream.pipe(res);
      })().catch(() => fail(404));
    },
  );
  server.requestTimeout = 10000;
  // Upgrade is an explicit route, with the same private host/peer boundary as HTTP.
  const upgraded = new Set<import('node:stream').Duplex>();
  server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => socket.destroy());
    const reject = (status:number) => socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    if (req.method !== 'GET' || req.url !== '/v1/realtime') return void reject(404);
    if (options.access && (req.headers.host !== options.access.host || !options.access.peers.includes(req.socket.remoteAddress ?? ''))) return void reject(421);
    const headers = {...req.headers};
    for(const key of ['host','forwarded','x-forwarded-for','x-forwarded-host','x-forwarded-proto','x-mare-client-ip','proxy-authorization','proxy-connection']) delete headers[key];
    headers.connection = 'Upgrade'; headers.upgrade = 'websocket';
    const upstream = proxyRequest(new URL(options.upstream.origin + '/v1/realtime'), {method:'GET',headers,timeout:5000});
    upgraded.add(socket);socket.once('close',()=>{upgraded.delete(socket);upstream.destroy();});
    upstream.on('timeout',()=>upstream.destroy());
    upstream.on('error',()=>{if(!socket.destroyed)socket.destroy();});
    upstream.on('response',response=>{response.resume();reject(response.statusCode ?? 502);});
    upstream.on('upgrade',(response,peer,upstreamHead)=>{
      upstream.setTimeout(0);peer.setTimeout(0);(socket as Socket).setTimeout(0);
      upgraded.add(peer);
      const close=()=>{upgraded.delete(peer);peer.destroy();socket.destroy();};
      peer.on('error',close);peer.once('close',close);socket.once('close',close);
      if(socket.destroyed)return close();
      socket.write('HTTP/1.1 101 Switching Protocols\r\n'+response.rawHeaders.reduce((s,_v,i,a)=>i%2?s:s+a[i]+': '+a[i+1]+'\r\n','')+'\r\n');
      if(upstreamHead.length)socket.write(upstreamHead);
      if(head.length)peer.write(head);
      peer.pipe(socket);socket.pipe(peer);
    });
    upstream.end();
  });
  const close = server.close.bind(server);
  server.close = ((callback?: (error?:Error)=>void) => {
    for(const socket of upgraded)socket.destroy();
    return close(callback);
  }) as typeof server.close;
  if (options.access) server.on("connection", socket => {
    if (!options.access!.peers.includes((socket as Socket).remoteAddress ?? ""))
      socket.destroy();
  });
  server.headersTimeout = 5000;
  server.maxConnections = 128;
  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const key = await readFile(
      process.env.DEV_TLS_KEY ?? "infra/local/localhost.key",
      "utf8",
    );
    const cert = await readFile(
      process.env.DEV_TLS_CERT ?? "infra/local/localhost.crt",
      "utf8",
    );
    const server = createDevGateway({
      key,
      cert,
      staticRoot: resolve("dist"),
      onlineRoot: resolve("apps/account-client"),
      upstream: new URL("http://127.0.0.1:8788"),
    });
    server.listen(9443, "127.0.0.1", () =>
      console.log("Development gateway: https://localhost:9443/online/"),
    );
  } catch {
    console.error("Development TLS configuration unavailable");
    process.exitCode = 1;
  }
}
