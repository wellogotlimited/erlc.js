import { ZodSchema } from "zod";
import { RateCoordinator } from "./limiter";
import { parseRateHeaders, sleep } from "../utils/headers";

type CacheEntry<T = unknown> = { etag: string; data: T };

export type HttpClientOptions = {
  baseUrl?: string;
  serverKey: string;
  rpm?: number; // default 60
  retries?: number; // default 3
  userAgent?: string;
  fetch?: typeof fetch;
};

export class HttpClient {
  private readonly baseUrl: string;
  private readonly serverKey: string;
  private readonly limiter: RateCoordinator;
  private readonly retries: number;
  private readonly userAgent?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly etagCache: Map<string, CacheEntry> = new Map();

  constructor(opts: HttpClientOptions) {
    this.baseUrl = (
      opts.baseUrl ?? "https://api.policeroleplay.community"
    ).replace(/\/$/, "");
    this.serverKey = opts.serverKey;
    this.limiter = new RateCoordinator(opts.rpm ?? 60);
    this.retries = Math.max(0, opts.retries ?? 3);
    this.userAgent = opts.userAgent;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;

    if (!this.fetchImpl) {
      throw new Error(
        "No fetch implementation available. Provide HttpClientOptions.fetch when running outside environments with global fetch."
      );
    }
  }

  async request<T>(
    path: string,
    init: RequestInit = {},
    schema?: ZodSchema<T>
  ): Promise<T> {
    const url = this.resolveUrl(path);
    const method = this.normalizeMethod(init.method);
    const headers = this.prepareHeaders(init.headers, init.body != null);
    const cacheable = method === "GET" && init.body == null;
    const cacheKey = cacheable ? this.cacheKey(url, method) : undefined;

    if (cacheable && cacheKey) {
      const cached = this.etagCache.get(cacheKey);
      if (cached?.etag) {
        headers.set("if-none-match", cached.etag);
      }
    }

    const run = async (): Promise<T> => {
      const response = await this.fetchImpl(url, {
        ...init,
        method,
        headers,
      });

      this.limiter.updateFromHeaders(response.headers);

      if (cacheable && cacheKey && response.status === 304) {
        const cached = this.etagCache.get(cacheKey);
        if (cached) {
          return cached.data as T;
        }
      }

      if (cacheable && cacheKey) {
        const newEtag = response.headers.get("etag");
        const cached = this.etagCache.get(cacheKey);

        /*
          The PRC API never returns 304 responses, so we validate the ETag header
          ourselves. When the header matches the cached entry we can safely reuse
          the previous payload.
        */
        if (response.ok && newEtag && cached && cached.etag === newEtag) {
          return cached.data as T;
        }
      }

      if (!response.ok) {
        throw await this.toHttpError(response);
      }

      const payload = await this.parseBody<unknown>(response, url);
      const validated = schema ? schema.parse(payload) : (payload as T);

      if (cacheable && cacheKey) {
        const etag = response.headers.get("etag");
        if (etag) {
          this.etagCache.set(cacheKey, { etag, data: validated });
        }
      }

      return validated;
    };

    return this.limiter.schedule(() => this.withRetries(run));
  }

  private async withRetries<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastErr: unknown;

    while (attempt <= this.retries) {
      try {
        return await fn();
      } catch (error) {
        lastErr = error;

        if (error instanceof HttpError) {
          if (!this.shouldRetry(error.status)) {
            break;
          }

          const wait =
            typeof error.retryAfterMs === "number"
              ? error.retryAfterMs
              : this.backoff(attempt);

          await sleep(wait);
          attempt++;
          continue;
        }

        break;
      }
    }

    throw lastErr;
  }

  private shouldRetry(status?: number) {
    return status === 429 || status === 503 || status === 500;
  }

  private backoff(attempt: number) {
    const base = 300 * Math.pow(2, attempt);
    const jitter = Math.random() * 200;
    return Math.min(10_000, base + jitter);
  }

  private resolveUrl(path: string) {
    if (/^https?:/i.test(path)) {
      return path;
    }
    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  private normalizeMethod(method?: string) {
    return (method ?? "GET").toUpperCase();
  }

  private prepareHeaders(
    initHeaders: RequestInit["headers"],
    hasBody: boolean
  ) {
    const headers = new Headers(initHeaders);
    headers.set("server-key", this.serverKey);
    headers.set("accept", "application/json");
    if (this.userAgent && !headers.has("user-agent")) {
      headers.set("user-agent", this.userAgent);
    }
    if (hasBody && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return headers;
  }

  private cacheKey(url: string, method: string) {
    return `${method}:${url}`;
  }

  private async parseBody<T>(response: Response, url: string): Promise<T> {
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response from ${url}: ${error}`);
    }
  }

  private async toHttpError(response: Response) {
    const body = await response.text().catch(() => "");
    const { retryAfterSeconds } = parseRateHeaders(response.headers);
    const retryAfterMs =
      typeof retryAfterSeconds === "number" ? retryAfterSeconds * 1000 : undefined;
    const message = body || response.statusText || "Request failed";
    return new HttpError(response.status, message, retryAfterMs);
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public readonly retryAfterMs?: number
  ) {
    super(`[${status}] ${message}`);
    this.name = "HttpError";
  }
}
