export type CustomerInfoMap = {
  [key: string]: string;
};

export type CustomerBinaryInfoMap = {
  [key: string]: Buffer | string;
};

export enum Sep12Status {
  ACCEPTED = "ACCEPTED",
  PROCESSING = "PROCESSING",
  NEEDS_INFO = "NEEDS_INFO",
  REJECTED = "REJECTED",
  VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED",
}

export enum Sep12Type {
  string = "string",
  binary = "binary",
  number = "number",
  date = "date",
}

export type Field = {
  type: Sep12Type;
  description: string;
  choices?: Array<string>;
  optional?: boolean;
};

export type ProvidedField = {
  type: Sep12Type;
  description: string;
  choices?: Array<string>;
  optional?: boolean;
  status?: Sep12Status;
  error?: string;
};

export type GetCustomerParams = {
  id?: string;
  type?: string;
  memo?: string;
  lang?: string;
  transactionId?: string;
};

export type GetCustomerResponse = {
  id?: string;
  status: Sep12Status;
  fields?: { [key: string]: Field };
  provided_fields?: { [key: string]: ProvidedField };
  message?: string;
};

export type AddCustomerParams = {
  sep9Info?: CustomerInfoMap;
  sep9BinaryInfo?: CustomerBinaryInfoMap;
  id?: string;
  memo?: string;
  type?: string;
  transactionId?: string;
};

export type AddCustomerResponse = {
  id: string;
};
