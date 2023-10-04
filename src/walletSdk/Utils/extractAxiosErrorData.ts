import axios from "axios";
import { AxiosErrorData } from "../Types";

// Based on https://axios-http.com/docs/handling_errors

export const extractAxiosErrorData = (error: Error): AxiosErrorData => {
  if (!axios.isAxiosError(error)) {
    return { responseData: JSON.stringify(error) };
  }
  if (error.response) {
    return {
      status: error.response.status,
      statusText: error.response.statusText,
      responseData: error.response.data,
      headers: error.response.headers,
    };
  } else if (error.request) {
    // The request was made but no response was received
    return {
      statusText: `No response received from request: ${JSON.stringify(
        error.request,
      )}`,
    };
  } else {
    // Something happened in setting up the request that triggered an Error
    return { statusText: `Failed request with error: ${error.message}` };
  }
};
