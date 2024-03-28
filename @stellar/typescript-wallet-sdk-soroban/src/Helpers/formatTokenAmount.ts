import { Soroban } from "@stellar/stellar-sdk";

/**
 * https://github.com/stellar/js-stellar-base/blob/4b510113738aefb5decb31e2ae72c27da5dd7f5c/src/soroban.js
 *
 * Given a whole number smart contract amount of a token and an amount of
 * decimal places (if the token has any), it returns a "display" value.
 *
 * All arithmetic inside the contract is performed on integers to avoid
 * potential precision and consistency issues of floating-point.
 *
 * @param {string | bigint} amount  the token amount you want to display
 * @param {number} decimals  specify how many decimal places a token has
 *
 * @returns {string}  the display value
 * @throws {TypeError}  if the given amount has a decimal point already
 * @example
 * formatTokenAmount("123000", 4) === "12.3";
 */
export const formatTokenAmount = (
  amount: string | bigint,
  decimals: number,
): string => Soroban.formatTokenAmount(amount.toString(), decimals);
