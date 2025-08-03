import { useMemo, useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useApp } from '../state/appStore';
import { useCreateIntent, useIntent, usePatchIntent } from '../hooks/useIntent';
import { useEvm } from '../hooks/useEvm';

import Steps from './Steps';
import type { AmountMode, Direction, CreateIntentInput, Intent } from '../types/intent';
import { cfg } from '../config';
import { formatUnits, parseUnits } from '../utils/units';
import { EVM_TOKENS, STELLAR_TOKENS, getTokenName, type Token } from '../tokens';

function AmountInput({
    value,
    onChange,
    token,
    label,
    placeholder,
    disabled = false
}: { value: string; onChange: (v: string) => void; token?: Token, label:string, placeholder:string, disabled?: boolean}) {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '14px', color: '#6b7280' }}>
                {label}
            </div>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '34px 12px 10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: disabled ? '#f3f4f6' : '#fff',
                    fontSize: '18px',
                    fontWeight: 500,
                    textAlign: 'left',
                }}
            />
            <div style={{ position: 'absolute', top: '22px', right: '12px', fontSize: '18px', fontWeight: 600 }}>
                {token?.name}
            </div>
        </div>
    )
}

function TokenSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: Token[], placeholder: string }) {
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
                appearance: 'none',
                color: value ? 'inherit' : '#6b7280'
            }}
        >
            <option value="" disabled>{placeholder}</option>
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
    )
}

// --- Main Component ---

