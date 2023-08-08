// ALEC TODO - file name

// ALEC TODO - remove
// export const c = require("crypto");
// console.log({ c }); // ALEC TODO - remove

let c;
// ALEC TODO - make constants
let environment;
if (typeof window !== "undefined" && !!window.crypto) {
  // web
  console.log("in web"); // ALEC TODO - remove
  c = window.crypto;
  environment = "web";
} else if (
  typeof navigator !== "undefined" &&
  navigator.product === "ReactNative"
) {
  // react native
  c = require("expo-crypto");
  console.log("in react native"); // ALEC TODO - remove
  environment = "react-native";
} else if (typeof process !== "undefined") {
  // node

  c = require("crypto");

  // cryp = await import("crypto");
  environment = "node";
} else {
  console.log("env not found"); // ALEC TODO - remove
}

export const getRandomBytes = () => {
  switch (environment) {
    case "web":
      const arr = new Uint8Array(32);
      return c.getRandomValues(array);
    case "react-native":
      return c.getRandomBytes(32);
    case "node":
      return c.randomBytes(32);
    default:
      // ALEC TODO - exception
      throw new Error("unknown environment, can not get random bytes");
  }
};
