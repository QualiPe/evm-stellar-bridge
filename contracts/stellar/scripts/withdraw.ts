import { 
  createClient, 
  withdraw 
} from "@QualiPe/htlc-helpers";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import path from "path";

const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

const RECIPIENT_SECRET = process.env.DEPLOYER_SECRET;

if (!RECIPIENT_SECRET) {
  throw new Error("RECIPIENT_SECRET is not set");
}

const HTLC_CONTRACT_ADDRESS = process.env.HTLC_CONTRACT_ADDRESS;

if (!HTLC_CONTRACT_ADDRESS) {
  throw new Error("HTLC_CONTRACT_ADDRESS is not set");
}

const main = async () => {
  const recipientKeypair = Keypair.fromSecret(RECIPIENT_SECRET);

  // 1. Create client
  const client = createClient({
    signerKeypair: recipientKeypair,
    rpcUrl: TESTNET_RPC_URL,
    contractId: HTLC_CONTRACT_ADDRESS,
    networkPassphrase: Networks.TESTNET,
  });

  // 2. Withdraw parameters
  const swapId = Buffer.from("test-swap-002"); // This should match the swap ID from create-swap.ts
  const recipient = recipientKeypair.publicKey();
  const preimage = Buffer.from("test-secret-123"); // This should match the secret from create-swap.ts

  console.log("Withdrawing swap with the following parameters:");
  console.log("Swap ID:", swapId.toString("hex"));
  console.log("Recipient:", recipient);
  console.log("Preimage:", preimage.toString("hex"));

  // 3. Withdraw the swap
  await withdraw(
    client,
    {
      swapId,
      recipient,
      preimage,
    }
  );

  console.log("Withdraw completed successfully!");
};

main().catch((e) => console.error(e)); 