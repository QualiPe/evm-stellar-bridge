import { useMemo, useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useApp } from '../state/appStore';
import { useCreateIntent, useIntent, usePatchIntent } from '../hooks/useIntent';
import { useEvm } from '../hooks/useEvm';

import Steps from './Steps';
import type { AmountMode, Direction, CreateIntentInput, Intent } from '../types/intent';
import { cfg } from '../config';
import { formatUnits } from '../utils/units';
import { EVM_TOKENS, STELLAR_TOKENS, getTokenName } from '../tokens';

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>{title}</h3>
      {children}
    </div>
  );
}

function TokenInput({ value, onChange, disabled = false }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        background: disabled ? '#f3f4f6' : '#fff',
        fontSize: '14px',
      }}
    />
  );
}

function TokenSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: {id: string, name: string}[] }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#fff',
                fontSize: '14px',
                appearance: 'none'
            }}
        >
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
    )
}


export default function PlanPanel() {
  const { address: evmWalletAddress, isConnected, chainId } = useAccount();
  const {
    direction,
    setDirection,
    amountOut,
    setAmountOut,
    stellarAddress,
    intentId,
    intent,
    setIntent,
  } = useApp();

  const [mode, setMode] = useState<AmountMode>('EXACT_OUT');
  
  const fromTokens = direction === 'EVM_TO_STELLAR' ? EVM_TOKENS : STELLAR_TOKENS;
  const toTokens = direction === 'EVM_TO_STELLAR' ? STELLAR_TOKENS : EVM_TOKENS;

  const [fromToken, setFromToken] = useState<string>(fromTokens[0].id);
  const [toToken, setToToken] = useState<string>(toTokens[0].id);

  useEffect(() => {
    setFromToken(fromTokens[0].id);
    setToToken(toTokens[0].id);
  }, [direction]);

  const create = useCreateIntent();
  const patch = usePatchIntent(intent?.id);

  const { data: polledIntent } = useIntent(intentId);
  useEffect(() => {
    if (polledIntent) setIntent(polledIntent);
  }, [polledIntent, setIntent]);

  const toAddress = useMemo(
    () => (direction === 'EVM_TO_STELLAR' ? (stellarAddress || '') : (evmWalletAddress || '')),
    [direction, evmWalletAddress, stellarAddress]
  );

  // Lock logic states
  const { lockUsdcOnEvm } = useEvm();
  const [locking, setLocking] = useState(false);
  const [balanceOk, setBalanceOk] = useState(true);
  const [checkingBal, setCheckingBal] = useState(false);
  const publicClient = usePublicClient();
  const correctChain = chainId === cfg.evm.chainId;

  // Check USDC balance
  useEffect(() => {
    let live = true;
    async function check() {
      if (!evmWalletAddress || !intent || !publicClient || direction !== 'EVM_TO_STELLAR') return;
      setCheckingBal(true);
      try {
        const bal = (await publicClient.readContract({
          address: cfg.evm.usdc as `0x${string}`,
          abi: (await import('viem')).erc20Abi,
          functionName: 'balanceOf',
          args: [evmWalletAddress],
        })) as bigint;
        const need = BigInt(Math.ceil(parseFloat(intent.plan.minLock.evm) * 10 ** 6));
        if (live) setBalanceOk(bal >= need);
      } catch {
        if (live) setBalanceOk(true); // default to true to avoid blocking UI on error
      } finally {
        if (live) setCheckingBal(false);
      }
    }
    if (intent) check();
    return () => {
      live = false;
    };
  }, [evmWalletAddress, intent, publicClient, direction]);


  async function onLockEvm() {
    if (!intent) return;
    try {
      setLocking(true);
      const { lockHash, swapId } = await lockUsdcOnEvm(intent);
      patch.mutate({
        status: 'evm_locked',
        tx: { evmLock: lockHash, evmSwapId: swapId ?? '' },
      });
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setLocking(false);
    }
  }


  function swapDirection() {
    const next: Direction = direction === 'EVM_TO_STELLAR' ? 'STELLAR_TO_EVM' : 'EVM_TO_STELLAR';
    setDirection(next);
  }

  function onGetQuote() {
    const body: CreateIntentInput = {
      direction,
      mode,
      fromChainId: direction === 'EVM_TO_STELLAR' ? cfg.evm.chainId : undefined,
      fromToken,
      toToken,
      toAddress,
      ...(mode === 'EXACT_OUT' ? { amountOut } : { amountIn: amountOut }),
    };
    create.mutate(body, { onSuccess: (res: Intent) => setIntent(res) });
  }

  function pretty(h?: string | null, maxDp = 6) {
    if (!h) return '—';
    if (!h.includes('.')) return h;
    const [i, f] = h.split('.');
    const trimmed = f.replace(/0+$/, '').slice(0, maxDp);
    return trimmed ? `${i}.${trimmed}` : i;
  }

  const quoteReceived = !!intent;
  const showEvmLockButton = quoteReceived && direction === 'EVM_TO_STELLAR' && intent.status === 'created';
  const evmLockDisabled = locking || !correctChain || checkingBal || !balanceOk || !isConnected;

  return (
    <div>
      <h2 className="ll-panel-title" style={{ marginTop: 0 }}>
        Create a Swap
      </h2>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <PanelSection title="Direction">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={swapDirection} style={{ flex: 1 }}>
              {direction === 'EVM_TO_STELLAR' ? 'EVM → Stellar' : 'Stellar → EVM'}
            </button>
            <select
              className="btn"
              value={mode}
              onChange={(e) => setMode(e.target.value as AmountMode)}
              style={{ flex: 1 }}
            >
              <option value="EXACT_OUT">Exact Out</option>
              <option value="EXACT_IN">Exact In</option>
            </select>
          </div>
        </PanelSection>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: '8px', alignItems: 'center' }}>
          <PanelSection title="From Token">
            <TokenSelect value={fromToken} onChange={setFromToken} options={fromTokens}/>
          </PanelSection>
          <div style={{ textAlign: 'center', paddingTop: '24px' }}>→</div>
          <PanelSection title="To Token">
            <TokenSelect value={toToken} onChange={setToToken} options={toTokens}/>
          </PanelSection>
        </div>

        <PanelSection title={mode === 'EXACT_OUT' ? 'Desired Output Amount' : 'Input Amount'}>
          <TokenInput
            value={amountOut}
            onChange={setAmountOut}
          />
        </PanelSection>
        
        <PanelSection title="Recipient Address">
          <TokenInput value={toAddress} onChange={() => {}} disabled />
        </PanelSection>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn"
            onClick={onGetQuote}
            disabled={create.isPending || !toAddress}
            title={!toAddress ? 'Connect destination wallet first' : ''}
            style={{ 
                width: '100%', 
                padding: '12px',
                background: quoteReceived ? '#10b981' : undefined,
                borderColor: quoteReceived ? '#10b981' : undefined
            }}
          >
            {create.isPending ? 'Getting Quote…' : (quoteReceived ? '✓ Quote Received' : 'Get Quote')}
          </button>

          {showEvmLockButton && (
            <>
                {!correctChain && <div className="ll-muted" style={{ color: '#b45309', textAlign: 'center' }}>Wrong network</div>}
                {!balanceOk && !checkingBal && <div className="ll-muted" style={{ color: '#b45309', textAlign: 'center' }}>Insufficient USDC balance</div>}
                {checkingBal && <div className="ll-muted" style={{ textAlign: 'center' }}>Checking balance…</div>}
                <button
                    className="btn"
                    onClick={onLockEvm}
                    disabled={evmLockDisabled}
                    style={{ width: '100%', padding: '12px' }}
                >
                    {locking ? 'Locking USDC…' : 'Lock USDC on Ethereum'}
                </button>
            </>
          )}
        </div>
      </div>

      {/* Result — plan */}
      {intent && (
        <div style={{ marginTop: '24px', background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            Quote details
          </h3>
          <div style={{ fontSize: '12px', color: '#6b7280', wordBreak: 'break-all', marginBottom: '12px' }}>
            Intent ID: {intent.id}
          </div>
          <QuoteDetails intent={intent} pretty={pretty} />
          <Steps intent={intent} />
        </div>
      )}

      {create.isError && (
        <div style={{ color: '#ef4444', marginTop: '12px', fontWeight: 500 }}>
          {(create.error as Error).message}
        </div>
      )}
    </div>
  );
}

