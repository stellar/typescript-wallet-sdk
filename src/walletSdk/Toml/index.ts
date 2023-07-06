
export type TomlInfo = {
  version: string;
  networkPassphrase: string;
  federationServer: string;
  authServer: string;
  transferServer: string;
  transferServerSep24: string;
  kycServer: string;
  webAuthEndpoint: string;
  signingKey: string;
  horizonUrl: string;
  accounts: Array<string>;
  uriRequestSigningKey: string;
  directPaymentServer: string;
  anchorQuoteServer: string;
  documentation: {
    orgName: string;
    orgDba: string;
    orgUrl: string;
    orgLogo: string;
    orgDescription: string;
    orgPhysicalAddress: string;
    orgPhysicalAddressAttestation: string;
    orgPhoneNumber: string;
    orgPhoneNumberAttestation: string;
    orgKeybase: string;
    orgTwitter: string;
    orgGithub: string;
    orgOfficialEmail: string;
    orgSupportEmail: string;
    orgLicensingAuthority: string;
    orgLicenseType: string;
    orgLicenseNumber: string;
  };
  principals: Array<{
    name: string;
    email: string;
    keybase: string;
    telegram: string;
    twitter: string;
    github: string;
    idPhotoHash: string;
    verificationPhotoHash: string;
  }>;
  currencies: Array<{
    code: string;
    codeTemplate: string;
    issuer: string;
    status: string;
    displayDecimals: string;
    name: string;
    desc: string;
    conditions: string;
    image: string;
    fixedNumber: string;
    maxNumber: string;
    isUnlimited: boolean;
    isAssetAnchored: boolean;
    anchorAssetType: string;
    anchorAsset: string;
    attestationOfReserve: string;
    redemptionInstructions: string;
    collateralAddresses: Array<string>;
    collateralAddressMessages: Array<string>;
    collateralAddressSignatures: Array<string>;
    regulated: string;
    approvalServer: string;
    approvalCriteria: string;
  }>;
  validators: Array<{
    alias: string;
    displayName: string;
    publicKey: string;
    host: string;
    history: string;
  }>;
};

export const parseToml = (toml): TomlInfo => {
  const tomlDocumentation = toml["DOCUMENTATION"];
  const documentation = {
    orgName: tomlDocumentation["ORG_NAME"],
    orgDba: tomlDocumentation["ORG_DBA"],
    orgUrl: tomlDocumentation["ORG_URL"],
    orgLogo: tomlDocumentation["ORG_LOGO"],
    orgDescription: tomlDocumentation["ORG_DESCRIPTION"],
    orgPhysicalAddress: tomlDocumentation["ORG_PHYSICAL_ADDRESS"],
    orgPhysicalAddressAttestation:
      tomlDocumentation["ORG_PHYSICAL_ADDRESS_ATTESTATION"],
    orgPhoneNumber: tomlDocumentation["ORG_PHONE_NUMBER"],
    orgPhoneNumberAttestation:
      tomlDocumentation["ORG_PHONE_NUMBER_ATTESTATION"],
    orgKeybase: tomlDocumentation["ORG_KEYBASE"],
    orgTwitter: tomlDocumentation["ORG_TWITTER"],
    orgGithub: tomlDocumentation["ORG_GITHUB"],
    orgOfficialEmail: tomlDocumentation["ORG_OFFICIAL_EMAIL"],
    orgSupportEmail: tomlDocumentation["ORG_SUPPORT_EMAIL"],
    orgLicensingAuthority: tomlDocumentation["ORG_LICENSING_AUTHORITY"],
    orgLicenseType: tomlDocumentation["ORG_LICENSE_TYPE"],
    orgLicenseNumber: tomlDocumentation["ORG_LICENSE_NUMBER"],
  };

  const tomlPrincipals = toml["PRINCIPALS"] || [];
  const principals = tomlPrincipals.map((tp) => {
    return {
      name: tp["name"],
      email: tp["email"],
      keybase: tp["keybase"],
      telegram: tp["telegram"],
      twitter: tp["twitter"],
      github: tp["github"],
      idPhotoHash: tp["id_photo_hash"],
      verificationPhotoHash: tp["verification_photo_hash"],
    };
  });

  const tomlCurrencies = toml["CURRENCIES"] || [];
  const currencies = tomlCurrencies.map((tc) => {
    return {
      code: tomlCurrencies["code"],
      codeTemplate: tomlCurrencies["code_template"],
      issuer: tomlCurrencies["issuer"],
      status: tomlCurrencies["status"],
      displayDecimals: tomlCurrencies["display_decimals"],
      name: tomlCurrencies["name"],
      desc: tomlCurrencies["desc"],
      conditions: tomlCurrencies["conditions"],
      image: tomlCurrencies["image"],
      fixedNumber: tomlCurrencies["fixed_number"],
      maxNumber: tomlCurrencies["max_number"],
      isUnlimited: tomlCurrencies["is_unlimited"],
      isAssetAnchored: tomlCurrencies["is_asset_anchored"],
      anchorAssetType: tomlCurrencies["anchor_asset_type"],
      anchorAsset: tomlCurrencies["anchor_asset"],
      attestationOfReserve: tomlCurrencies["attestation_of_reserve"],
      redemptionInstructions: tomlCurrencies["redemption_instructions"],
      collateralAddresses: tomlCurrencies["collateral_addresses"],
      collateralAddressMessages: tomlCurrencies["collateral_address_messages"],
      collateralAddressSignatures:
        tomlCurrencies["collateral_address_signatures"],
      regulated: tomlCurrencies["regulated"],
      approvalServer: tomlCurrencies["approval_server"],
      approvalCriteria: tomlCurrencies["approval_criteria"],
    };
  });

  const tomlValidators = toml["VALIDATORS"] || [];
  const validators = tomlValidators.map((tv) => {
    return {
      alias: tomlValidators["ALIAS"],
      displayName: tomlValidators["DISPLAY_NAME"],
      publicKey: tomlValidators["PUBLIC_KEY"],
      host: tomlValidators["HOST"],
      history: tomlValidators["HISTORY"],
    };
  });

  return {
    version: toml["VERSION"],
    networkPassphrase: toml["NETWORK_PASSPHRASE"],
    federationServer: toml["FEDERATION_SERVER"],
    authServer: toml["AUTH_SERVER"],
    transferServer: toml["TRANSFER_SERVER"],
    transferServerSep24: toml["TRANSFER_SERVER_SEP0024"],
    kycServer: toml["KYC_SERVER"],
    webAuthEndpoint: toml["WEB_AUTH_ENDPOINT"],
    signingKey: toml["SIGNING_KEY"],
    horizonUrl: toml["HORIZON_URL"],
    accounts: toml["ACCOUNTS"],
    uriRequestSigningKey: toml["URI_REQUEST_SIGNING_KEY"],
    directPaymentServer: toml["DIRECT_PAYMENT_SERVER"],
    anchorQuoteServer: toml["ANCHOR_QUOTE_SERVER"],
    documentation,
    principals,
    currencies,
    validators,
  };
};
