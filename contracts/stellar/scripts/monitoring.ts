import {
  humanizeEvents,
  nativeToScVal,
  scValToNative,
  Address,
  Networks,
  Asset,
  xdr,
} from "@stellar/stellar-sdk";
import { Api, Server } from "@stellar/stellar-sdk/rpc";
import path from "path";
import dotenv from "dotenv";
import { HTLCSwap } from "@QualiPe/htlc-contract";

const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const HTLC_CONTRACT_ADDRESS = process.env.HTLC_CONTRACT_ADDRESS;

if (!HTLC_CONTRACT_ADDRESS) {
  throw new Error("HTLC_CONTRACT_ADDRESS is not set");
}

const s = new Server("https://soroban-testnet.stellar.org");

async function main() {
  const response = await s.getLatestLedger();
  const xlmFilter: Api.EventFilter = {
    type: "contract",
    contractIds: [HTLC_CONTRACT_ADDRESS!],
    // topics: [
    //   // Defined in https://stellar.org/protocol/sep-41#interface
    //   // for all compatible transfer events.
    //   [
    //     nativeToScVal("transfer", { type: "symbol" }).toXDR("base64"),
    //     "*", // from anyone
    //     "*", // to anyone
    //     "*", // any asset (it'll be XLM anyway)
    //   ],
    // ],
  };
  let page = await s.getEvents({
    startLedger: response.sequence - 1000, // start ~10m in the past
    filters: [xlmFilter],
    limit: 10,
  });

  // Run forever until Ctrl+C'd by user
  while (true) {
    if (!page.events.length) {
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      //
      // Two ways to output a human-friendly version:
      //  1. the RPC response itself for human-readable text
      //  2. a helper for the XDR structured-equivalent for human-readable JSON
      //
      console.log(cereal(simpleEventLog(page.events)));
      // console.log(cereal(fullEventLog(page.events)));
    }

    // Fetch the next page until events are exhausted, then wait.
    page = await s.getEvents({
      filters: [xlmFilter],
      cursor: page.cursor,
      limit: 10,
    });
  }
}

function simpleEventLog(events) {
  return events.map((event) => {
    // return {
    //   topics: event.topic.map((t) => scValToNative(t)),
    //   value: scValToNative(event.value),
    // };
    // if topic[0] CREATED and topic[1] swap
    const topics = event.topic.map((t) => scValToNative(t));
    const value = scValToNative(event.value);
    if (topics[0] === "CREATED" && topics[1] === "swap") {
      return swapCreatedEventLog(value);
    }
    if (topics[0] === "WITHDRAWN" && topics[1] === "withdraw") {
      return swapWithdrawnEventLog(value);
    }
    return null;
  });
}

function swapCreatedEventLog(obj: any[]): {
  type: "created";
  swapId: string;
  sender: string;
  recipient: string;
  token: string;
  amount: number;
  hashlock: string;
  timelock: number;
} {
  return {
    type: "created",
    swapId: Buffer.from(obj[0]).toString("hex"),
    sender: obj[1],
    recipient: obj[2],
    token: obj[3],
    amount: obj[4],
    hashlock: Buffer.from(obj[5]).toString("hex"),
    timelock: obj[6],
  };
}

//(swap_id, updated_swap.sender, recipient, updated_swap.token, updated_swap.amount, preimage)
function swapWithdrawnEventLog(obj: any[]): {
  type: "withdrawn";
  swapId: string;
  sender: string;
  recipient: string;
  token: string;
  amount: number;
  preimage: string;
} {
  return {
    type: "withdrawn",
    swapId: Buffer.from(obj[0]).toString("hex"),
    sender: obj[1],
    recipient: obj[2],
    token: obj[3],
    amount: obj[4],
    preimage: Buffer.from(obj[5]).toString("hex"),
  };
}

function fullEventLog(events) {
  return events;
  // return humanizeEvents(
  //   events
  // );
}

// A custom JSONification method to handle bigints.
function cereal(data) {
  return JSON.stringify(
    data,
    (k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}

main().catch((e) => console.error(e));