export const USDC_EVM_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

export type StellarAsset = { code: string; issuer?: string };
export function parseStellarAsset(s: string): StellarAsset {
  if (s === 'XLM') return { code: 'XLM' };
  const [code, issuer] = s.split(':');
  return { code, issuer };
}