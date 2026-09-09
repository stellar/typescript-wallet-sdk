import {
  Address,
  Asset,
  Keypair,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import BigNumber from "bignumber.js";

import {
  SorobanTokenInterface,
  formatTokenAmount,
  getArgsForTokenInvocation,
  getInvocationDetails,
  getTokenInvocationArgs,
  parseTokenAmount,
  scValByType,
} from "../src";
import { makeInvocation, randomContracts, randomKey } from "./utils";

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
    ) as Transaction;
    const op = transaction.operations[0] as Operation.InvokeHostFunction;

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
    ) as Transaction;
    const op = transaction.operations[0] as Operation.InvokeHostFunction;

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
    ) as Transaction;
    const op = transaction.operations[0] as Operation.InvokeHostFunction;

    const args = getTokenInvocationArgs(op);

    expect(args).toBe(null);
  });
});

describe("Token formatting and parsing functions", () => {
  it("should format different types of token amount values", () => {
    const formatted = "1000000.1234567";

    const value1 = BigInt(10000001234567);
    expect(formatTokenAmount(value1, 7)).toEqual(formatted);

    const value2 = "10000001234567";
    expect(formatTokenAmount(value2, 7)).toEqual(formatted);
  });

  it("should parse different types of token amount values", () => {
    const parsed = BigInt(10000001234567);

    const value1 = "1000000.1234567";
    expect(parseTokenAmount(value1, 7) === parsed).toBeTruthy();

    const value2 = 1000000.1234567;
    expect(parseTokenAmount(value2, 7) === parsed).toBeTruthy();

    const value3 = new BigNumber("1000000.1234567");
    expect(parseTokenAmount(value3, 7) === parsed).toBeTruthy();
  });
});