// ... QuoteDetails component remains the same
function QuoteDetails({ intent, pretty }: { intent: Intent; pretty: (s?: string | null, dp?: number) => string }) {
  const sum = intent.plan.summary;
  const mode = sum?.mode ?? intent.plan.mode;

  let youPayHuman: string | undefined;
  if (mode === 'EXACT_OUT') {
    youPayHuman = intent.plan.amountInEstimated || sum?.src.amountHuman;
  } else {
    youPayHuman = intent.request.amountIn || sum?.src.amountHuman;
  }

  let bridgeEvm = sum?.bridge.evmUSDC.human;
  let bridgeStellar = sum?.bridge.stellarUSDC.human;

  if (!bridgeEvm && intent.plan.evmLeg?.toAmountMinor) {
    try {
      bridgeEvm = formatUnits(BigInt(intent.plan.evmLeg.toAmountMinor), 6);
    } catch {}
  }
  if (!bridgeStellar && bridgeEvm) bridgeStellar = bridgeEvm;

  let youReceiveHuman: string | undefined;
  if (mode === 'EXACT_OUT') {
    youReceiveHuman = sum?.dst.amountHuman || intent.request.amountOut;
  } else {
    youReceiveHuman = sum?.dst.amountHuman || intent.plan.stellarLeg?.destAmount || intent.request.amountOut;
  }

  const srcToken = getTokenName(sum?.src.token ?? intent.request.fromToken);
  const dstToken = getTokenName(sum?.dst.token ?? intent.request.toToken);

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ marginBottom: '16px' }}>
      <DetailRow label={`You pay (${srcToken})`} value={pretty(youPayHuman)} />
      <DetailRow label="Bridged (USDC)" value={`${pretty(bridgeEvm)} → ${pretty(bridgeStellar)}`} />
      <DetailRow label={`You receive (${dstToken})`} value={pretty(youReceiveHuman)} />

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
        <div>Hash: <span style={{ fontFamily: 'monospace' }}>{intent.plan.hash}</span></div>
        <div>
          Timelocks: ETH {intent.plan.timelocks.ethSec}s · STELLAR {intent.plan.timelocks.stellarSec}s
        </div>
        {sum?.quoteTtlSec != null && (
          <div>
            Quote TTL: {sum.quoteTtlSec}s
          </div>
        )}
      </div>
    </div>
  );
}
