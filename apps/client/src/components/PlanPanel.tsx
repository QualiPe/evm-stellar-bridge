import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../state/appStore';
import { useCreateIntent, useIntent } from '../hooks/useIntent';
import Steps from './Steps';
import type { AmountMode, Direction, CreateIntentInput, Intent } from '../types/intent';
import { cfg } from '../config';
import { formatUnits } from '../utils/units';

const WETH_MAINNET = '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2';

// New sub-components for better structure and styling
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

export default function PlanPanel() {
  const {
    direction,
    setDirection,
    amountOut,
    setAmountOut,
    evmAddress,
    stellarAddress,
    intentId,
    intent,
    setIntent,
  } = useApp();

  const [mode, setMode] = useState<AmountMode>('EXACT_OUT');
  const [fromToken, setFromToken] = useState<string>(() =>
    direction === 'EVM_TO_STELLAR' ? WETH_MAINNET : 'XLM'
  );
  const [toToken, setToToken] = useState<string>(() =>
    direction === 'EVM_TO_STELLAR' ? 'XLM' : WETH_MAINNET
  );

  const create = useCreateIntent();

  const { data: polledIntent } = useIntent(intentId);
  useEffect(() => {
    if (polledIntent) setIntent(polledIntent);
  }, [polledIntent, setIntent]);

  const toAddress = useMemo(
    () => (direction === 'EVM_TO_STELLAR' ? (stellarAddress || '') : (evmAddress || '')),
    [direction, evmAddress, stellarAddress]
  );

  function swapDirection() {
    const next: Direction = direction === 'EVM_TO_STELLAR' ? 'STELLAR_TO_EVM' : 'EVM_TO_STELLAR';
    setDirection(next);
    setFromToken(next === 'EVM_TO_STELLAR' ? WETH_MAINNET : 'XLM');
    setToToken(next === 'EVM_TO_STELLAR' ? 'XLM' : WETH_MAINNET);
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
            <TokenInput value={fromToken} onChange={setFromToken} />
          </PanelSection>
          <div style={{ textAlign: 'center', paddingTop: '24px' }}>→</div>
          <PanelSection title="To Token">
            <TokenInput value={toToken} onChange={setToToken} />
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

        <div>
          <button
            className="btn"
            onClick={onGetQuote}
            disabled={create.isPending || !toAddress}
            title={!toAddress ? 'Connect destination wallet first' : ''}
            style={{ width: '100%', padding: '12px' }}
          >
            {create.isPending ? 'Getting Quote…' : 'Get Quote'}
          </button>
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

// Extracted Quote Details to a new component
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

  const srcToken = sum?.src.token ?? intent.request.fromToken;
  const dstToken = sum?.dst.token ?? intent.request.toToken;

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
