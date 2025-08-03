import { useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { useApp } from '../state/appStore';
import { cfg } from '../config';
import { formatUnits } from 'viem';

function BalanceRow({ label, value, symbol }: { label: string; value?: bigint; symbol: string }) {
    const formatted = value != null ? parseFloat(formatUnits(value, 18)).toFixed(4) : '...';
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span>{label}</span>
            <span style={{ fontWeight: 500 }}>{formatted} {symbol}</span>
        </div>
    )
}

export default function EvmPanel() {
  const { address, isConnected, chainId, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const setEvmAddress = useApp((s) => s.setEvmAddress);

  const { data: ethBalance } = useBalance({ address });
  const { data: usdcBalance } = useBalance({ address, token: cfg.evm.usdc });
  const { data: wethBalance } = useBalance({ address, token: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2' });

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
            <div>
                <div className="ll-muted" style={{ wordBreak: 'break-all', marginBottom: '4px' }}>
                    {address}
                </div>
                <div className="ll-muted">
                    Network: {chain?.name ?? chainId}
                </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <BalanceRow label="ETH" value={ethBalance?.value} symbol="ETH" />
                <BalanceRow label="USDC" value={usdcBalance?.value} symbol="USDC" />
                <BalanceRow label="WETH" value={wethBalance?.value} symbol="WETH" />
            </div>

          {!correctChain && (
            <div className="ll-muted" style={{ color: '#b45309' }}>
              Wrong network. Please switch to the correct one.
            </div>
          )}

          <button className="btn btn-danger" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
