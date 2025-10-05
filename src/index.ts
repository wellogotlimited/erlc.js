import { HttpClient, HttpClientOptions } from "./core/http";
import { ServerAPI } from "./endpoints/server";
import { PlayersAPI } from "./endpoints/players";
import { LogsAPI } from "./endpoints/logs";

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

export type { HttpClientOptions } from "./core/http";
