import { HttpClient, HttpClientOptions, HttpError } from "./core/http";
import { ServerAPI } from "./endpoints/server";
import { PlayersAPI } from "./endpoints/players";
import { LogsAPI } from "./endpoints/logs";
import {
  PermissionEnum,
  PlayerSchema,
  PlayersResponse,
  JoinLogEntry,
  KillLogEntry,
  ServerStatus,
  CommandLogEntry,
  ModCallEntry,
  BanEntry,
  VehicleEntry,
  StaffResponse,
} from "./types/responses";
import type {
  TServerStatus,
  TPlayersResponse,
  TJoinLogEntry,
  TKillLogEntry,
  TCommandLogEntry,
  TModCallEntry,
  TBanEntry,
  TVehicleEntry,
  TStaffResponse,
} from "./types/responses";

export class PRC {
  readonly server: ServerAPI;
  readonly players: PlayersAPI;
  readonly logs: LogsAPI;

  constructor(opts: Omit<HttpClientOptions, "retries"> & { retries?: number }) {
    const http = new HttpClient(opts);
    this.server = new ServerAPI(http);
    this.players = new PlayersAPI(http);
    this.logs = new LogsAPI(http);
  }
}

export { HttpClient, HttpError };
export type { HttpClientOptions };
export { parseRateHeaders } from "./utils/headers";

export {
  PermissionEnum,
  PlayerSchema,
  PlayersResponse,
  JoinLogEntry,
  KillLogEntry,
  ServerStatus,
  CommandLogEntry,
  ModCallEntry,
  BanEntry,
  VehicleEntry,
  StaffResponse,
};

export type {
  TServerStatus,
  TPlayersResponse,
  TJoinLogEntry,
  TKillLogEntry,
  TCommandLogEntry,
  TModCallEntry,
  TBanEntry,
  TVehicleEntry,
  TStaffResponse,
};
export type { RateHeaders } from "./utils/headers";
