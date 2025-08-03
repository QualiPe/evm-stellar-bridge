import { useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useApp } from '../state/appStore';
import { cfg } from '../config';

export default function EvmPanel() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const setEvmAddress = useApp((s) => s.setEvmAddress);

  useEffect(() => {
    setEvmAddress(address as `0x${string}` | undefined);
  }, [address, setEvmAddress]);

  const mmConnector = connectors.find((c) => c.id === 'injected') ?? connectors[0];
  const correctChain = chainId === cfg.evm.chainId;

  return (
    <div>
      <h2 className="ll-panel-title">EVM Wallet</h2>

      {!isConnected ? (
        <button className="btn" onClick={() => connect({ connector: mmConnector })} disabled={isPending}>
          {isPending ? 'Connecting…' : 'Connect Wallet'}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="ll-muted" style={{ wordBreak: 'break-all' }}>
            Connected: {address}
          </div>

          {!correctChain && (
            <div className="ll-muted" style={{ color: '#b45309' }}>
              Wrong network. Please switch to Sepolia.
            </div>
          )}

          <button className="btn" onClick={() => disconnect()} style={{ background: '#ef4444', borderColor: '#ef4444' }}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
