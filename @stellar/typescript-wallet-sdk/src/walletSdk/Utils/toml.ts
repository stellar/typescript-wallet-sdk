import { StellarToml } from "@stellar/stellar-sdk";

import { TomlInfo } from "../Types";

export const parseToml = (toml: StellarToml.Api.StellarToml): TomlInfo => {
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
      code: tc["code"],
      codeTemplate: tc["code_template"],
      issuer: tc["issuer"],
      status: tc["status"],
      displayDecimals: tc["display_decimals"],
      name: tc["name"],
      desc: tc["desc"],
      conditions: tc["conditions"],
      image: tc["image"],
      fixedNumber: tc["fixed_number"],
      maxNumber: tc["max_number"],
      isUnlimited: tc["is_unlimited"],
      isAssetAnchored: tc["is_asset_anchored"],
      anchorAssetType: tc["anchor_asset_type"],
      anchorAsset: tc["anchor_asset"],
      attestationOfReserve: tc["attestation_of_reserve"],
      redemptionInstructions: tc["redemption_instructions"],
      collateralAddresses: tc["collateral_addresses"],
      collateralAddressMessages: tc["collateral_address_messages"],
      collateralAddressSignatures: tc["collateral_address_signatures"],
      regulated: tc["regulated"],
      approvalServer: tc["approval_server"],
      approvalCriteria: tc["approval_criteria"],
    };
  });

  const tomlValidators = toml["VALIDATORS"] || [];
  const validators = tomlValidators.map((tv) => {
    return {
      alias: tv["ALIAS"],
      displayName: tv["DISPLAY_NAME"],
      publicKey: tv["PUBLIC_KEY"],
      host: tv["HOST"],
      history: tv["HISTORY"],
    };
  });

  return {
    version: toml["VERSION"],
    networkPassphrase: toml["NETWORK_PASSPHRASE"],
    federationServer: toml["FEDERATION_SERVER"],
    authServer: toml["AUTH_SERVER"] as string,
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
