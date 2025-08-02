import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useApp } from '../state/appStore';
import { useEvm } from '../hooks/useEvm';
import { patchIntent } from '../services/intents';
import { cfg } from '../config';

export default function EvmPanel() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const setEvmAddress = useApp((s) => s.setEvmAddress);
  const { lockUsdcOnEvm } = useEvm();
  const { direction, intent, setIntent } = useApp();
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    setEvmAddress(address as any);
  }, [address, setEvmAddress]);

  const mmConnector = connectors.find((c) => c.id === 'injected') ?? connectors[0];

  async function onLock() {
    if (!intent) return;
    try {
      setLocking(true);
      const { lockHash, swapId } = await lockUsdcOnEvm(intent);
      const updated = await patchIntent(intent.id, {
        status: 'evm_locked',
        tx: { evmLock: lockHash, evmSwapId: swapId ?? '' },
      });
      setIntent(updated);
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setLocking(false);
    }
  }

  const showLock =
    isConnected &&
    cfg.flags.directUsdcMode &&
    direction === 'EVM_TO_STELLAR' &&
    !!intent;

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
          {showLock && (
            <button className="btn" style={{ marginTop: 8 }} onClick={onLock} disabled={locking}>
                {locking ? 'Locking USDC…' : 'Lock USDC on Ethereum'}
            </button>
          )}
          <button className="btn" style={{ marginTop: 8 }} onClick={() => disconnect()}>
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}