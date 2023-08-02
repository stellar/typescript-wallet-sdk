import get from "lodash/get";

export const getResultCode = (error: Error) => {
  return get(error, "response.data.extras.result_codes.transaction", "");
};
