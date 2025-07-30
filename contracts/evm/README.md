# Ethereum HTLC for USDC

Hash Time-Locked Contract for atomic swaps with USDC on Ethereum.

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

- **Contract:** `0x6EC02E043543883903443F1afDa2c746C3bC07c1`
- **Network:** Sepolia Testnet
- **USDC:** `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

## 📖 Usage

```javascript
// Fund HTLC
await htlc.fund(recipient, amount, hashlock, timelock);

// Withdraw
await htlc.withdraw(preimage);

// Refund (after timelock)
await htlc.refund();
```

## 🔧 Functions

- `fund()` - Lock USDC in HTLC
- `withdraw()` - Claim with preimage
- `refund()` - Get funds back after timeout
- `getSwapDetails()` - View swap info

## 🧪 Testing

```bash
npm test
```

Tests cover: funding, withdrawal, refund scenarios. 