describe("scValByType should render expected common types", () => {
  it("should render addresses as strings", () => {
    const ACCOUNT = "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB";
    const CONTRACT = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

    const scAddressAccount = new Address(ACCOUNT).toScAddress();
    const accountAddress = xdr.ScVal.scvAddress(scAddressAccount);
    const parsedAccountAddress = scValByType(accountAddress);
    expect(parsedAccountAddress).toEqual(ACCOUNT);

    const scAddressContract = new Address(CONTRACT).toScAddress();
    const contractAddress = xdr.ScVal.scvAddress(scAddressContract);
    const parsedContractAddress = scValByType(contractAddress);
    expect(parsedContractAddress).toEqual(CONTRACT);
  });

  it("should render booleans as booleans", () => {
    const bool = xdr.ScVal.scvBool(true);
    const parsedBool = scValByType(bool);
    expect(parsedBool).toEqual(true);
  });

  it("should render bytes as a hex string", () => {
    const bytes = xdr.ScVal.scvBytes(new Uint8Array([0x00, 0x01]));
    expect(scValByType(bytes)).toEqual("0001");
  });

  it("should render contract instance as string", () => {
    // Note: those are totally random values for 'executable' and 'storage'
    const WASM_HASH = new Uint8Array(32).fill(7);
    const contractInstance = xdr.ScVal.scvContractInstance(
      new xdr.ScContractInstance({
        executable: xdr.ContractExecutable.contractExecutableWasm(WASM_HASH),
        storage: [
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvString("keyOne"),
            val: xdr.ScVal.scvU64(xdr.Uint64(123)),
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvString("keyTwo"),
            val: xdr.ScVal.scvU64(xdr.Uint64(456)),
          }),
        ],
      }),
    );

    const parsedContractInstance = scValByType(contractInstance);
    expect(parsedContractInstance).toEqual(xdr.encodeBytes(WASM_HASH, "hex"));
  });

  it("should render an error as a number or a ScErrorCode object including the contract name and code", () => {
    const contractErrorCode = 1;
    const contractError = xdr.ScError.sceContract(contractErrorCode);
    const scvContractError = xdr.ScVal.scvError(contractError);
    const parsedContractError = scValByType(scvContractError);
    expect(parsedContractError).toEqual(contractErrorCode);

    const scErrorCode = xdr.ScErrorCode.scecExceededLimit;
    const wasmError = xdr.ScError.sceWasmVm(scErrorCode);
    const scvWasmError = xdr.ScVal.scvError(wasmError);
    const parsedWasmError = scValByType(scvWasmError);
    expect(parsedWasmError).toEqual(scErrorCode);
    expect(parsedWasmError.name).toEqual("scecExceededLimit");
    expect(parsedWasmError.value).toEqual(5);
  });

  it("should render all numeric types as strings", () => {
    const scv1 = xdr.ScVal.scvTimepoint(xdr.Uint64(123));
    const parsedScv1 = scValByType(scv1);
    expect(parsedScv1).toEqual("123");

    const scv2 = xdr.ScVal.scvDuration(xdr.Uint64(456));
    const parsedScv2 = scValByType(scv2);
    expect(parsedScv2).toEqual("456");

    const scv3 = xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        hi: xdr.Int64(789),
        lo: xdr.Uint64(123),
      }),
    );
    const parsedScv3 = scValByType(scv3);
    // This is a complex numeric type which would result something
    // like "14554481074156836225147" so let's simply check it's type
    expect(typeof parsedScv3 === "string").toBeTruthy();

    const scv4 = xdr.ScVal.scvI256(
      new xdr.Int256Parts({
        hiHi: xdr.Int64(7899),
        hiLo: xdr.Uint64(7890),
        loHi: xdr.Uint64(1239),
        loLo: xdr.Uint64(1230),
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

    const scv6 = xdr.ScVal.scvI64(xdr.Int64(6464));
    const parsedScv6 = scValByType(scv6);
    expect(parsedScv6).toEqual("6464");

    const scv7 = xdr.ScVal.scvU128(
      new xdr.Uint128Parts({
        hi: xdr.Uint64(1288),
        lo: xdr.Uint64(1280),
      }),
    );
    const parsedScv7 = scValByType(scv7);
    // This is a complex numeric type which would result something
    // like "23759406366937902482688" so let's simply check it's type
    expect(typeof parsedScv7 === "string").toBeTruthy();

    const scv8 = xdr.ScVal.scvU256(
      new xdr.Int256Parts({
        hiHi: xdr.Uint64(25699),
        hiLo: xdr.Uint64(25600),
        loHi: xdr.Uint64(2569),
        loLo: xdr.Uint64(2560),
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

    const scv10 = xdr.ScVal.scvU64(xdr.Uint64(646464));
    const parsedScv10 = scValByType(scv10);
    expect(parsedScv10).toEqual("646464");
  });

  it("should render nonce ledger key as string", () => {
    const nonce = xdr.Int64(123);
    const nonceKey = new xdr.ScNonceKey({ nonce });
    const ledgerKey = xdr.ScVal.scvLedgerKeyNonce(nonceKey);
    const parsedLedgerKey = scValByType(ledgerKey);
    expect(parsedLedgerKey).toEqual("123");

    const ledgerKeyContractInstance = xdr.ScVal.scvLedgerKeyContractInstance();
    const parsedInstance = scValByType(ledgerKeyContractInstance);
    expect(parsedInstance).toEqual(null);
  });

  it("should render vectors and maps as JSON strings", () => {
    const xdrVec = xdr.ScVal.scvVec([
      xdr.ScVal.scvU64(xdr.Uint64(123)),
      xdr.ScVal.scvU64(xdr.Uint64(321)),
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
        val: xdr.ScVal.scvU64(xdr.Uint64(456)),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvString("keyTwo"),
        val: xdr.ScVal.scvU64(xdr.Uint64(789)),
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

describe("getInvocationDetails for a Soroban Authorized Invocation tree", () => {
  const [nftContract, swapContract, xlmContract, usdcContract] =
    randomContracts(4);

  const nftId = randomKey();
  const usdcId = randomKey();
  const invoker = randomKey();
  const dest = randomKey();

  const rootSubInvocations = [
    new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractHostFn(
          new xdr.CreateContractArgs({
            contractIdPreimage:
              xdr.ContractIdPreimage.contractIdPreimageFromAsset(
                new Asset("TEST", nftId).toXDRObject(),
              ),
            executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
          }),
        ),
      subInvocations: [],
    }),
    new xdr.SorobanAuthorizedInvocation({
      function: makeInvocation(
        swapContract,
        "swap",
        "native",
        `USDC:${usdcId}`,
        new Address(invoker).toScVal(),
        new Address(dest).toScVal(),
      ),
      subInvocations: [
        new xdr.SorobanAuthorizedInvocation({
          function: makeInvocation(
            xlmContract,
            "transfer",
            new Address(invoker).toScVal(),
            "7",
          ),
          subInvocations: [],
        }),
        new xdr.SorobanAuthorizedInvocation({
          function: makeInvocation(
            usdcContract,
            "transfer",
            new Address(invoker).toScVal(),
            "1",
          ),
          subInvocations: [],
        }),
      ],
    }),
    new xdr.SorobanAuthorizedInvocation({
      function: makeInvocation(
        nftContract,
        "transfer",
        nftContract.address().toScVal(),
        "2",
      ),
      subInvocations: [],
    }),
    new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractHostFn(
          new xdr.CreateContractArgs({
            contractIdPreimage:
              xdr.ContractIdPreimage.contractIdPreimageFromAddress(
                new xdr.ContractIdPreimageFromAddress({
                  address: nftContract.address().toScAddress(),
                  salt: new Uint8Array(32),
                }),
              ),
            executable: xdr.ContractExecutable.contractExecutableWasm(
              new Uint8Array(32).fill(0x20),
            ),
          }),
        ),
      subInvocations: [],
    }),
  ];

  const rootInvocation = new xdr.SorobanAuthorizedInvocation({
    function: makeInvocation(nftContract, "purchase", `SomeNft:${nftId}`, 7),
    subInvocations: rootSubInvocations,
  });

  it("get invocation details for a single Soroban Authorized Invocation of 'invoke' type", () => {
    const detailsList = getInvocationDetails(rootInvocation);

    const rootDetail = detailsList[0];

    /*
      rootDetails prints: 

      {
        fnName: 'purchase',
        contractId: 'CDG44CP4LWYVRELBCICJYWUJ6B3NCKAOOIAX3MR5HGLFFK3ZWPSZJLMV',
        args: [
          ChildUnion {
            _switch: [ChildEnum],
            _arm: 'str',
            _armType: [String],
            _value: 'SomeNft:GDASJXL2RYFJCRHXRZQ3ADPEXS5KVXKTOR3FCRCBFCQ77YZXDXMPV7D3'
          },
          ChildUnion {
            _switch: [ChildEnum],
            _arm: 'u64',
            _armType: [Function],
            _value: [UnsignedHyper]
          }
        ],
        type: 'invoke'
      }
     */

    expect(rootDetail.type).toBe("invoke");
    expect(rootDetail.fnName).toBe("purchase");
    expect(rootDetail.contractId).toBe(nftContract.contractId());
    expect(rootDetail.args.length).toBe(2);
    expect(scValByType(rootDetail.args[0])).toBe(`SomeNft:${nftId}`);
    expect(Number(scValByType(rootDetail.args[1]))).toBe(7);
  });

  it("get invocation details for the main invocation and all of its nested sub invocations", () => {
    const detailsList = getInvocationDetails(rootInvocation);

    // The whole tree is walked depth-first, so the two transfers nested under
    // `swap` are returned alongside the immediate children: purchase, sac,
    // swap, swap->xlm transfer, swap->usdc transfer, nft transfer, wasm.
    expect(detailsList.length).toBe(7);

    const [
      rootDetail,
      sacDetail,
      swapDetail,
      xlmTransferDetail,
      usdcTransferDetail,
      nftTransferDetail,
      wasmDetail,
    ] = detailsList;

    expect(rootDetail.type).toBe("invoke");
    expect(rootDetail.fnName).toBe("purchase");
    expect(rootDetail.contractId).toBe(nftContract.contractId());
    expect(rootDetail.args.length).toBe(2);
    expect(scValByType(rootDetail.args[0])).toBe(`SomeNft:${nftId}`);
    expect(Number(scValByType(rootDetail.args[1]))).toBe(7);

    expect(sacDetail.type).toBe("sac");
    expect(sacDetail.asset).toBe(`TEST:${nftId}`);

    expect(swapDetail.type).toBe("invoke");
    expect(swapDetail.fnName).toBe("swap");
    expect(swapDetail.contractId).toBe(swapContract.contractId());
    expect(swapDetail.args.length).toBe(4);
    expect(scValByType(swapDetail.args[0])).toBe("native");
    expect(scValByType(swapDetail.args[1])).toBe(`USDC:${usdcId}`);
    expect(scValByType(swapDetail.args[2])).toBe(invoker);
    expect(scValByType(swapDetail.args[3])).toBe(dest);

    // Nested one level below `swap` (previously not returned).
    expect(xlmTransferDetail.type).toBe("invoke");
    expect(xlmTransferDetail.fnName).toBe("transfer");
    expect(xlmTransferDetail.contractId).toBe(xlmContract.contractId());
    expect(xlmTransferDetail.args.length).toBe(2);
    expect(scValByType(xlmTransferDetail.args[0])).toBe(invoker);
    expect(scValByType(xlmTransferDetail.args[1])).toBe("7");

    expect(usdcTransferDetail.type).toBe("invoke");
    expect(usdcTransferDetail.fnName).toBe("transfer");
    expect(usdcTransferDetail.contractId).toBe(usdcContract.contractId());
    expect(usdcTransferDetail.args.length).toBe(2);
    expect(scValByType(usdcTransferDetail.args[0])).toBe(invoker);
    expect(scValByType(usdcTransferDetail.args[1])).toBe("1");

    expect(nftTransferDetail.type).toBe("invoke");
    expect(nftTransferDetail.fnName).toBe("transfer");
    expect(nftTransferDetail.contractId).toBe(nftContract.contractId());
    expect(nftTransferDetail.args.length).toBe(2);
    expect(scValByType(nftTransferDetail.args[0])).toBe(
      scValByType(nftContract.address().toScVal()),
    );
    expect(scValByType(nftTransferDetail.args[1])).toBe("2");

    expect(wasmDetail.type).toBe("wasm");
    expect(wasmDetail.salt).toBe(xdr.encodeBytes(new Uint8Array(32), "hex"));
    expect(wasmDetail.hash).toBe(
      xdr.encodeBytes(new Uint8Array(32).fill(0x20), "hex"),
    );
    expect(wasmDetail.address).toBe(
      Address.fromScAddress(nftContract.address().toScAddress()).toString(),
    );
  });
});

describe("getInvocationDetails for a CreateContractV2 host function", () => {
  const [deployedContract] = randomContracts(1);

  it("decodes a CreateContractV2 invocation including its constructor args", () => {
    const constructorArgs = [xdr.ScVal.scvString("init"), xdr.ScVal.scvU32(42)];

    const v2Invocation = new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractV2HostFn(
          new xdr.CreateContractArgsV2({
            contractIdPreimage:
              xdr.ContractIdPreimage.contractIdPreimageFromAddress(
                new xdr.ContractIdPreimageFromAddress({
                  address: deployedContract.address().toScAddress(),
                  salt: new Uint8Array(32),
                }),
              ),
            executable: xdr.ContractExecutable.contractExecutableWasm(
              new Uint8Array(32).fill(0x20),
            ),
            constructorArgs,
          }),
        ),
      subInvocations: [],
    });

    const detailsList = getInvocationDetails(v2Invocation);

    expect(detailsList.length).toBe(1);

    const [detail] = detailsList;
    expect(detail.type).toBe("wasm");
    expect(detail.salt).toBe(xdr.encodeBytes(new Uint8Array(32), "hex"));
    expect(detail.hash).toBe(
      xdr.encodeBytes(new Uint8Array(32).fill(0x20), "hex"),
    );
    expect(detail.address).toBe(
      Address.fromScAddress(
        deployedContract.address().toScAddress(),
      ).toString(),
    );
    expect(detail.constructorArgs.length).toBe(2);
    expect(scValByType(detail.constructorArgs[0])).toBe("init");
    expect(Number(scValByType(detail.constructorArgs[1]))).toBe(42);
  });

  it("decodes a CreateContractV2 invocation with a Stellar Asset executable including its constructor args", () => {
    const assetId = randomKey();
    const constructorArgs = [xdr.ScVal.scvString("init"), xdr.ScVal.scvU32(42)];

    const v2Invocation = new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractV2HostFn(
          new xdr.CreateContractArgsV2({
            contractIdPreimage:
              xdr.ContractIdPreimage.contractIdPreimageFromAsset(
                new Asset("TEST", assetId).toXDRObject(),
              ),
            executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
            constructorArgs,
          }),
        ),
      subInvocations: [],
    });

    const detailsList = getInvocationDetails(v2Invocation);

    expect(detailsList.length).toBe(1);

    const [detail] = detailsList;
    expect(detail.type).toBe("sac");
    expect(detail.asset).toBe(`TEST:${assetId}`);
    expect(detail.constructorArgs.length).toBe(2);
    expect(scValByType(detail.constructorArgs[0])).toBe("init");
    expect(Number(scValByType(detail.constructorArgs[1]))).toBe(42);
  });
});

