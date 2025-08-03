import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { WagmiConfig, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { cfg } from './config';

const chain = cfg.evm.chainId === 1 ? mainnet : sepolia;

const wagmiConfig = createConfig({
  chains: [chain],
  transports: {
    1: http(),
    11155111: http()
  },
  connectors: [injected()],
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiConfig config={wagmiConfig}>
      <App />
    </WagmiConfig>
  </React.StrictMode>
);