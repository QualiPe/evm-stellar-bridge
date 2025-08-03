import type { Intent } from '../types/intent';
import { cfg } from '../config';

const EXPLORER = cfg.evm.chainId === 1 ? 'https://etherscan.io/tx/' : 'https://sepolia.etherscan.io/tx/';

const STEP_LABELS = {
  created: 'Quote ready',
  evm_locked: 'USDC locked on Ethereum',
  stellar_locked: 'USDC locked on Stellar',
  settled: 'Swap settled',
  refunded: 'Refunded',
  error: 'Error',
};

type Props = { intent: Intent };

export default function Steps({ intent }: Props) {
  const { status, tx } = intent;

  const direction = intent.request.direction;
  const steps: Array<{ key: string; label: string; done: boolean; link?: string }> = [];

  // base sequence
  steps.push({ key: 'created', label: STEP_LABELS.created, done: true });

  if (direction === 'EVM_TO_STELLAR') {
    steps.push({
      key: 'evm_locked',
      label: STEP_LABELS.evm_locked,
      done: status !== 'created',
      link: tx?.evmLock ? EXPLORER + tx.evmLock : undefined,
    });
  } else {
    steps.push({
      key: 'stellar_locked',
      label: STEP_LABELS.stellar_locked,
      done: status !== 'created',
    });
  }

  steps.push({
    key: 'settled',
    label: STEP_LABELS.settled,
    done: status === 'settled',
  });

  if (status === 'refunded') {
    steps.push({ key: 'refunded', label: STEP_LABELS.refunded, done: true });
  }
  if (status === 'error') {
    steps.push({ key: 'error', label: STEP_LABELS.error, done: true });
  }

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0', display: 'flex', gap: 8 }}>
      {steps.map((s, i) => (
        <li key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: s.done ? '#16a34a' : '#d1d5db',
              display: 'inline-block',
            }}
          />
          {s.link ? (
            <a href={s.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
              {s.label}
            </a>
          ) : (
            <span style={{ fontSize: 12 }}>{s.label}</span>
          )}
          {i < steps.length - 1 && <span style={{ width: 20, height: 1, background: '#d1d5db' }} />}
        </li>
      ))}
    </ol>
  );
}