describe("XDR integer boundary values (Protocol 26 strict validation)", () => {
  it("should handle i32 min and max boundary values", () => {
    const i32Min = xdr.ScVal.scvI32(-2147483648);
    expect(scValByType(i32Min)).toEqual("-2147483648");

    const i32Max = xdr.ScVal.scvI32(2147483647);
    expect(scValByType(i32Max)).toEqual("2147483647");
  });

  it("should handle u32 max boundary value", () => {
    const u32Max = xdr.ScVal.scvU32(4294967295);
    expect(scValByType(u32Max)).toEqual("4294967295");
  });

  it("should handle u32 zero value", () => {
    const u32Zero = xdr.ScVal.scvU32(0);
    expect(scValByType(u32Zero)).toEqual("0");
  });

  it("should handle i64 min and max boundary values", () => {
    const i64Max = xdr.ScVal.scvI64(
      xdr.Int64.fromString("9223372036854775807"),
    );
    const parsedMax = scValByType(i64Max);
    expect(parsedMax).toEqual("9223372036854775807");

    const i64Min = xdr.ScVal.scvI64(
      xdr.Int64.fromString("-9223372036854775808"),
    );
    const parsedMin = scValByType(i64Min);
    expect(parsedMin).toEqual("-9223372036854775808");
  });

  it("should handle u64 max boundary value", () => {
    const u64Max = xdr.ScVal.scvU64(
      xdr.Uint64.fromString("18446744073709551615"),
    );
    const parsed = scValByType(u64Max);
    expect(parsed).toEqual("18446744073709551615");
  });

  it("should throw on i64 overflow", () => {
    expect(() => xdr.Int64.fromString("9223372036854775808")).toThrow();
  });

  it("should throw on i64 underflow", () => {
    expect(() => xdr.Int64.fromString("-9223372036854775809")).toThrow();
  });

  it("should throw on u64 overflow", () => {
    expect(() => xdr.Uint64.fromString("18446744073709551616")).toThrow();
  });

  it("should throw on u64 negative value", () => {
    expect(() => xdr.Uint64.fromString("-1")).toThrow();
  });

  it("should throw on i32 overflow at serialization", () => {
    const val = xdr.ScVal.scvI32(2147483648);
    expect(() => val.toXDR()).toThrow(/scvI32\.i32: expected integer in range/);
  });

  it("should throw on u32 overflow at serialization", () => {
    const val = xdr.ScVal.scvU32(4294967296);
    expect(() => val.toXDR()).toThrow(/scvU32\.u32: expected integer in range/);
  });
});

