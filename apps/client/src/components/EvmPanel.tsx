import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, usePublicClient } from 'wagmi';
import { useApp } from '../state/appStore';
import { useEvm } from '../hooks/useEvm';
import { patchIntent } from '../services/intents';
import { cfg } from '../config';

export default function EvmPanel() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const setEvmAddress = useApp((s) => s.setEvmAddress);
  const { lockUsdcOnEvm } = useEvm();
  const { direction, intent, setIntent } = useApp();
  const [balanceOk, setBalanceOk] = useState(true);
  const [checkingBal, setCheckingBal] = useState(false);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    setEvmAddress(address as any);
  }, [address, setEvmAddress]);

  const mmConnector = connectors.find((c) => c.id === 'injected') ?? connectors[0];

  // check USDC balance
  const publicClient = usePublicClient();

  useEffect(() => {
    let live = true;
    async function check() {
      if (!address || !intent || !publicClient) return;
      setCheckingBal(true);
      try {
        const bal = (await publicClient.readContract({
          address: cfg.evm.usdc as `0x${string}`,
          abi: (await import('viem')).erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })) as bigint;
        const need = BigInt(Math.ceil(parseFloat(intent.plan.minLock.evm) * 10 ** 6));
        if (live) setBalanceOk(bal >= need);
      } catch {
        if (live) setBalanceOk(true);
      } finally {
        if (live) setCheckingBal(false);
      }
    }
    if (intent) check();
    return () => {
      live = false;
    };
  }, [address, intent]);

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

  const correctChain = chainId === cfg.evm.chainId;

  const showLock =
    isConnected &&
    cfg.flags.directUsdcMode &&
    direction === 'EVM_TO_STELLAR' &&
    !!intent;

  const lockDisabled =
    locking || !correctChain || checkingBal || !balanceOk;

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
            <>
              {!correctChain && (
                <div className="ll-muted" style={{ color: '#b45309', marginTop: 8 }}>Wrong network</div>
              )}
              {!balanceOk && !checkingBal && (
                <div className="ll-muted" style={{ color: '#b45309', marginTop: 8 }}>Insufficient USDC balance</div>
              )}
              {checkingBal && (
                <div className="ll-muted" style={{ marginTop: 8 }}>Checking balance…</div>
              )}
              <button className="btn" style={{ marginTop: 8 }} onClick={onLock} disabled={lockDisabled}>
                {locking ? 'Locking USDC…' : 'Lock USDC on Ethereum'}
              </button>
            </>
          )}
          <button className="btn" style={{ marginTop: 8 }} onClick={() => disconnect()}>
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}