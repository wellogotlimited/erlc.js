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

  kills() {
    return this.http.request(
      "/v1/server/killlogs",
      { method: "GET" },
      KillLogEntry.array()
    );
  }

  commands() {
    return this.http.request(
      "/v1/server/commandlogs",
      { method: "GET" },
      CommandLogEntry.array()
    );
  }

  modCalls() {
    return this.http.request(
      "/v1/server/modcalls",
      { method: "GET" },
      ModCallEntry.array()
    );
  }
}
