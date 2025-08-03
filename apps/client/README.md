# EVM ↔ Stellar Bridge — Client

> Minimal guide focused **only** on the React front-end. For the full project flow (server, contracts, etc.) see the root `README.md`.

---

## TL;DR

```bash
cd apps/client          # ↳ front-end workspace
pnpm i                  # install deps

cp .env.example .env    # copy env template
$EDITOR .env            # fill API base + chain addresses

pnpm run dev            # start Vite dev-server (HMR)
open http://localhost:5173
```

Within 5-10 minutes you should see the bridge form, enter params and hit **Get quote**. The browser dev-tools will show a request to `/intents`.

---

## 1. Prerequisites

| Requirement          | Version |
|----------------------|---------|
| Node.js              | ≥ 20    |
| pnpm                 | ≥ 8     |
| Browser wallet       | Freighter (Stellar) & Metamask/Rabby (EVM) |

---

## 2. Environment variables (`apps/client/.env`)

```
VITE_API_BASE=http://localhost:3000

# EVM
VITE_EVM_CHAIN_ID=11155111
VITE_EVM_USDC=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
VITE_EVM_HTLC=0x67F0B5e801442171b1F10721Ee3d1a30B2CA6d7E
VITE_EVM_COUNTERPARTY=0x

# STELLAR
VITE_STELLAR_HORIZON=https://horizon-testnet.stellar.org
VITE_STELLAR_NETWORK=TESTNET
VITE_SOROBAN_RPC=https://soroban-testnet.stellar.org
VITE_STELLAR_HTLC=CA2AWAFZCQJAVMKULIJ6FSGC2QCXLRZYJEWVNLNVH45NQ2FFQUSCUZR6
VITE_STELLAR_USDC=GBO4ZXQX2I52JGXCZX5XAZ3TCNUNV6IDPXSR4OYZAF4XJAUM3NH3QMDM
VITE_STELLAR_COUNTERPARTY=G

# Feature-flags
VITE_DIRECT_USDC_MODE=true      # disable swaps, USDC direct bridge only
VITE_SHOW_WIDGETS=true          # debug widgets (1inch, StellarX)
```

> Only variables in **UPPER_CASE** need to be adjusted.

---

## 3. Available scripts

| Command           | Description                      |
|-------------------|----------------------------------|
| `pnpm run dev`    | Launch dev-server with HMR       |
| `pnpm run build`  | Production build (dist)          |
| `pnpm run preview`| Preview the production build     |
| `pnpm run lint`   | ESLint                           |

---

## 4. Project layout (client)

```
src/
  assets/            # static icons / images
  components/        # dumb UI components
  hooks/             # reusable stateful hooks
  pages/             # routed pages (Bridge)
  providers/         # context providers (React Query)
  services/          # API wrappers
  state/             # Zustand store
  types/             # shared TS types
  utils/             # formatting helpers, units, …
```

---

## 5. Common issues

1. **CORS** — make sure the backend is running at `VITE_API_BASE` or configure a proxy in `vite.config.ts`.
2. **Wallet not detected** — refresh Freighter / Metamask or check that the network (chainId) matches `.env`.
3. **Quote returns error** — the backend requires a valid `ONEINCH_API_KEY`; see server README.

---

Happy hacking! 🎉
