import { URL } from "url";

let Url;
if (typeof window === "undefined") {
  Url = URL;
} else {
  Url = window.URL;
}

export const getUrlDomain = (url: string) => {
  return new Url(url).host;
};
