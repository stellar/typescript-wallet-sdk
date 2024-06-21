import { Sep7Pay, Sep7Tx } from "../Uri";
import {
  Sep7Replacement,
  WEB_STELLAR_TX_SCHEME,
  WEB_STELLAR_PAY_SCHEME,
  Sep7OperationType,
} from "../Types";
import {
  InvalidSep7UriError,
  Sep7UriTypeNotSupportedError,
} from "../Exceptions";

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

export const parseSep7Uri = (uri: string): Sep7Tx | Sep7Pay => {
  if (!isValidSep7Uri(uri)) {
    throw new InvalidSep7UriError();
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

const HINT_DELIMITER = ";";
const ID_DELIMITER = ":";
const LIST_DELIMITER = ",";

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