describe("getInvocationDetails for CAP-85 external references", () => {
  it("decodes an external-ref contract creation without a wasm hash", () => {
    // owner (whose code is referenced) and deployer (creating the new
    // contract) are deliberately different contracts, so the assertions
    // below can't pass by `address` and `executableOwner` accidentally
    // holding the same value.
    const [owner, deployer] = randomContracts(2);
    const salt = new Uint8Array(32).fill(0x07);
    const invocation = new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractHostFn(
          new xdr.CreateContractArgs({
            contractIdPreimage:
              xdr.ContractIdPreimage.contractIdPreimageFromAddress(
                new xdr.ContractIdPreimageFromAddress({
                  address: deployer.address().toScAddress(),
                  salt,
                }),
              ),
            executable: xdr.ContractExecutable.contractExecutableExternalRef(
              new xdr.ContractExecutableExternalRef({
                executableOwner: owner.address().toScAddress(),
                tag: "my-tag",
              }),
            ),
          }),
        ),
      subInvocations: [],
    });

    const details = getInvocationDetails(invocation);

    expect(details).toHaveLength(1);
    expect(details[0]).toEqual({
      type: "externalRef",
      executableOwner: owner.contractId(),
      tag: "my-tag",
      address: deployer.contractId(),
      salt: xdr.encodeBytes(salt, "hex"),
    });
    // CAP-85 code can change after signing, so no hash must be surfaced.
    expect(details[0]).not.toHaveProperty("hash");
  });

  it("still decodes a known contractFn invocation alongside the CAP-85 arm", () => {
    const contract = randomContracts(1)[0];
    const invocation = new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
          new xdr.InvokeContractArgs({
            contractAddress: contract.address().toScAddress(),
            functionName: "someFn",
            args: [],
          }),
        ),
      subInvocations: [],
    });

    expect(() => getInvocationDetails(invocation)).not.toThrow();

    const details = getInvocationDetails(invocation);
    expect(details).toHaveLength(1);
    expect(details[0]).toEqual({
      type: "invoke",
      fnName: "someFn",
      contractId: contract.contractId(),
      args: [],
    });
  });
});

