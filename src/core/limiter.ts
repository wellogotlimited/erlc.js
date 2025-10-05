import Bottleneck from "bottleneck";
import { parseRateHeaders } from "../utils/headers";

export class RateCoordinator {
  private limiter: Bottleneck;

  constructor(rpm = 60) {
    this.limiter = new Bottleneck({
      reservoir: rpm,
      reservoirRefreshAmount: rpm,
      reservoirRefreshInterval: 60_000,
      minTime: 0,
      maxConcurrent: 1,
    });
  }

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(fn);
  }

  updateFromHeaders(headers: Headers) {
    const rh = parseRateHeaders(headers);
    if (typeof rh.remaining === "number") {
      this.limiter.updateSettings({ reservoir: Math.max(0, rh.remaining) });
    }
    if (typeof rh.resetSeconds === "number") {
      setTimeout(() => {
        const current = (this.limiter as any).reservoir as number | null;
        if (current != null) {
          const cfg = (this.limiter as any).store.__defaults;
          this.limiter.updateSettings({
            reservoir: cfg.reservoirRefreshAmount,
          });
        }
      }, rh.resetSeconds * 1000);
    }
  }
}
