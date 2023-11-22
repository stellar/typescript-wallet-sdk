import axios from "axios";
import { Wallet } from "../src";

import {
  RecoveryServer,
  RecoveryServerKey,
  RecoveryServerMap,
  RecoverableWalletConfig,
  RecoveryRole,
  RecoveryAccountIdentity,
  RecoveryType,
} from "../src/walletSdk/Types/recovery";

describe("Recovery Integration Tests", () => {
  it("should work", async () => {
    const wallet = Wallet.TestNet();
    const stellar = wallet.stellar();
    const accountService = stellar.account();

    const server1Key: RecoveryServerKey = "server1";
    const server1: RecoveryServer = {
      endpoint: "http://localhost:8000",
      authEndpoint: "http://localhost:8001",
      homeDomain: "test-domain",
    };

    const server2Key: RecoveryServerKey = "server2";
    const server2: RecoveryServer = {
      endpoint: "http://localhost:8002",
      authEndpoint: "http://localhost:8003",
      homeDomain: "test-domain",
    };

    const servers: RecoveryServerMap = {
      [server1Key]: server1,
      [server2Key]: server2,
    };

    const recovery = wallet.recovery({ servers });

    // Create accounts

    const accountKp = accountService.createKeypair();
    const deviceKp = accountService.createKeypair();
    const recoveryKp = accountService.createKeypair();

    try {
      await stellar.server.loadAccount(accountKp.publicKey);
      await stellar.server.loadAccount(deviceKp.publicKey);
      await stellar.server.loadAccount(recoveryKp.publicKey);
    } catch (e) {
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + accountKp.publicKey,
      );
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + deviceKp.publicKey,
      );
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + recoveryKp.publicKey,
      );
    }

    // Create SEP-30 identities

    const identity1: RecoveryAccountIdentity = {
      role: RecoveryRole.OWNER,
      authMethods: [
        {
          type: RecoveryType.STELLAR_ADDRESS,
          value: recoveryKp.publicKey,
        },
      ],
    };

    const identity2: RecoveryAccountIdentity = {
      role: RecoveryRole.OWNER,
      authMethods: [
        {
          type: RecoveryType.STELLAR_ADDRESS,
          value: recoveryKp.publicKey,
        },
        {
          type: RecoveryType.EMAIL,
          value: "my-email@example.com",
        },
      ],
    };

    // Create recoverable wallet

    const config: RecoverableWalletConfig = {
      accountAddress: accountKp,
      deviceAddress: deviceKp,
      accountThreshold: { low: 10, medium: 10, high: 10 },
      accountIdentity: { [server1Key]: [identity1], [server2Key]: [identity2] },
      signerWeight: { device: 10, recoveryServer: 5 },
    };
    const recoverableWallet = await recovery.createRecoverableWallet(config);

    // Sign and submit

    recoverableWallet.transaction.sign(accountKp.keypair);
    await stellar.submitTransaction(recoverableWallet.transaction);

    let resp = await stellar.server.loadAccount(accountKp.publicKey);

    expect(resp.signers.map((obj) => obj.weight).sort((a, b) => a - b)).toEqual(
      [0, 5, 5, 10],
    );
    expect(
      resp.signers.find((obj) => obj.key === accountKp.publicKey).weight,
    ).toBe(0);
    expect(
      resp.signers.find((obj) => obj.key === deviceKp.publicKey).weight,
    ).toBe(10);

    // Get Account Info

    const authToken1 = await recovery
      .sep10Auth(server1Key)
      .authenticate({ accountKp: recoveryKp });

    const authMap = { [server1Key]: authToken1 };

    const accountResp = await recovery.getAccountInfo(accountKp, authMap);
    expect(accountResp[server1Key].address).toBe(accountKp.publicKey);
    expect(accountResp[server1Key].identities[0].role).toBe("owner");
    expect(accountResp[server1Key].signers.length).toBe(1);

    // Recover Wallet

    const authToken2 = await recovery
      .sep10Auth(server2Key)
      .authenticate({ accountKp: recoveryKp });

    const recoverySignerAddress1 = recoverableWallet.signers[0];
    const recoverySignerAddress2 = recoverableWallet.signers[1];
    const newKp = accountService.createKeypair();
    const signerMap = {
      [server1Key]: {
        signerAddress: recoverySignerAddress1,
        authToken: authToken1,
      },
      [server2Key]: {
        signerAddress: recoverySignerAddress2,
        authToken: authToken2,
      },
    };
    const recoverTxn = await recovery.replaceDeviceKey(
      accountKp,
      newKp,
      signerMap,
    );

    await stellar.submitTransaction(recoverTxn);

    resp = await stellar.server.loadAccount(accountKp.publicKey);

    expect(
      resp.signers.find((obj) => obj.key === deviceKp.publicKey),
    ).toBeFalsy();
    expect(resp.signers.find((obj) => obj.key === newKp.publicKey).weight).toBe(
      10,
    );
  }, 60000);
});
