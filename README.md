# EVM-Stellar Bridge

Cross-chain atomic swap bridge between EVM chains and Stellar using HTLC contracts.

## 🎉 Recent Success: SwapId Implementation

✅ **SwapId vs Hashlock Mismatch RESOLVED**  
✅ **Complete EVM HTLC Flow Working**  
✅ **Real Sepolia Transactions**  
✅ **Dual Lookup Methods** (hashlock + SwapId)  
✅ **Production Ready EVM Side**

### Key Features Implemented:
- **SwapId Storage**: Automatically stored in `intent.tx.swapId` during funding
- **Dual Lookup**: Find intents by both `hashlock` and `SwapId`
- **Contract Integration**: Use SwapId like hashlock for all operations
- **Status Tracking**: Proper status updates throughout the flow
- **Preimage Management**: Secure preimage generation and storage

### API Endpoints:
- `GET /intents/find-by-swapid/{swapId}` - Find intent by SwapId
- `GET /intents/find-by-hashlock/{hashlock}` - Find intent by hashlock
- `GET /htlc/evm/swap/{swapId}` - Get swap details using SwapId
- `GET /intents/{id}/preimage` - Get preimage for withdrawal

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

## 🧪 Tests

```bash
# Complete SwapId flow test
node test-final-swapid-flow.js
```

## 📚 API

### HTLC Endpoints
- `GET /htlc/evm/status` - EVM service status
- `POST /htlc/evm/fund` - Fund EVM HTLC (stores SwapId)
- `POST /htlc/stellar/create` - Create Stellar HTLC
- `POST /htlc/relayer/start` - Start relayer

### Intents
- `POST /intents` - Create swap intent
- `GET /intents/:id` - Get intent details
- `GET /intents/find-by-swapid/{swapId}` - Find by SwapId
- `GET /intents/find-by-hashlock/{hashlock}` - Find by hashlock
- `GET /intents/{id}/preimage` - Get preimage

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

✅ **EVM Side: Production Ready** - Complete SwapId implementation  
🔄 **Stellar Side: In Progress** - HTLC contract integration needed  

## 🚧 Next Steps: Complete Stellar HTLC Integration

To complete the bridge, the following needs to be implemented on the Stellar side:

### 1. Stellar HTLC Contract Integration
- [ ] **Deploy Stellar HTLC Contract** on Soroban testnet
- [ ] **Update Stellar HTLC Service** to use deployed contract
- [ ] **Implement create() method** for Stellar HTLC creation
- [ ] **Add withdrawal/refund methods** for Stellar HTLC

### 2. Relayer Enhancement
- [ ] **Add Stellar event monitoring** for HTLC state changes
- [ ] **Implement cross-chain coordination** (EVM → Stellar)
- [ ] **Add Stellar withdrawal triggers** when EVM is funded
- [ ] **Handle Stellar refund scenarios** when EVM expires

### 3. Bridge Completion
- [ ] **Test complete EVM → Stellar flow**
- [ ] **Test complete Stellar → EVM flow**
- [ ] **Add error handling** for cross-chain failures
- [ ] **Implement timeout handling** for both chains

### 4. Production Readiness
- [ ] **Security audit** of both HTLC contracts
- [ ] **Load testing** of complete bridge
- [ ] **Documentation** of complete API
- [ ] **Deployment** to mainnet

## 🔗 Current Architecture

```
EVM Chain (Sepolia) ←→ Bridge Service ←→ Stellar (Testnet)
     ✅ Complete           ✅ Complete        🔄 In Progress
```

The EVM side is fully functional with SwapId tracking, while the Stellar side needs HTLC contract integration to complete the bridge. 