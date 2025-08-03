import { 
  createClient, 
  refund 
} from "@QualiPe/htlc-helpers";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import path from "path";

const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

const SENDER_SECRET = process.env.SENDER_SECRET;

if (!SENDER_SECRET) {
  throw new Error("SENDER_SECRET is not set");
}

const HTLC_CONTRACT_ADDRESS = process.env.HTLC_CONTRACT_ADDRESS;

if (!HTLC_CONTRACT_ADDRESS) {
  throw new Error("HTLC_CONTRACT_ADDRESS is not set");
}

const main = async () => {
  const senderKeypair = Keypair.fromSecret(SENDER_SECRET);

  // 1. Create client
  const client = createClient({
    signerKeypair: senderKeypair,
    rpcUrl: TESTNET_RPC_URL,
    contractId: HTLC_CONTRACT_ADDRESS,
    networkPassphrase: Networks.TESTNET,
  });

  // 2. Refund parameters
  const swapId = Buffer.from("test-swap-002"); // This should match the swap ID from create-swap.ts
  const sender = senderKeypair.publicKey();

  console.log("Refunding swap with the following parameters:");
  console.log("Swap ID:", swapId.toString("hex"));
  console.log("Sender:", sender);

  // 3. Refund the swap
  await refund(
    client,
    swapId,
    sender
  );

  console.log("Refund completed successfully!");
};

main().catch((e) => console.error(e)); 