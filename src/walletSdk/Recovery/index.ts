// TODO - https://stellarorg.atlassian.net/browse/WAL-815?atlOrigin=eyJpIjoiYTE4MTdlZDIwMDU1NGU2YjlhZjQ3MDFlYmJhZWM1NTciLCJwIjoiaiJ9
import { AxiosInstance } from "axios";
import { Server } from "stellar-sdk";

import { Config } from "walletSdk";
import { Stellar } from "../Horizon";

// Let's prevent exporting this constructor type as
// we should not create this Recovery class directly.
type RecoveryParams = {
  cfg: Config;
  stellar: Stellar;
  httpClient: AxiosInstance;
  servers: Server[];
};

// Do not create this object directly, use the Wallet class.
export class Recovery {
  private cfg: Config;
  private stellar: Stellar;
  private httpClient: AxiosInstance;
  private servers: Server[];

  constructor(params: RecoveryParams) {
    const { cfg, stellar, httpClient, servers } = params;

    this.cfg = cfg;
    this.stellar = stellar;
    this.httpClient = httpClient;
    this.servers = servers;
  }
}
