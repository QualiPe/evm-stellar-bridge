export type Direction = 'EVM_TO_STELLAR' | 'STELLAR_TO_EVM';

export type AmountMode = 'EXACT_IN' | 'EXACT_OUT';

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
  direction: Direction;
  fromChainId?: number;
  fromToken: string;
  toToken: string;
  amountIn?: string;    // required when mode !== 'EXACT_OUT'
  amountOut?: string;   // required when mode === 'EXACT_OUT'
  mode?: AmountMode;    // default: 'EXACT_IN'
  toAddress: string;
}

export interface LegEvm {
  via: '1inch';
  from: string;
  to: string;
  toAmountMinor?: string;
  /** convenience human amount for UI */
  toAmount?: string;
  raw?: any;
}

export interface LegStellar {
  via: 'strict-send' | 'strict-receive';
  /** strict-send: destination amount (human) */
  destAmount?: string;
  /** strict-receive: required source amount (human) */
  sourceAmount?: string;
  path?: any[];
  raw?: any;
}

export interface IntentPlan {
  hash: `0x${string}`;
  timelocks: { ethSec: number; stellarSec: number };
  /** Always USDC (human) on both legs — what will be actually locked in HTLCs */
  minLock: { evm: string; stellar: string };
  evmLeg?: LegEvm;
  stellarLeg?: LegStellar;

  /** Optional helpers for UI / EXACT_OUT */
  mode?: AmountMode;
  amountOut?: string;          // desired output (human) when mode = EXACT_OUT
  amountInEstimated?: string;  // estimated input (human) when mode = EXACT_OUT

  /** Compact summary for UI to avoid client-side recalcs */
  summary?: {
    mode: AmountMode;
    src: { chain: 'EVM' | 'Stellar'; token: string; decimals: number; amountHuman: string };
    bridge: {
      evmUSDC: { human: string; minor?: string; decimals: number };
      stellarUSDC: { human: string; decimals: number };
    };
    dst: { chain: 'EVM' | 'Stellar'; token: string; decimals: number; amountHuman: string };
    quoteTtlSec: number;
  };
}

export interface Intent {
  id: string;
  status: IntentStatus;
  plan: IntentPlan;
  tx?: Record<string, string>;
  /** Echo of the original user request for relayer/UI */
  request: IntentRequestEcho;
}

/** Echo of user input stored with the intent (without preimage) */
export interface IntentRequestEcho {
  direction: Direction;
  mode: AmountMode;
  fromChainId?: number;
  fromToken: string;
  toToken: string;
  toAddress: string;
  amountIn?: string;
  amountOut?: string;
  createdAt: string; // ISO timestamp
}