# EVM-Stellar Bridge

Cross-chain atomic swap bridge between EVM chains and Stellar using HTLC (Hash Time-Locked Contract) technology.

## 🏗️ Architecture Overview

```
EVM Chain (Sepolia) ←→ Bridge Service ←→ Stellar (Testnet)
     ✅ Complete           ✅ Complete        ✅ Complete
```

### Core Components

1. **Intent System** - Manages swap state and coordinates cross-chain operations
2. **HTLC Contracts** - Secure atomic swaps on both chains
3. **Relayer Service** - Monitors events and orchestrates cross-chain coordination
4. **Preimage Management** - Cryptographic secrets for HTLC withdrawals

## 🔄 How It Works

### 1. Intent Creation
```bash
POST /intents
{
  "direction": "EVM_TO_STELLAR",
  "fromToken": "USDC",
  "toToken": "USDC", 
  "amountIn": "0.001",
  "toAddress": "0x..."
}
```
- Generates unique **hashlock** (cryptographic hash)
- Creates **preimage** (secret for withdrawal)
- Sets up swap parameters and timelocks
- Returns intent with `hashlock` and `preimage`

### 2. HTLC Funding (EVM Side)
```bash
POST /htlc/evm/fund
{
  "recipient": "0x...",
  "amount": "1000",
  "hashlock": "0x...",
  "timelock": 3600
}
```
- Funds HTLC contract on EVM chain
- Returns **SwapId** (transaction hash)
- Automatically stores SwapId in intent's `tx.swapId`
- Updates intent status to `evm_locked`

### 3. Relayer Coordination
The relayer service:
- Monitors EVM HTLC events (`Funded`, `Withdrawn`, `Refunded`)
- Creates corresponding HTLC on Stellar when EVM is funded
- Triggers withdrawals when preimage is revealed
- Handles timeouts and refunds

### 4. Preimage & Withdrawal
```bash
GET /intents/{id}/preimage
# Returns: {"preimage": "0x..."}

POST /htlc/evm/withdraw
{
  "swapId": "0x...",
  "preimage": "0x..."
}
```
- Preimage is the secret that unlocks HTLC funds
- Same preimage works on both chains
- Enables atomic cross-chain swaps

## 🎯 Production Status

### ✅ **Complete Bridge: Production Ready**
- Full EVM ↔ Stellar atomic swap functionality
- Real Sepolia and Stellar testnet transactions
- Dual lookup methods (hashlock + SwapId)
- Complete HTLC lifecycle management
- Cross-chain coordination working
- Event-driven monitoring and automation

## 🚀 Quick Start

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

## 🧪 Testing

```bash
# Complete SwapId flow test
node test-final-swapid-flow.js

# Full bridge test (EVM ↔ Stellar)
node test-complete-bridge-flow.js
```

## 📚 API Reference

### Intents
- `POST /intents` - Create swap intent
- `GET /intents/:id` - Get intent details
- `GET /intents/find-by-swapid/{swapId}` - Find by SwapId
- `GET /intents/find-by-hashlock/{hashlock}` - Find by hashlock
- `GET /intents/{id}/preimage` - Get preimage

### HTLC Operations
- `POST /htlc/evm/fund` - Fund EVM HTLC (stores SwapId)
- `GET /htlc/evm/swap/{swapId}` - Get swap details
- `POST /htlc/evm/withdraw` - Withdraw from EVM HTLC
- `POST /htlc/evm/refund` - Refund EVM HTLC
- `POST /htlc/stellar/create` - Create Stellar HTLC
- `POST /htlc/stellar/withdraw` - Withdraw from Stellar HTLC
- `POST /htlc/stellar/refund` - Refund Stellar HTLC

### Relayer
- `POST /htlc/relayer/start` - Start relayer
- `GET /htlc/relayer/status` - Get relayer status

## 🔧 Environment Variables

```bash
# Required
EVM_RPC_URL=
EVM_PRIVATE_KEY=
EVM_HTLC_CONTRACT_ADDRESS=
STELLAR_SECRET_KEY=
STELLAR_HTLC_CONTRACT_ADDRESS=
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## 🔐 Security Features

- **Atomic Swaps**: Either both chains complete or both refund
- **Time-Locked**: Automatic refunds if not completed in time
- **Cryptographic Security**: Hashlock/preimage mechanism
- **Event-Driven**: Real-time monitoring of blockchain events
- **Dual Tracking**: Both hashlock and SwapId for redundancy
- **Cross-Chain Coordination**: Automated relayer ensures atomicity

## 🎉 Success Stories

- ✅ **SwapId Implementation**: Resolved hashlock vs SwapId mismatch
- ✅ **Real Transactions**: Successfully tested on Sepolia and Stellar testnets
- ✅ **Complete Flow**: End-to-end EVM ↔ Stellar swaps working
- ✅ **Production Ready**: Ready for mainnet deployment

The system ensures secure, trustless cross-chain swaps with automatic fallback mechanisms and is fully operational for production use. 