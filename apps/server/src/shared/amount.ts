export function humanToMinor(amountHuman: string, decimals: number): string {
    const [a, b = ''] = amountHuman.split('.');
    const frac = (b + '0'.repeat(decimals)).slice(0, decimals);
    return BigInt((a || '0') + frac).toString();
}
  
export function minorToHuman(minor: string, decimals: number): string {
const s = BigInt(minor).toString().padStart(decimals + 1, '0');
const i = s.slice(0, -decimals);
let f = s.slice(-decimals);
f = f.replace(/0+$/, '');
return f ? `${i}.${f}` : i;
}