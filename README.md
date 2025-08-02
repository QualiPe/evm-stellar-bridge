# EVM-Stellar Bridge

Cross-chain atomic swap bridge between EVM chains and Stellar using HTLC contracts.

## 🚀 Quick Start

> **Note**
> Before anything else, you need to build internal packages.
> Run `make prepare-repo` to build and install all dependencies.

```bash
# Install
pnpm install

# Configure
cd apps/server
cp env.example .env
# Edit .env with your settings

# Start
npm run start:dev
```

## 🧪 Tests

```bash
# Bidirectional relayer test
node test-bidirectional-relayer.js

# Full relayer test  
node test-full-relayer.js
```

## 📚 API

### HTLC Endpoints
- `GET /htlc/evm/status` - EVM service status
- `POST /htlc/evm/fund` - Fund EVM HTLC
- `POST /htlc/stellar/create` - Create Stellar HTLC
- `POST /htlc/relayer/start` - Start relayer

### Intents
- `POST /intents` - Create swap intent
- `GET /intents/:id` - Get intent details

## 🔧 Environment

```bash
# Required
EVM_RPC_URL=
EVM_PRIVATE_KEY=
EVM_HTLC_CONTRACT_ADDRESS=
STELLAR_SECRET_KEY=
STELLAR_HTLC_CONTRACT_ADDRESS=
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## 🎯 Status

✅ **Production Ready** - Tested on testnet with real contracts 