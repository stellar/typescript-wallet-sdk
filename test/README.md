# Recovery Integration Tests

## How it works

The recovery integration tests run different recovery scenarios against recovery
signer and webauth servers. 2 recovery signer and 2 webauth servers are started
in a docker-compose file (see test/docker/docker-compose.yml), to simulate a
wallet interacting with 2 separate recovery servers.

## To run tests locally:

```
// start servers using docker
$ docker-compose -f test/docker/docker-compose.yml up

// run tests
$ yarn test:integration:ci
```
