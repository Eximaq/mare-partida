import { isIP } from "node:net";
import type { IncomingMessage } from "node:http";
const normalize = (ip: string) =>
  ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
// Only an explicitly trusted, directly connected proxy may supply this header.
export function clientAddress(
  request: Pick<IncomingMessage, "socket" | "headers" | "rawHeaders">,
  trustedProxy?: string,
) {
  const peer = normalize(request.socket.remoteAddress ?? "unknown");
  if (!trustedProxy || peer !== normalize(trustedProxy)) return peer;
  const value = request.headers["x-mare-client-ip"];
  const count = request.rawHeaders
    .filter((_, i) => i % 2 === 0)
    .filter((h) => h.toLowerCase() === "x-mare-client-ip").length;
  if (typeof value !== "string" || !isIP(value) || count !== 1)
    throw new Error("Invalid proxy identity");
  return normalize(value);
}
