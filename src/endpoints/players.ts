import z from "zod";
import { HttpClient } from "../core/http";
import {
  PlayersResponse,
  StaffResponse,
  BanEntry,
  PlayerSchema,
} from "../types/responses";

export class PlayersAPI {
  constructor(private http: HttpClient) {}

  async list() {
    return z
      .array(PlayerSchema)
      .parse(await this.http.request("/v1/server/players", { method: "GET" }));
  }

  staff() {
    return this.http.request(
      "/v1/server/staff",
      { method: "GET" },
      StaffResponse
    );
  }

  /** @returns {Promise<Record<string, string>>} Map of player IDs to banned usernames. */
  bans() {
    return this.http.request("/v1/server/bans", { method: "GET" }, BanEntry);
  }

  /**
   * Queue is an array of Roblox user IDs waiting to join.
   */
  queue() {
    return this.http.request<number[]>("/v1/server/queue", { method: "GET" });
  }
}
