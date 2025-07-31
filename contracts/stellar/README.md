# HTLC Contract Soroban

## How to build bindings

1. Install Rust and Soroban CLI
    https://developers.stellar.org/docs/tools/cli/install-cli

2. Build the contract
    ```bash
    make build
    ```

3. Generate the bindings
    ```bash
    make bindings
    ```

## How to publish

1. Prepare the package (happens automatically when you run `make bindings`)
    ```bash
    make package:prepare
    ```

2. Publish the package
    ```bash
    make package:publish
    ```

## Version update 

To update package version of `@QualiPe/htlc-contract` you can use `packageVersions` in `package.json` of the `/contracts/stellar` directory.
