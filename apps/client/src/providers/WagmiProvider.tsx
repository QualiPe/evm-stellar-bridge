import { WagmiConfig, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import type { PropsWithChildren } from 'react';
import { cfg } from '../config';

const chain = cfg.evm.chainId === 1 ? mainnet : sepolia;

const config = createConfig({
  chains: [chain],
  transports: { 
    [mainnet.id]: http(),
    [sepolia.id]: http()
  },
  connectors: [injected()],
});

export default function WagmiProvider({ children }: PropsWithChildren) {
  return <WagmiConfig config={config}>{children}</WagmiConfig>;
}