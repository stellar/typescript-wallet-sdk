export const camelToSnakeCaseKey = (key: string): string => 
  key.replace(/[A-Z]/g, upperCaseLetter => `_${upperCaseLetter.toLowerCase()}`);

export const camelToSnakeCaseObject = (obj: any): any => { 
  const snakeCasedObj = {};
  for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
          const snakeCaseKey = camelToSnakeCaseKey(key);
          snakeCasedObj[snakeCaseKey] = obj[key];
      }
  }
  return snakeCasedObj;
}