describe("getInvocationDetails function-name decoding", () => {
  // Two SCSymbols differing only in bytes that a lenient UTF-8 decode would
  // collapse to U+FFFD. The [a-zA-Z0-9_] rule is a Soroban host invariant, and
  // the host has not run when a wallet decodes an envelope for review, so this
  // is reachable from a hand-crafted envelope.
  const invocationWithFnNameBytes = (bytes: number[]) => {
    const contract = randomContracts(1)[0];
    return new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
          new xdr.InvokeContractArgs({
            contractAddress: contract.address().toScAddress(),
            functionName: Uint8Array.from(bytes),
            args: [],
          }),
        ),
      subInvocations: [],
    });
  };

  it("keeps two names distinct when they differ only in invalid UTF-8 bytes", () => {
    const [a] = getInvocationDetails(
      invocationWithFnNameBytes([0x74, 0x78, 0xc0]),
    ) as [{ fnName: string }];
    const [b] = getInvocationDetails(
      invocationWithFnNameBytes([0x74, 0x78, 0xc1]),
    ) as [{ fnName: string }];

    // A lenient decode would render both as "tx\uFFFD" and collide.
    expect(a.fnName).not.toEqual(b.fnName);
    expect(a.fnName).toEqual("tx\\xc0");
    expect(b.fnName).toEqual("tx\\xc1");
  });

  it("passes ordinary printable-ASCII names through unchanged", () => {
    for (const name of ["transfer", "mint", "swap", "my_fn_1"]) {
      const [detail] = getInvocationDetails(
        invocationWithFnNameBytes(Array.from(Buffer.from(name, "ascii"))),
      ) as [{ fnName: string }];
      expect(detail.fnName).toEqual(name);
    }
  });
});

