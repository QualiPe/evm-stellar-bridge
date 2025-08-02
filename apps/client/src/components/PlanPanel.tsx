import { useMemo, useState } from 'react';
import { useApp } from '../state/appStore';
import { useCreateIntent } from '../hooks/useIntent';
import type { AmountMode, Direction, CreateIntentInput, Intent } from '../types/intent';
import { cfg } from '../config';
import { formatUnits } from '../utils/units';

const WETH_MAINNET = '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2';

export default function PlanPanel() {
  const {
    direction,
    setDirection,
    amountOut,
    setAmountOut,
    evmAddress,
    stellarAddress,
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
      <h2 className="ll-panel-title" style={{ marginTop: 0 }}>Plan</h2>

      {/* Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button className="btn" onClick={swapDirection}>
              {direction === 'EVM_TO_STELLAR' ? 'EVM → Stellar' : 'Stellar → EVM'}
            </button>
            <select
              className="btn"
              value={mode}
              onChange={(e) => setMode(e.target.value as AmountMode)}
            >
              <option value="EXACT_OUT">EXACT_OUT</option>
              <option value="EXACT_IN">EXACT_IN</option>
            </select>
            {cfg.flags.directUsdcMode && (
              <span className="ll-muted" style={{ paddingTop: 8 }}>
                <b>MVP:</b> only USDC lock is executed
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div className="ll-muted">From token</div>
              <input value={fromToken} onChange={(e) => setFromToken(e.target.value)} />
            </div>
            <div>
              <div className="ll-muted">To token</div>
              <input value={toToken} onChange={(e) => setToToken(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div className="ll-muted">
                {mode === 'EXACT_OUT' ? 'Desired output (human)' : 'Amount in (human)'}
              </div>
              <input
                value={amountOut}
                onChange={(e) => setAmountOut(e.target.value)}
                placeholder={mode === 'EXACT_OUT' ? 'e.g., 100' : 'e.g., 1.23'}
              />
            </div>
            <div>
              <div className="ll-muted">Recipient (auto)</div>
              <input value={toAddress} readOnly placeholder="Connect wallet to autofill" />
            </div>
          </div>
        </div>

        <div>
          <button
            className="btn"
            onClick={onGetQuote}
            disabled={create.isPending || !toAddress}
            title={!toAddress ? 'Connect destination wallet first' : ''}
          >
            {create.isPending ? 'Quoting…' : 'Get quote'}
          </button>
        </div>
      </div>

      {/* Result — plan */}
      {intent && (
        <div style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 8 }}>
            {(() => {
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
                youReceiveHuman = sum?.dst.amountHuman
                || intent.plan.stellarLeg?.destAmount
                || intent.request.amountOut;
            }

            const srcToken = sum?.src.token ?? intent.request.fromToken;
            const dstToken = sum?.dst.token ?? intent.request.toToken;

            return (
                <div>
                <div className="ll-muted">Intent: {intent.id}</div>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {/* You pay */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><strong>You pay</strong> ({srcToken})</div>
                    <div>{pretty(youPayHuman)}</div>
                    </div>

                    {/* Bridged */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><strong>Bridged</strong> (USDC on EVM → Stellar)</div>
                    <div>
                        {pretty(bridgeEvm)} USDC → {pretty(bridgeStellar)} USDC
                    </div>
                    </div>

                    {/* You receive */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><strong>You receive</strong> ({dstToken})</div>
                    <div>{pretty(youReceiveHuman)}</div>
                    </div>
                </div>

                {/* Routes details */}
                <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                    <div>Hash: {intent.plan.hash}</div>
                    <div>
                    Timelocks: ETH {intent.plan.timelocks.ethSec}s · STELLAR {intent.plan.timelocks.stellarSec}s
                    </div>

                    <div style={{ marginTop: 8 }}>
                    <strong>Route</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {intent.plan.evmLeg && (
                        <li>
                            EVM leg: {intent.plan.evmLeg.from} → {intent.plan.evmLeg.to}
                            {' '} (via {intent.plan.evmLeg.via})
                        </li>
                        )}
                        {intent.plan.stellarLeg && (
                        <li>
                            Stellar leg: {intent.plan.stellarLeg.via}
                            {intent.plan.stellarLeg.path?.length
                            ? ` (path length ${intent.plan.stellarLeg.path.length})`
                            : ''}
                        </li>
                        )}
                    </ul>
                    </div>

                    {sum?.quoteTtlSec != null && (
                    <div className="ll-muted" style={{ marginTop: 6 }}>
                        Quote TTL: {sum.quoteTtlSec}s
                    </div>
                    )}
                </div>
                </div>
            );
            })()}
        </div>
        )}

      {create.isError && (
        <div style={{ color: '#b91c1c', marginTop: 8 }}>{(create.error as Error).message}</div>
      )}
    </div>
  );
}