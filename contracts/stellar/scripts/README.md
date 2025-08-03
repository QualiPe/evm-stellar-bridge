# HTLC Scripts

This directory contains scripts for deploying and testing the HTLC (Hash Time Locked Contract) on Stellar.

## Prerequisites

1. **Environment Setup**: Make sure you have the following environment variables set in your `.env` file:
   - `ISSUER_SECRET`: Secret key of the asset issuer
   - `DISTRIBUTOR_SECRET`: Secret key of the distributor account
   - `DEPLOYER_SECRET`: Secret key of the deployer account
   - `HTLC_CONTRACT_ADDRESS`: Address of the deployed HTLC contract

2. **Stellar CLI**: Install the Stellar CLI for deploying assets to Soroban:
   ```bash
   curl -sSf https://soroban.stellar.org/install.sh | sh
   ```

## Scripts Overview

### 1. `deploy-test-asset.ts`
Deploys a test asset to the Stellar network and provides instructions for getting the token_id.

**Usage:**
```bash
yarn tsx scripts/deploy-test-asset.ts
```

**What it does:**
- Creates a TEST asset with your issuer account
- Sets up trustlines and distributes tokens
- Provides instructions for getting the token_id (SAC address)

### 2. `setup-token-id.ts`
Interactive script to set up the token_id in your `.env` file.

**Usage:**
```bash
yarn tsx scripts/setup-token-id.ts
```

**What it does:**
- Prompts you to enter the SAC address (token_id)
- Automatically updates your `.env` file with the TOKEN_ID
- Provides clear instructions for getting the SAC address

### 3. `get-token-id.ts`
Helper script that provides information about getting the token_id.

**Usage:**
```bash
yarn tsx scripts/get-token-id.ts
```

### 4. `create-swap.ts`
Creates an HTLC swap using the configured token_id.

**Usage:**
```bash
yarn tsx scripts/create-swap.ts
```

**What it does:**
- Creates a trustline for the deployer account
- Sends tokens from issuer to deployer
- Creates an HTLC swap with the specified token_id

## How to Get the Token_ID

The **token_id** is the Stellar Asset Contract (SAC) address that gets created when you deploy a Stellar asset to Soroban.

### Step-by-Step Process:

1. **Deploy the test asset:**
   ```bash
   yarn tsx scripts/deploy-test-asset.ts
   ```

2. **Get the SAC address using Stellar CLI:**
   ```bash
   stellar contract deploy --source [YOUR_ISSUER_PUBLIC_KEY] --network testnet
   ```

3. **Set up the token_id:**
   ```bash
   yarn tsx scripts/setup-token-id.ts
   ```
   Then enter the SAC address when prompted.

4. **Create a swap:**
   ```bash
   yarn tsx scripts/create-swap.ts
   ```

## Troubleshooting

### Common Issues:

1. **"TOKEN_ID is not set"**
   - Run `yarn tsx scripts/setup-token-id.ts` to set up the token_id

2. **"resulting balance is not within the allowed range"**
   - This means the sender doesn't have enough tokens
   - The `create-swap.ts` script should handle this automatically by sending tokens from issuer to deployer

3. **"Transaction simulation failed"**
   - Check that all environment variables are set correctly
   - Ensure the HTLC contract is deployed and the address is correct
   - Make sure the token_id (SAC address) is valid

### Environment Variables Checklist:

Make sure your `.env` file contains:
```
ISSUER_SECRET=your_issuer_secret_key
DISTRIBUTOR_SECRET=your_distributor_secret_key
DEPLOYER_SECRET=your_deployer_secret_key
HTLC_CONTRACT_ADDRESS=your_htlc_contract_address
TOKEN_ID=your_sac_address
```

## Token_ID Format

The token_id should be a valid Stellar contract address (SAC address) that looks like:
```
CALEDUH4356NOQ55WS6KU27KVHH53TBZIKD3T7YTFKBADFAJEHUJDXPK
```

This is the address of the Stellar Asset Contract that was deployed to Soroban for your specific asset. 