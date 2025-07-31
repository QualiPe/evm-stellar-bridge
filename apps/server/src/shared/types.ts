export type Direction = 'EVM_TO_STELLAR' | 'STELLAR_TO_EVM';

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
    fromChainId: number;
    fromToken: string;
    toToken: string;
    amountIn: string;
    toAddress: string;
}

export interface LegEvm {
    via: '1inch';
    from: string;
    to: string;
    toAmountMinor?: string;
    raw?: any;
}
  
export interface LegStellar {
    via: 'strict-send' | 'strict-receive';
    destAmount?: string;
    path?: any[];
    raw?: any;
}

export interface IntentPlan {
    hash: `0x${string}`;
    timelocks: { ethSec: number; stellarSec: number };
    minLock: { evm: string; stellar: string };
    evmLeg?: LegEvm;
    stellarLeg?: LegStellar;
}
  
export interface Intent {
    id: string;
    status: IntentStatus;
    plan: IntentPlan;
    tx?: Record<string, string>;
}