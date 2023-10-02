import axios from "axios";

// Based on https://axios-http.com/docs/handling_errors
export const extractAxiosErrorData = (error: Error): string => {
  if (!axios.isAxiosError(error)) {
    return JSON.stringify(error);
  }

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    return (
      `Server request failed with error:\n` +
      `Status: ${error.response.status}\n` +
      `Status Text: ${error.response.statusText}\n` +
      `Response Data: ${JSON.stringify(error.response.data)}\n` +
      `Headers: ${JSON.stringify(error.response.headers)}`
    );
  } else if (error.request) {
    // The request was made but no response was received
    return `No response received from request: ${JSON.stringify(
      error.request,
    )}`;
  } else {
    // Something happened in setting up the request that triggered an Error
    return `Failed request with error: ${error.message}`;
  }
};
