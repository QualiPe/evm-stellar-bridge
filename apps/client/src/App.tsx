import QueryProvider from './providers/QueryProvider';
import WagmiProvider from './providers/WagmiProvider';

export default function App() {
  return (
    <QueryProvider>
      <WagmiProvider>
        <div style={{ padding: 16 }}>
          <h1>LumenLink</h1>
          <p>Core providers wired (React Query + Wagmi).</p>
        </div>
      </WagmiProvider>
    </QueryProvider>
  );
}