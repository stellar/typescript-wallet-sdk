import { Soroban } from "@stellar/stellar-sdk";
import BigNumber from "bignumber.js";

/**
 * https://github.com/stellar/js-stellar-base/blob/4b510113738aefb5decb31e2ae72c27da5dd7f5c/src/soroban.js
 *
 * Parse a token amount to use it on smart contract
 *
 * This function takes the display value and its decimals (if the token has
 * any) and returns a string that'll be used within the smart contract.
 *
 * @param {string | number | BigNumber} amount  the token amount you want to
 *    use in a smart contract which you've been displaying in a UI
 * @param {number} decimals  the number of decimal places expected in the
 *    display value (different than the "actual" number, because suffix zeroes
 *    might not be present)
 *
 * @returns {bigint}  the whole number token amount represented by the display
 *    value with the decimal places shifted over
 *
 * @example
 * const displayValueAmount = "123.4560"
 * const parsedAmtForSmartContract = parseTokenAmount(displayValueAmount, 5);
 * parsedAmtForSmartContract === "12345600"
 */
export const parseTokenAmount = (
  amount: string | number | BigNumber,
  decimals: number,
): bigint => {
  const parsedAmount = Soroban.parseTokenAmount(amount.toString(), decimals);

  return BigInt(parsedAmount.toString());
};
