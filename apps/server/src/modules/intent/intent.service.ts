import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { ResolverService } from '../resolver/resolver.service';
import {
  CreateIntentInput,
  Intent,
  IntentStatus,
  IntentRequestEcho,
} from '../../shared/types';

type Store = Map<string, Intent & { preimage?: string }>;
const store: Store = new Map();

@Injectable()
export class IntentService {
  constructor(private readonly resolver: ResolverService) {}

  async create(input: CreateIntentInput): Promise<Intent> {
    const preimage = randomBytes(32);
    const hash = '0x' + createHash('sha256').update(preimage).digest('hex');

    const plan = await this.resolver.buildPlan(input);
    plan.hash = hash as `0x${string}`;

    const request: IntentRequestEcho = {
      direction: input.direction,
      mode: input.mode ?? 'EXACT_IN',
      fromChainId: input.fromChainId,
      fromToken: input.fromToken,
      toToken: input.toToken,
      toAddress: input.toAddress,
      amountIn: input.amountIn,
      amountOut: input.amountOut,
      createdAt: new Date().toISOString(),
    };

    const id = randomBytes(9).toString('hex');
    const intent: Intent = { id, status: 'created', plan, tx: {}, request };

    store.set(id, { ...intent, preimage: '0x' + preimage.toString('hex') });
    return intent;
  }

  get(id: string): Intent | null {
    const i = store.get(id);
    if (!i) return null;
    const { preimage, ...rest } = i;
    return rest;
  }

  patchStatus(id: string, status: IntentStatus, tx?: Record<string, string>) {
    const i = store.get(id);
    if (!i) return null;
    i.status = status;
    if (tx) i.tx = { ...(i.tx ?? {}), ...tx };
    store.set(id, i);
    const { preimage, ...rest } = i;
    return rest;
  }

  /**
   * Get intent with preimage (for relayer use)
   */
  getWithPreimage(id: string): (Intent & { preimage?: string }) | null {
    return store.get(id) || null;
  }

  /**
   * Get all active intents
   */
  getActiveIntents(): Intent[] {
    const activeStatuses: IntentStatus[] = [
      'created',
      'evm_locked',
      'stellar_locked',
      'withdrawn_stellar',
      'withdrawn_evm',
    ];
    const activeIntents: Intent[] = [];

    for (const [id, intent] of store.entries()) {
      if (activeStatuses.includes(intent.status)) {
        const { preimage, ...intentWithoutPreimage } = intent;
        activeIntents.push(intentWithoutPreimage);
      }
    }

    return activeIntents;
  }

  /**
   * Find intent by hashlock
   */
  findByHashlock(hashlock: string): Intent | null {
    for (const [id, intent] of store.entries()) {
      if (intent.plan.hash === hashlock) {
        const { preimage, ...intentWithoutPreimage } = intent;
        return intentWithoutPreimage;
      }
    }
    return null;
  }

  /**
   * Get all intents (for debugging)
   */
  getAllIntents(): Intent[] {
    const intents: Intent[] = [];
    for (const [id, intent] of store.entries()) {
      const { preimage, ...intentWithoutPreimage } = intent;
      intents.push(intentWithoutPreimage);
    }
    return intents;
  }
}
