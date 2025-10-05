export type RateHeaders = {
  remaining?: number;
  resetSeconds?: number;
  retryAfterSeconds?: number;
};

const MAX_TIMEOUT = 2 ** 31 - 1;

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

export function clampDelay(ms: number | undefined | null): number {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) {
    return 0;
  }
  return Math.min(MAX_TIMEOUT, Math.max(0, Math.floor(ms)));
}

export function sleep(ms: number) {
  const delay = clampDelay(ms);
  if (delay === 0) {
    return Promise.resolve();
  }
  return new Promise((r) => setTimeout(r, delay));
}
