// Token addresses by network
export const USDC_ADDRESSES = {
  mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
} as const;

export const USDC_EVM_MAINNET = USDC_ADDRESSES.mainnet; // Legacy support

export type StellarAsset = { code: string; issuer?: string };
export function parseStellarAsset(s: string): StellarAsset {
  if (s === 'XLM') return { code: 'XLM' };
  const [code, issuer] = s.split(':');
  return { code, issuer };
}
