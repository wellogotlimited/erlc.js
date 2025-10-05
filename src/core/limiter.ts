import Bottleneck from "bottleneck";
import { parseRateHeaders } from "../utils/headers";

export class RateCoordinator {
  private readonly limiter: Bottleneck;
  private readonly rpm: number;

  constructor(rpm = 60) {
    this.rpm = rpm;
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
    const rate = parseRateHeaders(headers);

    if (typeof rate.remaining === "number") {
      this.limiter.updateSettings({
        reservoir: Math.max(0, rate.remaining),
      });
    }

    if (typeof rate.resetSeconds === "number") {
      this.limiter.updateSettings({
        reservoirRefreshInterval: Math.max(1, rate.resetSeconds * 1000),
        reservoirRefreshAmount: this.rpm,
      });
    }
  }
}
