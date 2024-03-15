import {
  Memo,
  MemoType,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import BigNumber from "bignumber.js";

import {
  formatTokenAmount,
  getTokenInvocationArgs,
  parseTokenAmount,
  scValByType,
} from "../src/walletSdk/Utils";
import { SorobanTokenInterface } from "../src/walletSdk/Types";

const transactions = {
  classic:
    "AAAAAgAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAAGQABqQMAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAAAAAmJaAAAAAAAAAAAFw7E5LAAAAQBu4V+/lttEONNM6KFwdSf5TEEogyEBy0jTOHJKuUzKScpLHyvDJGY+xH9Ri4cIuA7AaB8aL+VdlucCfsNYpKAY=",
  sorobanTransfer:
    "AAAAAgAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrDucaFsAAAWIAAAAMQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABHkEVdJ+UfDnWpBr/qF582IEoDQ0iW0WPzO9CEUdvvh8AAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAjOiEfRh4kaFVQDu/CSTZLMtnyg0DbNowZ/G2nLES3KwAAAASAAAAAAAAAADoFl2ACT9HZkbCeuaT9MAIdStpdf58wM3P24nl738AnQAAAAoAAAAAAAAAAAAAAAAAAAAFAAAAAQAAAAAAAAAAAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAIzohH0YeJGhVUA7vwkk2SzLZ8oNA2zaMGfxtpyxEtysAAAAEgAAAAAAAAAA6BZdgAk/R2ZGwnrmk/TACHUraXX+fMDNz9uJ5e9/AJ0AAAAKAAAAAAAAAAAAAAAAAAAABQAAAAAAAAABAAAAAAAAAAIAAAAGAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAAFAAAAAEAAAAHa35L+/RxV6EuJOVk78H5rCN+eubXBWtsKrRxeLnnpRAAAAACAAAABgAAAAEeQRV0n5R8OdakGv+oXnzYgSgNDSJbRY/M70IRR2++HwAAABAAAAABAAAAAgAAAA8AAAAHQmFsYW5jZQAAAAASAAAAAAAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrAAAAAEAAAAGAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAAEAAAAAEAAAACAAAADwAAAAdCYWxhbmNlAAAAABIAAAAAAAAAAOgWXYAJP0dmRsJ65pP0wAh1K2l1/nzAzc/bieXvfwCdAAAAAQBkcwsAACBwAAABKAAAAAAAAB1kAAAAAA==",
  sorobanMint:
    "AAAAAgAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrDucQIQAAAWIAAAAMQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABHkEVdJ+UfDnWpBr/qF582IEoDQ0iW0WPzO9CEUdvvh8AAAAEbWludAAAAAIAAAASAAAAAAAAAADoFl2ACT9HZkbCeuaT9MAIdStpdf58wM3P24nl738AnQAAAAoAAAAAAAAAAAAAAAAAAAAFAAAAAQAAAAAAAAAAAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAABG1pbnQAAAACAAAAEgAAAAAAAAAA6BZdgAk/R2ZGwnrmk/TACHUraXX+fMDNz9uJ5e9/AJ0AAAAKAAAAAAAAAAAAAAAAAAAABQAAAAAAAAABAAAAAAAAAAIAAAAGAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAAFAAAAAEAAAAHa35L+/RxV6EuJOVk78H5rCN+eubXBWtsKrRxeLnnpRAAAAABAAAABgAAAAEeQRV0n5R8OdakGv+oXnzYgSgNDSJbRY/M70IRR2++HwAAABAAAAABAAAAAgAAAA8AAAAHQmFsYW5jZQAAAAASAAAAAAAAAADoFl2ACT9HZkbCeuaT9MAIdStpdf58wM3P24nl738AnQAAAAEAYpBIAAAfrAAAAJQAAAAAAAAdYwAAAAA=",
};

describe("getTokenInvocationArgs for different function names", () => {
  it("get token invocation args for Soroban transfer (payment) operation", () => {
    const transaction = TransactionBuilder.fromXDR(
      transactions.sorobanTransfer,
      Networks.FUTURENET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];

    const args = getTokenInvocationArgs(op);

    expect(args.fnName).toBe(SorobanTokenInterface.transfer);
    expect(args.contractId).toBe(
      "CAPECFLUT6KHYOOWUQNP7KC6PTMICKANBURFWRMPZTXUEEKHN67B7UI2",
    );
    expect(args.from).toBe(
      "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL",
    );
    expect(args.to).toBe(
      "GDUBMXMABE7UOZSGYJ5ONE7UYAEHKK3JOX7HZQGNZ7NYTZPPP4AJ2GQJ",
    );
    expect(args.amount === BigInt(5)).toBeTruthy();
  });

  it("get token invocation args for Soroban mint operation", () => {
    const transaction = TransactionBuilder.fromXDR(
      transactions.sorobanMint,
      Networks.FUTURENET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];

    const args = getTokenInvocationArgs(op);

    expect(args.fnName).toBe(SorobanTokenInterface.mint);
    expect(args.contractId).toBe(
      "CAPECFLUT6KHYOOWUQNP7KC6PTMICKANBURFWRMPZTXUEEKHN67B7UI2",
    );
    expect(args.from).toBe("");
    expect(args.to).toBe(
      "GDUBMXMABE7UOZSGYJ5ONE7UYAEHKK3JOX7HZQGNZ7NYTZPPP4AJ2GQJ",
    );
    expect(args.amount === BigInt(5)).toBeTruthy();
  });

  it("stellar classic transaction should have no token invocation args", () => {
    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];

    const args = getTokenInvocationArgs(op);

    expect(args).toBe(null);
  });
});

