import { Networks, StrKey, Transaction } from "@stellar/stellar-sdk";

import { Sep7Pay, Sep7Tx } from "../Uri";
import {
  Sep7Replacement,
  Sep7OperationType,
  IsValidSep7UriResult,
  WEB_STELLAR_SCHEME,
  URI_MSG_MAX_LENGTH,
} from "../Types";
import {
  Sep7InvalidUriError,
  Sep7UriTypeNotSupportedError,
} from "../Exceptions";

/**
 * Returns true if the given URI is a SEP-7 compliant URI, false otherwise.
 *
 * Currently this checks whether it starts with 'web+stellar:tx' or 'web+stellar:pay'
 * and has its required parameters: 'xdr=' and 'destination=' respectively.
 *
 * @param {string} uri The URI string to check.
 *
 * @returns {IsValidSep7UriResult} returns '{ result: true }' if it's a valid Sep-7
 * uri, returns '{ result: false, reason: "<reason>" }' containing a 'reason' message
 * in case the verification fails.
 */
export const isValidSep7Uri = (uri: string): IsValidSep7UriResult => {
  if (!uri.startsWith(WEB_STELLAR_SCHEME)) {
    return {
      result: false,
      reason: `it must start with '${WEB_STELLAR_SCHEME}'`,
    };
  }

  const url = new URL(uri);

  const type = url.pathname as Sep7OperationType;
  const xdr = url.searchParams.get("xdr");
  const networkPassphrase =
    url.searchParams.get("network_passphrase") || Networks.PUBLIC;
  const destination = url.searchParams.get("destination");
  const msg = url.searchParams.get("msg");

  if (![Sep7OperationType.tx, Sep7OperationType.pay].includes(type)) {
    return {
      result: false,
      reason: `operation type '${type}' is not currently supported`,
    };
  }

  if (type === Sep7OperationType.tx && !xdr) {
    return {
      result: false,
      reason: `operation type '${type}' must have a 'xdr' parameter`,
    };
  }

  if (type === Sep7OperationType.tx && xdr) {
    try {
      new Transaction(xdr, networkPassphrase);
    } catch {
      return {
        result: false,
        reason: `the provided 'xdr' parameter is not a valid transaction envelope on the '${networkPassphrase}' network`,
      };
    }
  }

  if (type === Sep7OperationType.pay && !destination) {
    return {
      result: false,
      reason: `operation type '${type}' must have a 'destination' parameter`,
    };
  }

  if (type === Sep7OperationType.pay && destination) {
    // Checks if it's a valid "G", "M" or "C" Stellar address
    const isValidStellarAddress =
      StrKey.isValidEd25519PublicKey(destination) ||
      StrKey.isValidMed25519PublicKey(destination) ||
      StrKey.isValidContract(destination);

    if (!isValidStellarAddress) {
      return {
        result: false,
        reason:
          "the provided 'destination' parameter is not a valid Stellar address",
      };
    }
  }

  if (msg?.length > URI_MSG_MAX_LENGTH) {
    return {
      result: false,
      reason: `the 'msg' parameter should be no longer than ${URI_MSG_MAX_LENGTH} characters`,
    };
  }

  return {
    result: true,
  };
};

/**
 * Try parsing a SEP-7 URI string and returns a Sep7Tx or Sep7Pay instance,
 * depending on the type.
 *
 * @param {string} uri The URI string to parse.
 *
 * @returns {Sep7Tx | Sep7Pay} a uri parsed Sep7Tx or Sep7Pay instance.
 *
 * @throws {Sep7InvalidUriError} if the inputted uri is not a valid SEP-7 URI.
 * @throws {Sep7UriTypeNotSupportedError} if the inputted uri does not have a
 * supported SEP-7 type.
 */
export const parseSep7Uri = (uri: string): Sep7Tx | Sep7Pay => {
  const isValid = isValidSep7Uri(uri);
  if (!isValid.result) {
    throw new Sep7InvalidUriError(isValid.reason);
  }

  const url = new URL(uri);

  const type = url.pathname;
  switch (type) {
    case Sep7OperationType.tx:
      return new Sep7Tx(url);
    case Sep7OperationType.pay:
      return new Sep7Pay(url);
    default:
      throw new Sep7UriTypeNotSupportedError(type);
  }
};

/**
 * String delimiters shared by the parsing functions below.
 */
const HINT_DELIMITER = ";";
const ID_DELIMITER = ":";
const LIST_DELIMITER = ",";

/**
 * Takes a Sep-7 URL-decoded 'replace' string param and parses it to a list of
 * Sep7Replacement objects for easy of use.
 *
 * This string identifies the fields to be replaced in the XDR using
 * the 'Txrep (SEP-0011)' representation, which should be specified in the format of:
 * txrep_tx_field_name_1:reference_identifier_1,txrep_tx_field_name_2:reference_identifier_2;reference_identifier_1:hint_1,reference_identifier_2:hint_2
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0011.md
 *
 * @param {string} [replacements] a replacements string in the
 * 'Txrep (SEP-0011)' representation.
 *
 * @returns {Sep7Replacement[]} a list of parsed Sep7Replacement objects.
 */
export const sep7ReplacementsFromString = (
  replacements?: string,
): Sep7Replacement[] => {
  if (!replacements) {
    return [];
  }

  const [txrepString, hintsString] = replacements.split(HINT_DELIMITER);
  const hintsList = hintsString.split(LIST_DELIMITER);

  const hintsMap: { [id: string]: string } = {};

  hintsList
    .map((item) => item.split(ID_DELIMITER))
    .forEach(([id, hint]) => (hintsMap[id] = hint));

  const txrepList = txrepString.split(LIST_DELIMITER);

  const replacementsList = txrepList
    .map((item) => item.split(ID_DELIMITER))
    .map(([path, id]) => ({ id, path, hint: hintsMap[id] }));

  return replacementsList;
};

/**
 * Takes a list of Sep7Replacement objects and parses it to a string that
 * could be URL-encoded and used as a Sep-7 URI 'replace' param.
 *
 * This string identifies the fields to be replaced in the XDR using
 * the 'Txrep (SEP-0011)' representation, which should be specified in the format of:
 * txrep_tx_field_name_1:reference_identifier_1,txrep_tx_field_name_2:reference_identifier_2;reference_identifier_1:hint_1,reference_identifier_2:hint_2
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0011.md
 *
 * @param {Sep7Replacement[]} [replacements] a list of Sep7Replacement objects.
 *
 * @returns {string} a string that identifies the fields to be replaced in the
 * XDR using the 'Txrep (SEP-0011)' representation.
 */
export const sep7ReplacementsToString = (
  replacements?: Sep7Replacement[],
): string => {
  if (!replacements || replacements.length === 0) {
    return "";
  }

  const hintsMap: { [id: string]: string } = {};

  const txrepString = replacements
    .map(({ id, hint, path }) => {
      hintsMap[id] = hint;

      return `${path}${ID_DELIMITER}${id}`;
    })
    .join(LIST_DELIMITER);

  const hintsString = Object.entries(hintsMap)
    .map(([id, hint]) => `${id}${ID_DELIMITER}${hint}`)
    .join(LIST_DELIMITER);

  return `${txrepString}${HINT_DELIMITER}${hintsString}`;
};
