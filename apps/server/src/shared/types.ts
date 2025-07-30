export type IntentStatus =
  | 'created'
  | 'evm_locked'
  | 'stellar_locked'
  | 'withdrawn_stellar'
  | 'withdrawn_evm'
  | 'refunded'
  | 'settled'
  | 'error';

export interface CreateIntentInput {
  fromChainId: number;
  fromToken: string;
  toToken: string;
  amountIn: string;
  toAddress: string;
}

export interface IntentPlan {
  hash: `0x${string}`;
  timelocks: { ethSec: number; stellarSec: number };
  minLock: { evm: string; stellar: string };
  quote?: {
    chainId: number;
    fromToken: string;
    toToken: string;
    amountInMinor: string;
    toAmountMinor?: string;
  };
}

export interface Intent {
  id: string;
  status: IntentStatus;
  plan: IntentPlan;
  tx?: Record<string, string | undefined>;
}