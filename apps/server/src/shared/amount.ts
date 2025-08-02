export function humanToMinor(amountHuman: string, decimals: number): string {
  const [a, b = ''] = amountHuman.split('.');
  const frac = (b + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt((a || '0') + frac).toString();
}

export function minorToHuman(minor: string, decimals: number): string {
  const s = BigInt(minor)
    .toString()
    .padStart(decimals + 1, '0');
  const i = s.slice(0, -decimals);
  let f = s.slice(-decimals);
  f = f.replace(/0+$/, '');
  return f ? `${i}.${f}` : i;
}

export function applyHaircutHuman(human: string, bps: number): string {
  const [I, F = ''] = human.split('.');
  const v = BigInt((I || '0') + F.padEnd(18, '0'));
  const cut = v - (v * BigInt(bps)) / BigInt(10_000);
  const s = cut.toString().padStart(19, '0');
  const i = s.slice(0, -18);
  const f = s.slice(-18).replace(/0+$/, '');
  return f ? `${i}.${f}` : i;
}

export function applyHaircutUpHuman(human: string, bps: number): string {
  const x = Number(human || '0');
  const res = (x * (10000 + (bps || 0))) / 10000;
  return res.toString();
}