describe("Token formatting and parsing functions", () => {
  it("should format different types of token amount values", () => {
    const formatted = "1000000.1234567";

    const value1 = BigInt(10000001234567);
    expect(formatTokenAmount(value1, 7)).toStrictEqual(formatted);

    const value2 = new BigNumber("10000001234567");
    expect(formatTokenAmount(value2, 7)).toStrictEqual(formatted);

    const value3 = Number("10000001234567");
    expect(formatTokenAmount(value3, 7)).toStrictEqual(formatted);

    const value4 = 10000001234567;
    expect(formatTokenAmount(value4, 7)).toStrictEqual(formatted);

    const value5 = "10000001234567";
    expect(formatTokenAmount(value5, 7)).toStrictEqual(formatted);
  });

  it("should parse different types of token amount values", () => {
    const parsed = BigInt(10000001234567);

    const value5 = "1000000.1234567";
    expect(parseTokenAmount(value5, 7) === parsed).toBeTruthy();

    const value4 = 1000000.1234567;
    expect(parseTokenAmount(value4, 7) === parsed).toBeTruthy();

    const value3 = Number("1000000.1234567");
    expect(parseTokenAmount(value3, 7) === parsed).toBeTruthy();

    const value2 = new BigNumber("1000000.1234567");
    expect(parseTokenAmount(value2, 7) === parsed).toBeTruthy();

    const value1 = BigInt("123");
    expect(parseTokenAmount(value1, 3) === BigInt(123000)).toBeTruthy();
  });
});

