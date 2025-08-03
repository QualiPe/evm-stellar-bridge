import { Api, Server } from '@stellar/stellar-sdk/rpc';
import { ENV as env } from '../../shared/config.module';
import { scValToNative } from '@stellar/stellar-sdk';

// interface for on functions, that will be triggered by the events
interface On {
  created: (swap: SwapCreatedEvent) => void;
  withdrawn: (swap: SwapWithdrawnEvent) => void;
  refunded: (swap: SwapRefundedEvent) => void;
}

// interfaces for the events
export interface SwapCreatedEvent {
  type: 'created';
  swapId: string;
  sender: string;
  recipient: string;
  token: string;
  amount: number;
  hashlock: string;
  timelock: number;
}

export interface SwapWithdrawnEvent {
  type: 'withdrawn';
  swapId: string;
  sender: string;
  recipient: string;
  token: string;
  amount: number;
  preimage: string;
}

export interface SwapRefundedEvent {
  type: 'refunded';
  swapId: string;
  sender: string;
  recipient: string;
  token: string;
  amount: number;
}

const s = new Server('https://soroban-testnet.stellar.org');

export const startStellarMonitoring = async (on: On) => {
  const response = await s.getLatestLedger();
  const xlmFilter: Api.EventFilter = {
    type: 'contract',
    contractIds: [env.STELLAR_HTLC_CONTRACT_ADDRESS],
  };
  let page = await s.getEvents({
    startLedger: response.sequence - 1000,
    filters: [xlmFilter],
    limit: 10,
  });

  while (true) {
    if (!page.events.length) {
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      simpleEventProcessor(page.events, on);
    }

    // Fetch the next page until events are exhausted, then wait.
    page = await s.getEvents({
      filters: [xlmFilter],
      cursor: page.cursor,
      limit: 10,
    });
  }
};

function simpleEventProcessor(events: Api.EventResponse[], on: On): void {
  events.map((event) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const topics: string[] = event.topic.map((t) => scValToNative(t));
    const value = scValToNative(event.value);
    if (topics[0] === 'CREATED' && topics[1] === 'swap') {
      const swapCreatedEvent = swapCreatedEventLog(value);
      on.created(swapCreatedEvent);
    }
    if (topics[0] === 'WITHDRAWN' && topics[1] === 'withdraw') {
      const swapWithdrawnEvent = swapWithdrawnEventLog(value);
      on.withdrawn(swapWithdrawnEvent);
    }
    if (topics[0] === 'REFUNDED' && topics[1] === 'refund') {
      const swapRefundedEvent = swapRefundedEventLog(value);
      on.refunded(swapRefundedEvent);
    }
    return null;
  });
}

function swapCreatedEventLog(obj: any[]): SwapCreatedEvent {
  return {
    type: 'created',
    swapId: Buffer.from(obj[0]).toString('hex'),
    sender: obj[1],
    recipient: obj[2],
    token: obj[3],
    amount: obj[4],
    hashlock: Buffer.from(obj[5]).toString('hex'),
    timelock: obj[6],
  };
}

//(swap_id, updated_swap.sender, recipient, updated_swap.token, updated_swap.amount, preimage)
function swapWithdrawnEventLog(obj: any[]): SwapWithdrawnEvent {
  return {
    type: 'withdrawn',
    swapId: Buffer.from(obj[0]).toString('hex'),
    sender: obj[1],
    recipient: obj[2],
    token: obj[3],
    amount: obj[4],
    preimage: Buffer.from(obj[5]).toString('hex'),
  };
}

// swap_id, sender, updated_swap.recipient, updated_swap.token, updated_swap.amount)
function swapRefundedEventLog(obj: any[]): SwapRefundedEvent {
  return {
    type: 'refunded',
    swapId: Buffer.from(obj[0]).toString('hex'),
    sender: obj[1],
    recipient: obj[2],
    token: obj[3],
    amount: obj[4],
  };
}

// A custom JSONification method to handle bigints.
function cereal(data) {
  return JSON.stringify(
    data,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (k, v) => (typeof v === 'bigint' ? v.toString() : v),
    2,
  );
}
