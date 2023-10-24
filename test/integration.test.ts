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

// ALEC TODO - move these tests? how to automate?

describe("ALEC TODO", () => {
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

    const servers: RecoveryServerMap = { [server1Key]: server1 };

    const recovery = wallet.recovery({ servers });

    // Create accounts
    const accountKp = accountService.createKeypair();
    console.log("accountKp:", accountKp.publicKey); // ALEC TODO - remove

    const deviceKp = accountService.createKeypair();
    console.log("deviceKp:", deviceKp.publicKey); // ALEC TODO - remove

    const recoveryKp = accountService.createKeypair();
    console.log("recoveryKp:", recoveryKp.publicKey); // ALEC TODO - remove

    // Make sure exists
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

    // Create recoverable wallet

    const config: RecoverableWalletConfig = {
      accountAddress: accountKp,
      deviceAddress: deviceKp,
      accountThreshold: { low: 10, medium: 10, high: 10 },
      accountIdentity: { [server1Key]: [identity1] },
      signerWeight: { device: 10, recoveryServer: 5 },
    };
    const recoverableWallet = await recovery.createRecoverableWallet(config);

    // Sign and submit

    recoverableWallet.transaction.sign(accountKp.keypair);
    await stellar.submitTransaction(recoverableWallet.transaction);

    let resp = await stellar.server.loadAccount(accountKp.publicKey);

    expect(resp.signers.map((obj) => obj.weight)).toEqual([5, 10, 0]);
    expect(
      resp.signers.find((obj) => obj.key === accountKp.publicKey).weight,
    ).toBe(0);
    expect(
      resp.signers.find((obj) => obj.key === deviceKp.publicKey).weight,
    ).toBe(10);

    // Get Account Info

    const authToken = await recovery
      .sep10Auth(server1Key)
      .authenticate({ accountKp: recoveryKp });

    const authMap = { [server1Key]: authToken };

    const accountResp = await recovery.getAccountInfo(accountKp, authMap);
    expect(accountResp[server1Key].address).toBe(accountKp.publicKey);
    expect(accountResp[server1Key].identities[0].role).toBe("owner");
    expect(accountResp[server1Key].signers.length).toBe(1);

    console.log({ accountResp }); // ALEC TODO - remove
    console.log(accountResp.server1.identities); // ALEC TODO - remove
    console.log(accountResp.server1.signers); // ALEC TODO - remove

    // Recover Wallet

    const recoverySignerAddress = recoverableWallet.signers[0];
    const newKp = accountService.createKeypair();
    const signerMap = {
      [server1Key]: {
        signerAddress: recoverySignerAddress,
        authToken,
      },
    };
    const recoverTxn = await recovery.replaceDeviceKey(
      accountKp,
      newKp,
      signerMap,
    );

    recoverTxn.sign(deviceKp.keypair);
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
