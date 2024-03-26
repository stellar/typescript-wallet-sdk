export const camelToSnakeCaseKey = (key: string): string =>
  key.replace(
    /[A-Z]/g,
    (upperCaseLetter) => `_${upperCaseLetter.toLowerCase()}`,
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const camelToSnakeCaseObject = (obj: any): any => {
  const snakeCasedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeCaseKey = camelToSnakeCaseKey(key);
      snakeCasedObj[snakeCaseKey] = obj[key];
    }
  }
  return snakeCasedObj;
};
