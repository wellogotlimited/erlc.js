import { ZodSchema } from "zod";
import { RateCoordinator } from "./limiter";
import { parseRateHeaders, sleep } from "../utils/headers";

type CacheEntry = { etag: string; data: any };

export type HttpClientOptions = {
  baseUrl?: string;
  serverKey: string;
  rpm?: number; // default 60
  retries?: number; // default 3
  userAgent?: string;
};

export class HttpClient {
  private baseUrl: string;
  private serverKey: string;
  private limiter: RateCoordinator;
  private retries: number;
  private userAgent?: string;
  private etagCache: Map<string, CacheEntry> = new Map();

  constructor(opts: HttpClientOptions) {
    this.baseUrl = (
      opts.baseUrl ?? "https://api.policeroleplay.community"
    ).replace(/\/$/, "");
    this.serverKey = opts.serverKey;
    this.limiter = new RateCoordinator(opts.rpm ?? 60);
    this.retries = Math.max(0, opts.retries ?? 3);
    this.userAgent = opts.userAgent;
  }

  async request<T>(
    path: string,
    init: RequestInit = {},
    schema?: ZodSchema<T>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const run = async (): Promise<T> => {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "server-key": this.serverKey,
      };
      if (this.userAgent) headers["user-agent"] = this.userAgent;

      const res = await fetch(url, { ...init, headers });
      this.limiter.updateFromHeaders(res.headers);

      /*
        The PRC API doesn't return 304 ever, so we'll just manually check on our side.
        Each time we make a request, it returns a header called 'etag'.
        The next time we make a request, we can check the 'etag' header.
        If it has changed, it means the contents have also changed. 
      */

      const newEtag = res.headers.get("etag");
      const cached = this.etagCache.get(path);

      if (res.ok && newEtag && cached && cached.etag === newEtag) {
        return cached.data as T;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new HttpError(res.status, text || res.statusText);
      }

      const bodyText = await res.text();
      const data = bodyText ? JSON.parse(bodyText) : undefined;
      const validated = schema ? schema.parse(data) : data;

      if (newEtag) {
        this.etagCache.set(path, { etag: newEtag, data: validated });
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
      } catch (e: any) {
        lastErr = e;
        const status = e instanceof HttpError ? e.status : undefined;

        if (status === 429 || status === 503 || status === 500) {
          const backoff = this.backoff(attempt);
          await sleep(backoff);
          attempt++;
          continue;
        }
        break;
      }
    }
    throw lastErr;
  }

  private backoff(attempt: number) {
    const base = 300 * Math.pow(2, attempt);
    const jitter = Math.random() * 200;
    return Math.min(10_000, base + jitter);
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(`[${status}] ${message}`);
    this.name = "HttpError";
  }
}
