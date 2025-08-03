import QueryProvider from './providers/QueryProvider';
import Bridge from './pages/Bridge';

export default function App() {
  return (
    <QueryProvider>
      <Bridge />
    </QueryProvider>
  );
}