export const WEB_STELLAR_SCHEME = "web+stellar:";

export enum Sep7OperationType {
  tx = "tx",
  pay = "pay",
}

export const URI_MSG_MAX_LENGTH = 300;
export const URI_REPLACE_MAX_LENGTH = 4096;

export type Sep7Replacement = {
  id: string;
  path: string;
  hint: string;
};

export type IsValidSep7UriResult = {
  result: boolean;
  reason?: string;
};

/**
 * Matches a fully qualified domain name (e.g. "example.com", "sub.example.co.uk").
 *
 * Rejects userinfo ('@'), ports (':'), paths/queries ('/', '?'), scheme
 * prefixes ('//'), bare hostnames like 'localhost', and raw IPv4/IPv6
 * addresses (the all-numeric final label fails the alphabetic TLD rule).
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md#verifying-the-signature step 3.
 */
export const FULLY_QUALIFIED_DOMAIN_NAME_REGEX =
  /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

/**
 * Returns true if the given string is a valid fully qualified domain name.
 *
 * @param {string} domain the domain string to validate.
 *
 * @returns {boolean} true if 'domain' is a valid fully qualified domain name.
 */
export const isValidFullyQualifiedDomainName = (domain: string): boolean =>
  FULLY_QUALIFIED_DOMAIN_NAME_REGEX.test(domain);
