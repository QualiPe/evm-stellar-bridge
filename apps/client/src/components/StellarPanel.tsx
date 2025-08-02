import { useState } from 'react';
import * as FreighterNS from '@stellar/freighter-api';
import { useApp } from '../state/appStore';
import { cfg } from '../config';

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

export default function StellarPanel() {
  const [addr, setAddr] = useState<string>();
  const [walletNet, setWalletNet] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [error, setError] = useState<string>();
  const setStellarAddress = useApp((s) => s.setStellarAddress);
  const expected = normalizeNet(cfg.stellar.network);

  async function connect() {
    setError(undefined);
    setWarning(undefined);

    try {
      const provider = !!api && (typeof api === 'object');
      if (!provider) throw new Error('Freighter provider not found on window.');

      const ask = api.requestAccess ?? api.setAllowed;
      await ask?.();

      let pub: string | undefined;

      // v6+: getUserInfo() → { address?/publicKey? }
      try {
        const info = await api.getUserInfo?.();
        if (info && typeof info === 'object') {
          pub = info.address || info.publicKey;
        }
      } catch {}

      // getPublicKey()
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
  }

  return (
    <div>
      <h2 className="ll-panel-title" style={{ marginTop: 0 }}>Stellar</h2>

      {!addr ? (
        <>
          <button className="btn" onClick={connect}>Connect Freighter</button>
          {warning && <div className="ll-muted" style={{ color: '#b45309', marginTop: 8 }}>{warning}</div>}
          {error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{error}</div>}
          {!error && !warning && (
            <div className="ll-muted" style={{ marginTop: 8 }}>
              Expected network: <b>{expected}</b>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="ll-muted" style={{ wordBreak: 'break-all' }}>Connected: {addr}</div>
          <div className="ll-muted" style={{ marginTop: 4 }}>Network: {walletNet || expected}</div>
          {warning && <div className="ll-muted" style={{ color: '#b45309', marginTop: 8 }}>{warning}</div>}
          <button className="btn" style={{ marginTop: 8 }} onClick={disconnect}>Disconnect</button>
        </>
      )}
    </div>
  );
}