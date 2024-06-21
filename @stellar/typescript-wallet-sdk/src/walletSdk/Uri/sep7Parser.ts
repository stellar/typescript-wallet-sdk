import { Sep7Pay, Sep7Tx } from "../Uri";
import {
  Sep7Replacement,
  WEB_STELLAR_TX_SCHEME,
  WEB_STELLAR_PAY_SCHEME,
  Sep7OperationType,
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
 * @returns {boolen} returns `true` if it's a valid Sep-7 uri, `false` otherwise.
 */
export const isValidSep7Uri = (uri: string): boolean => {
  // 'xdr' param is required for 'web+stellar:tx' uri
  if (uri.startsWith(WEB_STELLAR_TX_SCHEME) && uri.indexOf("xdr=") !== -1) {
    return true;
  }

  // 'destination' param is required for 'web+stellar:pay' uri
  if (
    uri.startsWith(WEB_STELLAR_PAY_SCHEME) &&
    uri.indexOf("destination=") !== -1
  ) {
    return true;
  }

  return false;
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
  if (!isValidSep7Uri(uri)) {
    throw new Sep7InvalidUriError();
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
