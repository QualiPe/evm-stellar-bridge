import QueryProvider from './providers/QueryProvider';
import WagmiProvider from './providers/WagmiProvider';
import Bridge from './pages/Bridge';

export default function App() {
  return (
    <QueryProvider>
      <WagmiProvider>
        <Bridge />
      </WagmiProvider>
    </QueryProvider>
  );
}