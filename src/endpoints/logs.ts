import z from "zod";
import { HttpClient } from "../core/http";
import {
  JoinLogEntry,
  KillLogEntry,
  CommandLogEntry,
  ModCallEntry,
} from "../types/responses";

export class LogsAPI {
  constructor(private http: HttpClient) {}

  joins() {
    return this.http.request(
      "/v1/server/joinlogs",
      { method: "GET" },
      JoinLogEntry.array()
    );
  }

  async kills() {
    return z
      .array(KillLogEntry)
      .parse(await this.http.request("/v1/server/killlogs", { method: "GET" }));
  }

  commands() {
    return this.http.request(
      "/v1/server/commandlogs",
      { method: "GET" },
      CommandLogEntry.array()
    );
  }

  async modCalls() {
    return z
      .array(ModCallEntry)
      .parse(await this.http.request("/v1/server/modcalls", { method: "GET" }));
  }
}
