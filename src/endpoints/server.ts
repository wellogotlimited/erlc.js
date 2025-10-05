import { HttpClient } from "../core/http";
import { ServerStatus } from "../types/responses";

export class ServerAPI {
  constructor(private http: HttpClient) {}

  status() {
    return this.http.request("/v1/server", { method: "GET" }, ServerStatus);
  }

  /**
   * Executes a command on the server (as Virtual Server Management).
   * Returns 204 No Content on success.
   */
  command(command: string) {
    return this.http.request("/v1/server/command", {
      method: "POST",
      body: JSON.stringify({ command }),
    });
  }
}