export default function PlanPanel() {
  const { address: evmWalletAddress, isConnected, chainId } = useAccount();
  const {
    direction,
    setDirection,
    stellarAddress,
    intentId,
    intent,
    setIntent,
  } = useApp();

  // State for new amount inputs
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');

  const fromTokens = direction === 'EVM_TO_STELLAR' ? EVM_TOKENS : STELLAR_TOKENS;
  const toTokens = direction === 'EVM_TO_STELLAR' ? STELLAR_TOKENS : EVM_TOKENS;

  const [fromToken, setFromToken] = useState<string>('');
  const [toToken, setToToken] = useState<string>('');
  
  // When direction changes, update tokens
  useEffect(() => {
    setFromToken('');
    setToToken('');
    setAmountIn('');
    setAmountOut('');
        setIntent(undefined);
  }, [direction, setIntent]);
  
  const selectedFromToken = useMemo(() => fromTokens.find(t => t.id === fromToken), [fromTokens, fromToken]);
  const selectedToToken = useMemo(() => toTokens.find(t => t.id === toToken), [toTokens, toToken]);

  const create = useCreateIntent();
  const patch = usePatchIntent(intent?.id);

  const { data: polledIntent } = useIntent(intentId);
  useEffect(() => {
    if (polledIntent) setIntent(polledIntent);
  }, [polledIntent, setIntent]);

  // Auto-fill the other amount field after getting a quote
  useEffect(() => {
    if (!intent) return;
    const { plan } = intent;
    const mode = amountIn ? 'EXACT_IN' : 'EXACT_OUT';

    if (mode === 'EXACT_IN') {
        const received = plan.summary?.dst.amountHuman || plan.stellarLeg?.destAmount;
        if(received) setAmountOut(pretty(received, 4));
    } else {
        const estimated = plan.amountInEstimated || plan.summary?.src.amountHuman;
        if(estimated) setAmountIn(pretty(estimated, 6));
    }
  }, [intent])

  const toAddress = useMemo(
    () => (direction === 'EVM_TO_STELLAR' ? (stellarAddress || '') : (evmWalletAddress || '')),
    [direction, evmWalletAddress, stellarAddress]
  );

  const { lockUsdcOnEvm } = useEvm();
  const [locking, setLocking] = useState(false);
  const [balanceOk, setBalanceOk] = useState(true);
  const [checkingBal, setCheckingBal] = useState(false);
  const publicClient = usePublicClient();
  const correctChain = chainId === cfg.evm.chainId;

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
        const need = parseUnits(intent.plan.minLock.evm, 6);
        if (live) setBalanceOk(bal >= need);
      } catch {
        if (live) setBalanceOk(true);
      } finally {
        if (live) setCheckingBal(false);
      }
    }
    if (intent) check();
    return () => { live = false; };
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
    const mode: AmountMode = amountIn ? 'EXACT_IN' : 'EXACT_OUT';
    const body: CreateIntentInput = {
      direction,
      mode,
      fromChainId: direction === 'EVM_TO_STELLAR' ? cfg.evm.chainId : undefined,
      fromToken,
      toToken,
      toAddress,
      amountIn: amountIn || undefined,
      amountOut: amountOut || undefined,
    };
    create.mutate(body, { onSuccess: (res: Intent) => setIntent(res) });
  }

  function pretty(h?: string | null, maxDp = 6) {
    if (!h) return '';
    if (!h.includes('.')) return h;

    const [i, f] = h.split('.');
    // Trim trailing zeros and limit decimals
    const trimmedF = f.replace(/0+$/, '');
    if (!trimmedF) return i; // if no decimals left, return int part
    return `${i}.${trimmedF.slice(0, maxDp)}`;
  }

  const quoteReceived = !!intent;
  const showEvmLockButton = quoteReceived && direction === 'EVM_TO_STELLAR' && intent.status === 'created';
  const evmLockDisabled = locking || !correctChain || checkingBal || !balanceOk || !isConnected;

  return (
    <div>
        {intent && <Steps intent={intent} />}
      <h2 className="ll-panel-title" style={{ marginTop: intent ? '24px' : 0 }}>
        Create a Swap
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* New Direction Button */}
        <button
          className="btn"
          onClick={swapDirection}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px',
            fontSize: '16px',
            background: '#fff',
            color: '#111827',
            borderColor: '#d1d5db',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span style={{ fontWeight: 600 }}>{direction === 'EVM_TO_STELLAR' ? 'EVM' : 'Stellar'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>
          </svg>
          <span style={{ fontWeight: 600 }}>{direction === 'EVM_TO_STELLAR' ? 'Stellar' : 'EVM'}</span>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
            {/* From */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <TokenSelect value={fromToken} onChange={setFromToken} options={fromTokens} placeholder="Select token" />
                <AmountInput 
                    label="You send"
                    value={amountIn}
                    onChange={setAmountIn}
                    token={selectedFromToken}
                    disabled={!!amountOut || !fromToken || !toToken}
                    placeholder={!fromToken || !toToken ? "Select tokens first" : (!amountIn && !amountOut ? 'Enter amount' : 'Click "Get Quote" to calculate')}
                />
            </div>
            
            {/* To */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <TokenSelect value={toToken} onChange={setToToken} options={toTokens} placeholder="Select token" />
                <AmountInput 
                    label="You receive"
                    value={amountOut}
                    onChange={setAmountOut}
                    token={selectedToToken}
                    disabled={!!amountIn || !fromToken || !toToken}
                    placeholder={!fromToken || !toToken ? "Select tokens first" : (!amountIn && !amountOut ? 'Enter amount' : 'Click "Get Quote" to calculate')}
                />
            </div>
        </div>
        
        <AddressInfo
            direction={direction}
            evmWalletAddress={evmWalletAddress}
            stellarAddress={stellarAddress}
        />


        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn"
            onClick={onGetQuote}
            disabled={create.isPending || !toAddress || (!amountIn && !amountOut) || !fromToken || !toToken}
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

      {intent && (
        <div style={{ marginTop: '24px', background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            Quote details
          </h3>
          <div style={{ fontSize: '12px', color: '#6b7280', wordBreak: 'break-all', marginBottom: '12px' }}>
            Intent ID: {intent.id}
          </div>
          <QuoteDetails intent={intent} pretty={pretty} amountIn={amountIn} />
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

function AddressInfo({
    direction,
    evmWalletAddress,
    stellarAddress,
}: {
    direction: Direction;
    evmWalletAddress: string | undefined | null;
    stellarAddress: string | undefined | null;
}) {
    const fromAddress = direction === 'EVM_TO_STELLAR' ? evmWalletAddress : stellarAddress;
    const toAddress = direction === 'EVM_TO_STELLAR' ? stellarAddress : evmWalletAddress;

    const shortenAddress = (address: string | null | undefined) => {
        if (!address) return '...';
        if (address.length < 12) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const AddressCol = ({ label, address, align = 'left' }: { label: string; address: string | null | undefined, align?: 'left' | 'right' }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: align }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>{label}</span>
            <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '14px' }}>
                {shortenAddress(address)}
            </span>
        </div>
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f9fafb', padding: '12px', borderRadius: '12px' }}>
            <AddressCol label="From" address={fromAddress} />
            <AddressCol label="To" address={toAddress} align="right" />
        </div>
    );
}

// ... QuoteDetails remains the same
function QuoteDetails({ intent, pretty, amountIn }: { intent: Intent; pretty: (s?: string | null, dp?: number) => string; amountIn: string }) {
    const sum = intent.plan.summary;
    const mode = amountIn ? 'EXACT_IN' : 'EXACT_OUT';
  
    let youPayHuman: string | undefined;
    if (mode === 'EXACT_IN') {
      youPayHuman = intent.request.amountIn || sum?.src.amountHuman;
    } else {
        youPayHuman = intent.plan.amountInEstimated || sum?.src.amountHuman;
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

// We need a declaration for the new Token type, let's add it to tokens.ts
// Need to also read and update tokens.ts
