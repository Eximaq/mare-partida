export function requestMetrics() {
  let requests = 0,
    errors = 0,
    limited = 0,
    totalMs = 0,
    maxMs = 0;
  return {
    record(status: number, ms: number) {
      requests++;
      if (status >= 500) errors++;
      if (status === 429) limited++;
      totalMs += ms;
      maxMs = Math.max(maxMs, ms);
    },
    flush() {
      const snapshot = {
        event: "http_window",
        requests,
        errors,
        limited,
        meanMs: requests ? Math.round(totalMs / requests) : 0,
        maxMs: Math.round(maxMs),
      };
      requests = errors = limited = totalMs = maxMs = 0;
      return snapshot;
    },
  };
}
