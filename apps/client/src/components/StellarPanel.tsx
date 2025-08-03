// apps/client/src/components/StellarPanel.tsx
import { useState, useEffect } from 'react';
import * as FreighterNS from '@stellar/freighter-api';
import { useApp } from '../state/appStore';
import { cfg } from '../config';
import * as StellarSdk from 'stellar-sdk';

const api: any = (window as any).freighterApi ?? (FreighterNS as any);

function normalizeNet(n?: string) {
  const v = String(n || '').toUpperCase();
  if (v === 'PUBLIC' || v === 'PUBNET') return 'PUBLIC';
  if (v === 'TEST' || v === 'TESTNET') return 'TESTNET';
  return v;
}

async function readFreighterNetwork(): Promise<string> {
  try {
    const raw = await api.getNetwork?.();
    if (typeof raw === 'string') return normalizeNet(raw);
    if (raw && typeof raw === 'object' && 'network' in raw) return normalizeNet(raw.network);
  } catch { /* ignore */ }
  return '';
}

function BalanceRow({ label, value, symbol }: { label: string; value?: string; symbol:string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span>{label}</span>
            <span style={{ fontWeight: 500 }}>{value != null ? `${parseFloat(value).toFixed(4)} ${symbol}`: '...'}</span>
        </div>
    )
}

export default function StellarPanel() {
  const [addr, setAddr] = useState<string>();
  const [walletNet, setWalletNet] = useState<string>();
  const [balances, setBalances] = useState<StellarSdk.ServerApi.AccountRecord>();
  const [warning, setWarning] = useState<string>();
  const [error, setError] = useState<string>();
  const setStellarAddress = useApp((s) => s.setStellarAddress);
  const expected = normalizeNet(cfg.stellar.network);

  useEffect(() => {
    if (!addr) return;
    const server = new StellarSdk.Horizon.Server(cfg.stellar.horizon);
    server.loadAccount(addr)
      .then(res => setBalances(res as unknown as StellarSdk.ServerApi.AccountRecord))
      .catch(e => console.error('Failed to load Stellar account', e));
  }, [addr]);

  async function connect() {
    setError(undefined);
    setWarning(undefined);

    try {
      const provider = !!api && (typeof api === 'object');
      if (!provider) throw new Error('Freighter provider not found on window.');

      const ask = api.requestAccess ?? api.setAllowed;
      await ask?.();

      let pub: string | undefined;

      try {
        const info = await api.getUserInfo?.();
        if (info && typeof info === 'object') {
          pub = info.address || info.publicKey;
        }
      } catch {}

      if (!pub && api.getPublicKey) {
        try {
          pub = await api.getPublicKey?.();
        } catch {}
      }

      if (!pub && api.getAddress) {
        try {
          const res = await api.getAddress?.();
          if (res && typeof res === 'object') {
            pub = res.address || res.publicKey;
          }
        } catch {}
      }

      if (!pub) {
        throw new Error(
          'Freighter did not return a public key. Make sure the extension is unlocked, an account is set as Active, and approve the permission popup.'
        );
      }

      setAddr(pub);
      setStellarAddress(pub);

      const net = await readFreighterNetwork();
      setWalletNet(net);
      if (net && net !== expected) {
        setWarning(`Freighter is on ${net}, but the app expects ${expected}. Switch network in Freighter.`);
      }
    } catch (e: any) {
      setError(e?.message || String(e) || 'Failed to connect Freighter');
    }
  }

  function disconnect() {
    setAddr(undefined);
    setWalletNet(undefined);
    setWarning(undefined);
    setError(undefined);
    setStellarAddress(undefined);
    setBalances(undefined);
  }
  
  const xlmBalance = balances?.balances.find(b => b.asset_type === 'native');
  const usdcBalance = balances?.balances.find(b => b.asset_type !== 'native' && b.asset_code === 'USDC' && b.asset_issuer === cfg.stellar.usdcIssuer);

  return (
    <div>
      <h2 className="ll-panel-title">Stellar Wallet</h2>

      {!addr ? (
        <>
          <button className="btn" onClick={connect}>Connect Freighter</button>
          {warning && <div className="ll-muted" style={{ color: '#b45309', marginTop: 8 }}>{warning}</div>}
          {error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{error}</div>}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div className="ll-muted" style={{ wordBreak: 'break-all', marginBottom: '4px' }}>{addr}</div>
            <div className="ll-muted">Network: {walletNet || expected}</div>
          </div>
          
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <BalanceRow label="XLM" value={xlmBalance?.balance} symbol="XLM" />
                <BalanceRow label="USDC" value={usdcBalance?.balance} symbol="USDC" />
            </div>

          {warning && <div className="ll-muted" style={{ color: '#b45309' }}>{warning}</div>}
          <button className="btn btn-danger" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
