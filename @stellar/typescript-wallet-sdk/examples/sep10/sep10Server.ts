import path from "path";
import express from "express";
import { Transaction, Keypair } from "@stellar/stellar-sdk";
import * as dotenv from "dotenv";
import bodyParser from "body-parser";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const PORT = process.env.SERVER_PORT ?? 7000;
const SERVER_SIGNING_KEY = String(process.env.SERVER_SIGNING_KEY);
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the sep-1 stellar.toml file
app.use(
  "/.well-known",
  express.static(path.join(__dirname, "well_known"), {
    setHeaders: function (res) {
      res.set("Access-Control-Allow-Headers", "Content-Type,X-Requested-With");
      res.type("application/json");
      console.log("request to /.well-known");
    },
  }),
);

// Sign requests from the wallet for sep-10 client attribution
app.post("/sign", (req, res) => {
  console.log("request to /sign");
  const envelope_xdr = req.body.transaction;
  const network_passphrase = req.body.network_passphrase;
  const transaction = new Transaction(envelope_xdr, network_passphrase);

  if (Number.parseInt(transaction.sequence, 10) !== 0) {
    res.status(400);
    res.send("transaction sequence value must be '0'");
    return;
  }

  transaction.sign(Keypair.fromSecret(SERVER_SIGNING_KEY));

  res.set("Access-Control-Allow-Origin", "*");
  res.status(200);
  res.send({
    transaction: transaction.toEnvelope().toXDR("base64"),
    network_passphrase: network_passphrase,
  });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
