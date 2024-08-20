import path from "path";

import * as dotenv from "dotenv";
import { SigningKeypair, walletSdk } from "../../src";
import { askQuestion } from "helpers/ask-question";

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

  const firstName = await askQuestion("What is your first name?");
  const lastName = await askQuestion("What is your last name?");

  const response = await sep12.add({
    sep9Info: {
      first_name: firstName,
      last_name: lastName,
      // ...
    },
  });

  console.log(response.id);
};

main();