describe("getInvocationDetails graceful degradation", () => {
  // These five cases cover every arm that cannot decode its input: an
  // unrecognised authorized function type, an unrecognised contract
  // executable, and each of the three creation arms where a contract-id
  // preimage does not match its paired executable. A wallet's
  // transaction-review screen must never crash on an input it does not
  // recognise, but it also must never silently drop the action from the
  // list — each of these degrades to an explicit `unknown` entry instead, so
  // a caller can choose to fail closed on its own terms.

  it("returns an unknown entry for an unrecognised authorized function type", () => {
    // Duck-typed: no real xdr union can carry a future variant name, which is
    // exactly the case the default arm exists for.
    const invocation = {
      function: { type: "sorobanAuthorizedFunctionTypeFutureHostFn" },
      subInvocations: [],
    } as unknown as xdr.SorobanAuthorizedInvocation;

    expect(() => getInvocationDetails(invocation)).not.toThrow();
    expect(getInvocationDetails(invocation)).toEqual([
      {
        type: "unknown",
        reason: "unsupportedFunction",
        functionType: "sorobanAuthorizedFunctionTypeFutureHostFn",
      },
    ]);
  });

  it("returns an unknown entry for an unrecognised contract executable", () => {
    const owner = randomContracts(1)[0];
    const invocation = {
      function: {
        type: "sorobanAuthorizedFunctionTypeCreateContractHostFn",
        createContractHostFn: {
          executable: { type: "contractExecutableFutureVariant" },
          contractIdPreimage: {
            type: "contractIdPreimageFromAddress",
            fromAddress: {
              address: owner.address().toScAddress(),
              salt: new xdr.Uint256Bytes(new Uint8Array(32)),
            },
          },
        },
      },
      subInvocations: [],
    } as unknown as xdr.SorobanAuthorizedInvocation;

    expect(() => getInvocationDetails(invocation)).not.toThrow();
    expect(getInvocationDetails(invocation)).toEqual([
      {
        type: "unknown",
        reason: "unsupportedExecutable",
        functionType: "sorobanAuthorizedFunctionTypeCreateContractHostFn",
        executableType: "contractExecutableFutureVariant",
        preimageType: "contractIdPreimageFromAddress",
      },
    ]);
  });

  it("returns an unknown entry for a wasm executable paired with a non-address preimage", () => {
    // On-chain impossible, but constructible — and reachable from any
    // untrusted XDR blob a wallet is asked to review.
    const invocation = new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractHostFn(
          new xdr.CreateContractArgs({
            contractIdPreimage:
              xdr.ContractIdPreimage.contractIdPreimageFromAsset(
                new Asset("TEST", randomKey()).toXDRObject(),
              ),
            executable: xdr.ContractExecutable.contractExecutableWasm(
              new Uint8Array(32).fill(0x20),
            ),
          }),
        ),
      subInvocations: [],
    });

    expect(() => getInvocationDetails(invocation)).not.toThrow();
    expect(getInvocationDetails(invocation)).toEqual([
      {
        type: "unknown",
        reason: "executablePreimageMismatch",
        functionType: "sorobanAuthorizedFunctionTypeCreateContractHostFn",
        executableType: "contractExecutableWasm",
        preimageType: "contractIdPreimageFromAsset",
      },
    ]);
  });

  it("returns an unknown entry for an external-ref executable paired with a non-address preimage", () => {
    // On-chain impossible, like the wasm case above: an external-ref
    // executable derives its contract ID from a deployer address plus salt,
    // so it can never be legitimately paired with an asset preimage.
    const owner = randomContracts(1)[0];
    const invocation = new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractHostFn(
          new xdr.CreateContractArgs({
            contractIdPreimage:
              xdr.ContractIdPreimage.contractIdPreimageFromAsset(
                new Asset("TEST", randomKey()).toXDRObject(),
              ),
            executable: xdr.ContractExecutable.contractExecutableExternalRef(
              new xdr.ContractExecutableExternalRef({
                executableOwner: owner.address().toScAddress(),
                tag: "my-tag",
              }),
            ),
          }),
        ),
      subInvocations: [],
    });

    expect(() => getInvocationDetails(invocation)).not.toThrow();
    expect(getInvocationDetails(invocation)).toEqual([
      {
        type: "unknown",
        reason: "executablePreimageMismatch",
        functionType: "sorobanAuthorizedFunctionTypeCreateContractHostFn",
        executableType: "contractExecutableExternalRef",
        preimageType: "contractIdPreimageFromAsset",
      },
    ]);
  });

  it("returns an unknown entry for a Stellar Asset executable paired with a non-asset preimage", () => {
    const contract = randomContracts(1)[0];
    const invocation = new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractHostFn(
          new xdr.CreateContractArgs({
            contractIdPreimage:
              xdr.ContractIdPreimage.contractIdPreimageFromAddress(
                new xdr.ContractIdPreimageFromAddress({
                  address: contract.address().toScAddress(),
                  salt: new Uint8Array(32),
                }),
              ),
            executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
          }),
        ),
      subInvocations: [],
    });

    expect(() => getInvocationDetails(invocation)).not.toThrow();
    expect(getInvocationDetails(invocation)).toEqual([
      {
        type: "unknown",
        reason: "executablePreimageMismatch",
        functionType: "sorobanAuthorizedFunctionTypeCreateContractHostFn",
        executableType: "contractExecutableStellarAsset",
        preimageType: "contractIdPreimageFromAddress",
      },
    ]);
  });

  it("keeps an unknown entry nested as a sub-invocation, in depth-first order beside its decodable siblings", () => {
    // This is the case a signing view most needs to get right: an
    // undecodable action nested below one the wallet *can* explain must
    // still show up, not vanish behind a decodable sibling.
    const contract = randomContracts(1)[0];
    const invocation = {
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
          new xdr.InvokeContractArgs({
            contractAddress: contract.address().toScAddress(),
            functionName: "outer",
            args: [],
          }),
        ),
      subInvocations: [
        {
          function: { type: "sorobanAuthorizedFunctionTypeFutureHostFn" },
          subInvocations: [],
        },
      ],
    } as unknown as xdr.SorobanAuthorizedInvocation;

    expect(() => getInvocationDetails(invocation)).not.toThrow();

    const details = getInvocationDetails(invocation);
    expect(details).toHaveLength(2);
    expect(details[0]).toEqual({
      type: "invoke",
      fnName: "outer",
      contractId: contract.contractId(),
      args: [],
    });
    expect(details[1]).toEqual({
      type: "unknown",
      reason: "unsupportedFunction",
      functionType: "sorobanAuthorizedFunctionTypeFutureHostFn",
    });
  });
});

