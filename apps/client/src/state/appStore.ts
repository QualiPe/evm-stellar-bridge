import { create } from 'zustand';
import type { Direction, Intent } from '../types/intent';

type AppState = {
  // addresses
  evmAddress?: `0x${string}`;
  stellarAddress?: string;

  // user choice
  direction: Direction;   // 'EVM_TO_STELLAR' | 'STELLAR_TO_EVM'
  amountOut: string;      // human-string for form (e.g. "100")

  // current intent
  intentId?: string;
  intent?: Intent;

  // flags from .env
  directUsdcMode: boolean;
  showWidgets: boolean;

  // actions
  setEvmAddress: (a?: `0x${string}`) => void;
  setStellarAddress: (a?: string) => void;
  setDirection: (d: Direction) => void;
  setAmountOut: (v: string) => void;
  setIntent: (i?: Intent) => void;
  setIntentId: (id?: string) => void;
};

export const useApp = create<AppState>((set) => ({
  evmAddress: undefined,
  stellarAddress: undefined,
  direction: 'EVM_TO_STELLAR',
  amountOut: '100',

  intentId: undefined,
  intent: undefined,

  directUsdcMode: import.meta.env.VITE_DIRECT_USDC_MODE === 'true',
  showWidgets: import.meta.env.VITE_SHOW_WIDGETS === 'true',

  setEvmAddress: (evmAddress) => set({ evmAddress }),
  setStellarAddress: (stellarAddress) => set({ stellarAddress }),
  setDirection: (direction) => set({ direction }),
  setAmountOut: (amountOut) => set({ amountOut }),
  setIntent: (intent) => set({ intent, intentId: intent?.id }),
  setIntentId: (intentId) => set({ intentId }),
}));