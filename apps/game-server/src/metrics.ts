export type HttpRouteGroup = "health" | "login" | "auth" | "frame" | "state" | "command" | "control" | "other";

const characterRoutes = {
  frame: "frame",
  "online-state": "state",
  state: "state",
  commands: "command",
  control: "control",
  "control/renew": "control",
} as const;

export function httpRouteGroup(path: string | undefined): HttpRouteGroup {
  if (path === "/health/live" || path === "/health/ready") return "health";
  if (path === "/v1/auth/login") return "login";
  if (path === "/v1/me" || path?.startsWith("/v1/auth/")) return "auth";
  const suffix = path?.match(/^\/v1\/characters\/[0-9a-f-]{36}\/(frame|online-state|state|commands|control(?:\/renew)?)$/)?.[1];
  return suffix ? characterRoutes[suffix as keyof typeof characterRoutes] : "other";
}

// Fixed histogram upper bounds. Completed responses and aborted connections
// are counted separately so disconnects cannot distort response percentiles.
const bounds = [10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000];

function histogram() {
  const buckets = Array<number>(bounds.length + 1).fill(0);
  let requests = 0;
  let errors = 0;
  let limited = 0;
  let aborted = 0;
  let totalMs = 0;
  let maxMs = 0;
  function percentile(p: number) {
    if (!requests) return 0;
    const rank = Math.ceil(requests * p);
    let sum = 0;
    for (let i = 0; i < buckets.length; i++) {
      sum += buckets[i]!;
      if (sum >= rank) return bounds[i] ?? Math.round(maxMs);
    }
    return 0;
  }
  return {
    record(status: number | null, ms: number) {
      if (status === null) {
        aborted++;
        return;
      }
      requests++;
      const bucket = bounds.findIndex(bound => ms <= bound);
      buckets[bucket < 0 ? bounds.length : bucket]!++;
      if (status >= 500) errors++;
      if (status === 429) limited++;
      totalMs += ms;
      maxMs = Math.max(maxMs, ms);
    },
    snapshot() {
      return {
        requests, errors, limited, aborted,
        meanMs: requests ? Math.round(totalMs / requests) : 0,
        maxMs: Math.round(maxMs),
        p50Ms: percentile(.5),
        p95Ms: percentile(.95),
        p99Ms: percentile(.99),
      };
    },
  };
}

type HttpWindow = ReturnType<ReturnType<typeof histogram>["snapshot"]>;

export function requestMetrics() {
  let total = histogram();
  const byRoute = new Map<HttpRouteGroup, ReturnType<typeof histogram>>();
  return {
    record(status: number | null, ms: number, route: HttpRouteGroup = "other") {
      let entry = byRoute.get(route);
      if (!entry) {
        entry = histogram();
        byRoute.set(route, entry);
      }
      entry.record(status, ms);
      total.record(status, ms);
    },
    flush() {
      const routes: Partial<Record<HttpRouteGroup, HttpWindow>> = {};
      for (const [route, entry] of byRoute) routes[route] = entry.snapshot();
      const window = { event: "http_window", ...total.snapshot(), routes };
      total = histogram();
      byRoute.clear();
      return window;
    },
  };
}