describe("scValByType Protocol 28 and address coverage", () => {
  it("renders an executable tag", () => {
    const scv = xdr.ScVal.scvExecutableTag("v1.2.3");
    expect(scValByType(scv)).toEqual("v1.2.3");
  });

  it("keeps two distinct binary executable tags distinguishable", () => {
    // 0xff and 0xfe are each invalid UTF-8 on their own, so a lenient decode
    // (toString()) collapses both to the same U+FFFD replacement character —
    // the exact collision hex-encoding is meant to prevent.
    const tagA = xdr.ScVal.scvExecutableTag(new Uint8Array([0xff]));
    const tagB = xdr.ScVal.scvExecutableTag(new Uint8Array([0xfe]));
    expect(tagA.executableTag.toString()).toEqual(
      tagB.executableTag.toString(),
    );

    const renderedA = scValByType(tagA);
    const renderedB = scValByType(tagB);

    expect(renderedA).toEqual("ff");
    expect(renderedB).toEqual("fe");
    expect(renderedA).not.toEqual(renderedB);
  });

  it("renders all five ScAddress variants", () => {
    const account = Keypair.random().publicKey();
    const contract = StrKey.encodeContract(new Uint8Array(32).fill(3));

    const cases: Array<[xdr.ScAddress, string]> = [
      [new Address(account).toScAddress(), account],
      [new Address(contract).toScAddress(), contract],
      [
        xdr.ScAddress.scAddressTypeMuxedAccount(
          new xdr.MuxedEd25519Account({
            id: BigInt(1),
            ed25519: StrKey.decodeEd25519PublicKey(account),
          }),
        ),
        // Muxed addresses encode to an M-address.
        "M",
      ],
      [
        xdr.ScAddress.scAddressTypeClaimableBalance(
          xdr.ClaimableBalanceId.claimableBalanceIdTypeV0(
            new Uint8Array(32).fill(1),
          ),
        ),
        "B",
      ],
      [
        xdr.ScAddress.scAddressTypeLiquidityPool(
          new xdr.PoolId(new Uint8Array(32).fill(2)),
        ),
        "L",
      ],
    ];

    for (const [scAddress, expected] of cases) {
      const rendered = scValByType(xdr.ScVal.scvAddress(scAddress)) as string;
      expect(typeof rendered).toBe("string");
      expect(rendered.startsWith(expected)).toBe(true);
    }
  });

  it("returns null for an unhandled ScVal type", () => {
    expect(scValByType(xdr.ScVal.scvVoid())).toBeNull();
  });
});

