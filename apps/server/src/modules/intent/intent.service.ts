import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { ResolverService } from '../resolver/resolver.service';
import { CreateIntentInput, Intent, IntentStatus } from '../../shared/types';

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

    const id = randomBytes(9).toString('hex');
    const intent: Intent = { id, status: 'created', plan, tx: {} };
    store.set(id, { ...intent, preimage: '0x' + preimage.toString('hex') });
    return intent;
  }

  get(id: string): Intent | null {
    const i = store.get(id);
    if (!i) return null;
    const { preimage, ...rest } = i;
    return rest;
  }

  patchStatus(id: string, status: IntentStatus, tx?: Record<string,string>) {
    const i = store.get(id);
    if (!i) return null;
    i.status = status;
    if (tx) i.tx = { ...(i.tx ?? {}), ...tx };
    store.set(id, i);
    const { preimage, ...rest } = i;
    return rest;
  }
}