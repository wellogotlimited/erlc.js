export type RateHeaders = {
  remaining?: number;
  resetSeconds?: number;
  retryAfterSeconds?: number;
};

export function parseRateHeaders(h: Headers): RateHeaders {
  const remaining = num(h.get("x-ratelimit-remaining"));
  const resetSeconds = num(h.get("x-ratelimit-reset"));
  const retryAfterSeconds = num(h.get("retry-after"));
  return { remaining, resetSeconds, retryAfterSeconds };
}

function num(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
