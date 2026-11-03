export function requestMetrics() {
  // Fixed histogram upper bounds; percentile values are approximations, not raw samples.
  const bounds=[10,25,50,100,250,500,1000,2000,5000,10000],buckets=Array(bounds.length+1).fill(0) as number[];
  let requests = 0,
    errors = 0,
    limited = 0,
    totalMs = 0,
    maxMs = 0;
  return {
    record(status: number, ms: number) {
      requests++;
      const bucket=bounds.findIndex(n=>ms<=n);buckets[bucket<0?bounds.length:bucket]!++;
      if (status >= 500) errors++;
      if (status === 429) limited++;
      totalMs += ms;
      maxMs = Math.max(maxMs, ms);
    },
    flush() {
      const percentile=(p:number)=>{let sum=0;for(let i=0;i<buckets.length;i++){sum+=buckets[i]!;if(sum>=Math.ceil(requests*p))return bounds[i]??Math.round(maxMs);}return 0;};
      const snapshot = {
        event: "http_window",
        requests,
        errors,
        limited,
        meanMs: requests ? Math.round(totalMs / requests) : 0,
        maxMs: Math.round(maxMs),
        p50Ms:requests?percentile(.5):0,p95Ms:requests?percentile(.95):0,p99Ms:requests?percentile(.99):0,
      };
      buckets.fill(0);
      requests = errors = limited = totalMs = maxMs = 0;
      return snapshot;
    },
  };
}
