import { RecoveryServerNotFoundError } from "walletSdk/Exceptions";
import {
  RecoveryServer,
  RecoveryServerKey,
  RecoveryServerMap,
} from "walletSdk/Types";

export const getServer = (
  servers: RecoveryServerMap,
  serverKey: RecoveryServerKey,
): RecoveryServer => {
  const server = servers[serverKey];

  if (!server) {
    throw new RecoveryServerNotFoundError(serverKey);
  }

  return server;
};
