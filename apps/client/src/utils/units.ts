export const POW10 = (n: number) => 10n ** BigInt(n);

/**
 * "42.503605" + 6 -> 42503605n
 * Why: prepare value for contracts/tx (USDC = 6 decimals).
 */
export function parseUnits(human: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(human)) {
    throw new Error(`Invalid number: ${human}`);
  }
  const [i, f = ''] = human.split('.');
  const frac = (f + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(i) * POW10(decimals) + BigInt(frac || '0');
}

/**
 * 42503605n + 6 -> "42.503605"
 * Why: show human-value from on-chain number to user.
 */
export function formatUnits(minor: bigint, decimals: number): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const s = abs.toString().padStart(decimals + 1, '0');
  const i = s.slice(0, -decimals);
  const f = s.slice(-decimals).replace(/0+$/, '');
  const out = f ? `${i}.${f}` : i;
  return negative ? `-${out}` : out;
}

/** Safe integer (a*b)/den — Why: prices/coefficients in fixed precision. */
export function mulDiv(a: bigint, b: bigint, den: bigint): bigint {
  return (a * b) / den;
}

/** Ceiling — Why: «how much minimum to deposit», to guarantee EXACT_OUT. */
export function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}