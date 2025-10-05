import { clampDelay, parseRateHeaders } from "../utils/headers";

const DEFAULT_WINDOW_MS = 60_000;
const MAX_TIMEOUT = 2 ** 31 - 1;

export type SmoothRateLimiterOptions = {
  requestsPerMinute?: number;
  maxConcurrency?: number;
  minIntervalMs?: number;
  debug?: boolean;
};

type QueueTask<T> = {
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

export class SmoothRateLimiter {
  private readonly defaultRpm: number;
  private readonly maxConcurrency: number;
  private readonly minInterval: number;
  private readonly debug: boolean;
  private readonly baseConcurrency: number;

  private readonly queue: QueueTask<any>[] = [];
  private running = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private timerDueTime = 0;
  private nextAvailableTime = 0;

  private currentInterval: number;
  private currentConcurrency: number;
  private windowResetAt?: number;
  private windowDuration = DEFAULT_WINDOW_MS;

  constructor(options: SmoothRateLimiterOptions = {}) {
    this.defaultRpm = Math.max(1, options.requestsPerMinute ?? 60);
    this.maxConcurrency = Math.max(1, options.maxConcurrency ?? 4);
    this.minInterval = Math.max(0, options.minIntervalMs ?? 0);
    this.debug = Boolean(options.debug);

    this.currentInterval = this.defaultInterval();
    this.baseConcurrency = 1;
    this.currentConcurrency = this.baseConcurrency;
  }

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.log("enqueued", { queued: this.queue.length });
      this.pump();
    });
  }

  updateFromHeaders(headers: Headers) {
    const rate = parseRateHeaders(headers);
    const now = Date.now();
    this.maybeReset(now);

    if (typeof rate.resetSeconds === "number") {
      const { resetAt, durationMs } = this.resolveReset(rate.resetSeconds, now);
      if (resetAt) {
        this.windowResetAt = resetAt;
        if (durationMs) {
          this.windowDuration = durationMs;
        }
        this.scheduleTimer(Math.max(0, resetAt - now));
      }
    }

    if (typeof rate.remaining === "number") {
      const remaining = Math.max(0, rate.remaining);
      const tokens = remaining + 1;
      const resetAt = this.windowResetAt;
      const timeToReset = resetAt ? Math.max(0, resetAt - now) : this.windowDuration;
      const interval = this.calculateInterval(tokens, timeToReset || this.windowDuration);
      this.currentInterval = interval;
      this.currentConcurrency = this.calculateConcurrency(tokens, timeToReset || this.windowDuration);
      this.log("headers", {
        remaining,
        interval,
        concurrency: this.currentConcurrency,
        timeToReset,
      });
    }

    this.pump();
  }

  penalize(waitMs: number) {
    const delay = clampDelay(waitMs);
    if (delay <= 0) {
      return;
    }
    const target = Date.now() + delay;
    this.nextAvailableTime = Math.max(this.nextAvailableTime, target);
    this.scheduleTimer(this.nextAvailableTime - Date.now());
    this.log("penalize", { delay });
  }

  private pump() {
    if (!this.queue.length) {
      this.clearTimer();
      return;
    }

    const now = Date.now();
    this.maybeReset(now);

    if (this.running >= this.currentConcurrency) {
      this.scheduleTimer(this.nextAvailableTime - now);
      return;
    }

    if (now < this.nextAvailableTime) {
      this.scheduleTimer(this.nextAvailableTime - now);
      return;
    }

    const task = this.queue.shift() as QueueTask<any>;
    this.running++;
    const startAt = Math.max(now, this.nextAvailableTime);
    this.nextAvailableTime = startAt + this.currentInterval;
    this.log("start", {
      running: this.running,
      nextAvailableIn: Math.max(0, this.nextAvailableTime - Date.now()),
    });

    Promise.resolve()
      .then(() => task.fn())
      .then((result) => {
        this.running--;
        task.resolve(result);
        this.log("finish", { running: this.running });
        this.pump();
      })
      .catch((error) => {
        this.running--;
        task.reject(error);
        this.log("error", { running: this.running, error });
        this.pump();
      });
  }

  private maybeReset(now: number) {
    if (this.windowResetAt && now >= this.windowResetAt) {
      this.log("reset", {});
      this.windowResetAt = undefined;
      this.windowDuration = DEFAULT_WINDOW_MS;
      this.currentInterval = this.defaultInterval();
      this.currentConcurrency = this.baseConcurrency;
      this.nextAvailableTime = Math.min(this.nextAvailableTime, now);
    }
  }

  private calculateInterval(tokens: number, timeToReset: number) {
    const duration = Math.max(this.minInterval, timeToReset);
    const interval = duration / Math.max(1, tokens);
    return Math.max(this.minInterval, Math.ceil(interval));
  }

  private calculateConcurrency(tokens: number, timeToReset: number) {
    if (timeToReset <= 0) {
      return this.baseConcurrency;
    }
    const desiredRatePerMs = tokens / timeToReset;
    const defaultRatePerMs = 1 / this.defaultInterval();
    const ratio = desiredRatePerMs / defaultRatePerMs;
    const concurrency = Math.min(
      this.maxConcurrency,
      Math.max(1, Math.round(ratio))
    );
    return Math.max(this.baseConcurrency, concurrency);
  }

  private resolveReset(resetSeconds: number, now: number) {
    if (!Number.isFinite(resetSeconds)) {
      return { resetAt: undefined, durationMs: undefined };
    }

    const seconds = Math.max(0, resetSeconds);
    const currentSeconds = Math.floor(now / 1000);

    // Heuristic: treat very large values as absolute timestamps.
    if (seconds > currentSeconds + 5 || seconds > 100_000) {
      const resetAt = seconds * 1000;
      const duration = Math.max(this.defaultInterval(), resetAt - now);
      return { resetAt, durationMs: duration };
    }

    const duration = seconds * 1000;
    return { resetAt: now + duration, durationMs: duration || this.windowDuration };
  }

  private defaultInterval() {
    return Math.max(this.minInterval, Math.ceil(DEFAULT_WINDOW_MS / this.defaultRpm));
  }

  private scheduleTimer(ms: number) {
    const delay = clampDelay(ms);
    const now = Date.now();
    const delayOrZero = delay === 0 ? 0 : Math.min(delay, MAX_TIMEOUT);
    const dueTime = now + delayOrZero;

    if (this.timer) {
      if (dueTime >= this.timerDueTime - 5) {
        return;
      }
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    this.timerDueTime = dueTime;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.timerDueTime = 0;
      this.pump();
    }, delayOrZero);
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
      this.timerDueTime = 0;
    }
  }

  private log(event: string, payload: Record<string, unknown>) {
    if (!this.debug) return;
    // eslint-disable-next-line no-console
    console.debug(`[SmoothRateLimiter] ${event}`, payload);
  }
}

export type RateLimiterManagerOptions = SmoothRateLimiterOptions;

export class RateLimiterManager {
  private readonly limiters = new Map<string, SmoothRateLimiter>();
  private readonly options: SmoothRateLimiterOptions;

  constructor(options: RateLimiterManagerOptions = {}) {
    this.options = options;
  }

  forPath(path: string): SmoothRateLimiter {
    const key = this.normalizePath(path);
    let limiter = this.limiters.get(key);
    if (!limiter) {
      limiter = new SmoothRateLimiter(this.options);
      this.limiters.set(key, limiter);
    }
    return limiter;
  }

  private normalizePath(path: string) {
    try {
      const url = new URL(path, "https://placeholder.local");
      return url.pathname || "/";
    } catch {
      const [clean] = path.split("?");
      return clean || "/";
    }
  }
}
