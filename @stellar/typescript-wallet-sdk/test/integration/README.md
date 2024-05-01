# Recovery Integration Tests

## How it works

The recovery integration tests run different recovery scenarios against recovery
signer and webauth servers. 2 recovery signer and 2 webauth servers are started
in a docker-compose file (see test/docker/docker-compose.yml), to simulate a
wallet interacting with 2 separate recovery servers.

## To run tests locally:

```
// start servers using docker
$ docker-compose -f @stellar/typescript-wallet-sdk/test/docker/docker-compose.yml up

// run tests
$ yarn test:recovery:ci
```

# AnchorPlatform Integration Tests

## How it works

This test works similar to the recovery integration tests. It spins up an
anchorplatform image from the (java anchor sdk
repo)[https://github.com/stellar/java-stellar-anchor-sdk] and runs tests
against.

## To run tests locally:

- follow the steps defined in the
  (.github/workflows/integration.anchorPlatformTest.yml)[https://github.com/stellar/typescript-wallet-sdk/blob/main/.github/workflows/integration.anchorPlatformTest.yml]
  file locally

1. Clone the java-stellar-anchor-sdk repo locally
2. Run the docker build command
3. Run the docker command
4. Run the anchorPlatform tests from this repo
