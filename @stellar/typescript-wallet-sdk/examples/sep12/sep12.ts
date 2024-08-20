import path from "path";

import * as dotenv from "dotenv";
import { SigningKeypair, walletSdk } from "../../src";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const main = async () => {
  const homeDomain = process.env.ANCHOR_DOMAIN || "testanchor.stellar.org";
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error("No secret key provided");
  }

  const wallet = walletSdk.Wallet.TestNet();
  const anchor = wallet.anchor({ homeDomain });

  const authKey = SigningKeypair.fromSecret(secretKey);
  const sep10 = await anchor.sep10();
  const authToken = await sep10.authenticate({ accountKp: authKey });
  const sep12 = await anchor.sep12(authToken);

  const response = await sep12.add({
    sep9Info: {
      first_name: "john",
      last_name: "smith",
      email_address: "123@gmail.com",
      bank_number: "12345",
      bank_account_number: "12345",
    },
    sep9BinaryInfo: {
      photo_id_front: "./path/to/image/front",
      photo_id_back: "./path/to/image/back",
    },
  });

  console.log(response.id);
};

main();
