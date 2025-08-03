import { cfg } from './config';

export interface Token {
  id: string; // address or asset code in format CODE:ISSUER
  name: string;
}

export const EVM_TOKENS: Token[] = [
  { id: '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2', name: 'WETH' },
  { id: cfg.evm.usdc, name: 'USDC' },
];

export const STELLAR_TOKENS: Token[] = [
  { id: 'XLM', name: 'XLM' },
  { id: `USDC:${cfg.stellar.usdcIssuer}`, name: 'USDC' },
];

const ALL_TOKENS = [...EVM_TOKENS, ...STELLAR_TOKENS];

export function getTokenName(id: string): string {
  if (!id) return '';
  const token = ALL_TOKENS.find((t) => t.id.toLowerCase() === id.toLowerCase());
  return token?.name || id;
}
