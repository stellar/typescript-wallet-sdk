# Sep-12 examples for stellar typescript-wallet-sdk

## Example code

To view how the wallet-sdk can be used to add sep12 KYC details, look at
`./sep12.ts`.

To run the script and interactively collect KYC details, configure the
appropriate environment variables and run -

```
$ yarn example:sep12
```

## Changing environment variables

If you'd like to use different environment variable values than the default
ones, you can add a `.env` file. See `.env.example` as an example.

The environment variables you can set are:

| Variable Name | Description                                    | Default Value          |
| ------------- | ---------------------------------------------- | ---------------------- |
| ANCHOR_DOMAIN | The anchor domain for your application.        | testanchor.stellar.org |
| SECRET_KEY    | The secret key to use for sep10 authentication |                        |
