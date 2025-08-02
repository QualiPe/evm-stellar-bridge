import { useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useApp } from '../state/appStore';

export default function EvmPanel() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const setEvmAddress = useApp((s) => s.setEvmAddress);

  useEffect(() => {
    setEvmAddress(address as any);
  }, [address, setEvmAddress]);

  const mmConnector = connectors.find((c) => c.id === 'injected') ?? connectors[0];

  return (
    <div>
      <h2 className="ll-panel-title" style={{ marginTop: 0 }}>Ethereum</h2>

      {!isConnected ? (
        <button className="btn" onClick={() => connect({ connector: mmConnector })} disabled={isPending}>
          {isPending ? 'Connecting…' : 'Connect Wallet'}
        </button>
      ) : (
        <>
          <div className="ll-muted" style={{ wordBreak: 'break-all' }}>
            Connected: {address}
          </div>
          <button className="btn" style={{ marginTop: 8 }} onClick={() => disconnect()}>
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}