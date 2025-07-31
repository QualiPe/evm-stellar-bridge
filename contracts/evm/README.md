# Multi HTLC for USDC

Multi-swap Hash Time-Locked Contract for atomic swaps with USDC on Ethereum. Supports multiple concurrent HTLC swaps with unique swap IDs.

## 🚀 Quick Start

```bash
# Install
npm install

# Deploy to Sepolia
npm run deploy:sepolia

# Test
npm test
```

## 📊 Deployment

- **Contract:** `MultiHtlcUSDC`
- **Network:** Sepolia Testnet
- **USDC:** Mock USDC for testing

## 📖 Usage

```javascript
// Fund new HTLC swap
const swapId = await multiHtlc.fund(recipient, amount, hashlock, timelock);

// Withdraw using preimage
await multiHtlc.withdraw(swapId, preimage);

// Refund after timelock expires
await multiHtlc.refund(swapId);

// Get swap details
const details = await multiHtlc.getSwapDetails(swapId);
```

## 🔧 Key Features

- **Multiple Swaps**: Support for concurrent HTLC swaps
- **Unique IDs**: Each swap has a unique `swapId`
- **State Tracking**: Track funded, withdrawn, and refunded states
- **Expiration Check**: Verify if swaps are expired
- **Balance Management**: Monitor contract USDC balance

## 🧪 Testing

```bash
npm test
```

Tests cover: multi-swap funding, withdrawal, refund, and state management. 