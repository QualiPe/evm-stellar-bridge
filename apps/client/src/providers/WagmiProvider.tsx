import { WagmiConfig, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import type { PropsWithChildren } from 'react';

const config = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
  connectors: [injected()],
});

export default function WagmiProvider({ children }: PropsWithChildren) {
  return <WagmiConfig config={config}>{children}</WagmiConfig>;
}