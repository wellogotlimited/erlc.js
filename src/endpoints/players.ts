import { HttpClient } from "../core/http";
import { PlayersResponse, StaffResponse, BanEntry } from "../types/responses";

export class PlayersAPI {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.request(
      "/v1/server/players",
      { method: "GET" },
      PlayersResponse
    );
  }

  staff() {
    return this.http.request(
      "/v1/server/staff",
      { method: "GET" },
      StaffResponse
    );
  }

  bans() {
    return this.http.request(
      "/v1/server/bans",
      { method: "GET" },
      BanEntry.array()
    );
  }

  /**
   * Queue is an array of Roblox user IDs waiting to join.
   */
  queue() {
    return this.http.request<number[]>("/v1/server/queue", { method: "GET" });
  }
}