describe("getInvocationDetails CreateContractV2 with an external ref", () => {
  it("surfaces constructorArgs alongside an external-ref executable", () => {
    const [owner, deployer] = randomContracts(2);
    const salt = new Uint8Array(32).fill(0x09);
    const invocation = new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeCreateContractV2HostFn(
          new xdr.CreateContractArgsV2({
            contractIdPreimage:
              xdr.ContractIdPreimage.contractIdPreimageFromAddress(
                new xdr.ContractIdPreimageFromAddress({
                  address: deployer.address().toScAddress(),
                  salt,
                }),
              ),
            executable: xdr.ContractExecutable.contractExecutableExternalRef(
              new xdr.ContractExecutableExternalRef({
                executableOwner: owner.address().toScAddress(),
                tag: "v2-tag",
              }),
            ),
            constructorArgs: [xdr.ScVal.scvU32(7)],
          }),
        ),
      subInvocations: [],
    });

    const [detail] = getInvocationDetails(invocation);

    expect(detail).toMatchObject({
      type: "externalRef",
      executableOwner: owner.contractId(),
      tag: "v2-tag",
      address: deployer.contractId(),
      salt: xdr.encodeBytes(salt, "hex"),
    });
    expect(
      (detail as { constructorArgs?: unknown[] }).constructorArgs,
    ).toHaveLength(1);
    // CAP-85 code can change after signing, so still no hash.
    expect(detail).not.toHaveProperty("hash");
  });
});

describe("getTokenInvocationArgs address handling", () => {
  it("resolves a muxed sender in a transfer", () => {
    const account = Keypair.random().publicKey();
    const muxed = xdr.ScAddress.scAddressTypeMuxedAccount(
      new xdr.MuxedEd25519Account({
        id: BigInt(7),
        ed25519: StrKey.decodeEd25519PublicKey(account),
      }),
    );

    const args = getArgsForTokenInvocation(SorobanTokenInterface.transfer, [
      xdr.ScVal.scvAddress(muxed),
      xdr.ScVal.scvAddress(new Address(account).toScAddress()),
      xdr.ScVal.scvI128(new xdr.Int128Parts({ hi: BigInt(0), lo: BigInt(5) })),
    ]);

    expect(args.from.startsWith("M")).toBe(true);
    expect(args.to).toEqual(account);
    expect(args.amount).toEqual(BigInt(5));
  });
});
