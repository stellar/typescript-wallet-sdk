# How to contribute

Please read the
[Contribution Guide](https://github.com/stellar/docs/blob/master/CONTRIBUTING.md).

Then please
[sign the Contributor License Agreement](https://docs.google.com/forms/d/1g7EF6PERciwn7zfmfke5Sir2n10yddGGSXyZsq98tVY/viewform?usp=send_form).

# Releasing

1. Update package.json version file in all submodules to new version

- all submodules should use same versioning

2. Update CHANGELOG.md in submodules that are updated
3. Commit changes
4. Trigger an npm publish using Github action for each updated submodule
5. Add a new release at:
   https://github.com/stellar/typescript-wallet-sdk/releases

## Npm Pipelines

All npm pipelines can be found in .github/workflows

1. npmPublishSdk.yml

- publishes typescript-wallet-sdk to npm

2. npmPublishSdkKM.yml

- publishes typescript-wallet-sdk-km to npm

3. npmPublishSdkKM.yml

- publishes typescript-wallet-sdk-soroban to npm

4. npmPublishBeta.yml

- publishes a beta build of typescript-wallet-sdk on merges to the `develop`
  branch