describe("scValByType should render expected common types", () => {
  it("should render addresses as strings", () => {
    const ACCOUNT = "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB";
    const CONTRACT = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

    const scAddressAccount = xdr.ScAddress.scAddressTypeAccount(
      xdr.PublicKey.publicKeyTypeEd25519(
        StrKey.decodeEd25519PublicKey(ACCOUNT),
      ),
    );
    const accountAddress = xdr.ScVal.scvAddress(scAddressAccount);
    const parsedAccountAddress = scValByType(accountAddress);
    expect(parsedAccountAddress).toEqual(ACCOUNT);

    const scAddressContract = xdr.ScAddress.scAddressTypeContract(
      StrKey.decodeContract(CONTRACT),
    );
    const contractAddress = xdr.ScVal.scvAddress(scAddressContract);
    const parsedContractAddress = scValByType(contractAddress);
    expect(parsedContractAddress).toEqual(CONTRACT);
  });

  it("should render booleans as booleans", () => {
    const bool = xdr.ScVal.scvBool(true);
    const parsedBool = scValByType(bool);
    expect(parsedBool).toEqual(true);
  });

  it("should render bytes as a stringified array of numbers", () => {
    const bytesBuffer = Buffer.from([0x00, 0x01]);
    const bytes = xdr.ScVal.scvBytes(bytesBuffer);
    const parsedBytes = scValByType(bytes);
    expect(parsedBytes).toEqual("[0,1]");
  });

  it("should render contract instance as string", () => {
    // Note: those are totally random values for 'executable' and 'storage'
    const contractInstance = xdr.ScVal.scvContractInstance(
      new xdr.ScContractInstance({
        executable: xdr.ContractExecutable.contractExecutableWasm(
          Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
        ),
        storage: [
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvString("keyOne"),
            val: xdr.ScVal.scvU64(new xdr.Uint64(123)),
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvString("keyTwo"),
            val: xdr.ScVal.scvU64(new xdr.Uint64(456)),
          }),
        ],
      }),
    );

    const parsedContractInstance = scValByType(contractInstance);
    expect(parsedContractInstance).toEqual(
      contractInstance.instance().executable().wasmHash()?.toString(),
    );
  });

  it("should render an error as a number or a ScErrorCode object including the contract name and code", () => {
    const contractErrorCode = 1;
    const contractError = xdr.ScError.sceContract(contractErrorCode);
    const scvContractError = xdr.ScVal.scvError(contractError);
    const parsedContractError = scValByType(scvContractError);
    expect(parsedContractError).toEqual(contractErrorCode);

    const scErrorCode = xdr.ScErrorCode.scecExceededLimit();
    const wasmError = xdr.ScError.sceWasmVm(scErrorCode);
    const scvWasmError = xdr.ScVal.scvError(wasmError);
    const parsedWasmError = scValByType(scvWasmError);
    expect(parsedWasmError).toEqual(scErrorCode);
    expect(parsedWasmError.name).toEqual("scecExceededLimit");
    expect(parsedWasmError.value).toEqual(5);
  });

  it("should render all numeric types as strings", () => {
    const scv1 = xdr.ScVal.scvTimepoint(new xdr.Uint64(123));
    const parsedScv1 = scValByType(scv1);
    expect(parsedScv1).toEqual("123");

    const scv2 = xdr.ScVal.scvDuration(new xdr.Uint64(456));
    const parsedScv2 = scValByType(scv2);
    expect(parsedScv2).toEqual("456");

    const scv3 = xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        hi: new xdr.Int64(789),
        lo: new xdr.Uint64(123),
      }),
    );
    const parsedScv3 = scValByType(scv3);
    // This is a complex numeric type which would result something
    // like "14554481074156836225147" so let's simply check it's type
    expect(typeof parsedScv3 === "string").toBeTruthy();

    const scv4 = xdr.ScVal.scvI256(
      new xdr.Int256Parts({
        hiHi: new xdr.Int64(7899),
        hiLo: new xdr.Uint64(7890),
        loHi: new xdr.Uint64(1239),
        loLo: new xdr.Uint64(1230),
      }),
    );
    const parsedScv4 = scValByType(scv4);
    // This is a complex numeric type which would result something
    // like "49582826607819391356223728528923561497541386824365385940206798"
    // so let's simply check it's type
    expect(typeof parsedScv4 === "string").toBeTruthy();

    const scv5 = xdr.ScVal.scvI32(3232);
    const parsedScv5 = scValByType(scv5);
    expect(parsedScv5).toEqual("3232");

    const scv6 = xdr.ScVal.scvI64(new xdr.Int64(6464));
    const parsedScv6 = scValByType(scv6);
    expect(parsedScv6).toEqual("6464");

    const scv7 = xdr.ScVal.scvU128(
      new xdr.UInt128Parts({
        hi: new xdr.Uint64(1288),
        lo: new xdr.Uint64(1280),
      }),
    );
    const parsedScv7 = scValByType(scv7);
    // This is a complex numeric type which would result something
    // like "23759406366937902482688" so let's simply check it's type
    expect(typeof parsedScv7 === "string").toBeTruthy();

    const scv8 = xdr.ScVal.scvU256(
      new xdr.Int256Parts({
        hiHi: new xdr.Uint64(25699),
        hiLo: new xdr.Uint64(25600),
        loHi: new xdr.Uint64(2569),
        loLo: new xdr.Uint64(2560),
      }),
    );
    const parsedScv8 = scValByType(scv8);
    // This is a complex numeric type which would result something
    // like "161315237497702308958527180980189843892124212203059848998291968"
    // so let's simply check it's type
    expect(typeof parsedScv8 === "string").toBeTruthy();

    const scv9 = xdr.ScVal.scvU32(323232);
    const parsedScv9 = scValByType(scv9);
    expect(parsedScv9).toEqual("323232");

    const scv10 = xdr.ScVal.scvU64(new xdr.Uint64(646464));
    const parsedScv10 = scValByType(scv10);
    expect(parsedScv10).toEqual("646464");
  });

  it("should render nonce ledger key as string", () => {
    const nonce = new xdr.Int64(123);
    const nonceKey = new xdr.ScNonceKey({ nonce });
    const ledgerKey = xdr.ScVal.scvLedgerKeyNonce(nonceKey);
    const parsedLedgerKey = scValByType(ledgerKey);
    expect(parsedLedgerKey).toEqual("123");

    const ledgerKeyContractInstance = xdr.ScVal.scvLedgerKeyContractInstance();
    const parsedInstance = scValByType(ledgerKeyContractInstance);
    expect(parsedInstance).toEqual(undefined);
  });

  it("should render vectors and maps as JSON strings", () => {
    const xdrVec = xdr.ScVal.scvVec([
      xdr.ScVal.scvU64(new xdr.Uint64(123)),
      xdr.ScVal.scvU64(new xdr.Uint64(321)),
    ]);
    const parsedVec = scValByType(xdrVec);
    expect(parsedVec).toBe(
      JSON.stringify(
        ["123", "321"],
        (_, val) => (typeof val === "bigint" ? val.toString() : val),
        2,
      ),
    );

    const xdrMap = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvString("keyOne"),
        val: xdr.ScVal.scvU64(new xdr.Uint64(456)),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvString("keyTwo"),
        val: xdr.ScVal.scvU64(new xdr.Uint64(789)),
      }),
    ]);
    const parsedMap = scValByType(xdrMap);
    expect(parsedMap).toBe(
      JSON.stringify(
        { keyOne: "456", keyTwo: "789" },
        (_, val) => (typeof val === "bigint" ? val.toString() : val),
        2,
      ),
    );
  });

  it("should possibly render strings and symbols as strings", () => {
    const scvString = xdr.ScVal.scvString("any string");
    const parsedString = scValByType(scvString);
    expect(parsedString).toEqual("any string");

    const scvSym = xdr.ScVal.scvSymbol("some crazy symbol");
    const parsedSymbol = scValByType(scvSym);
    expect(parsedSymbol).toEqual("some crazy symbol");
  });

  it("should render void as null", () => {
    const scvVoid = xdr.ScVal.scvVoid();
    const parsedVoid = scValByType(scvVoid);
    expect(parsedVoid).toEqual(null);
  });
});
