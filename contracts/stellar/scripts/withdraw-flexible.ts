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

const RECIPIENT_SECRET = process.env.RECIPIENT_SECRET;

if (!RECIPIENT_SECRET) {
  throw new Error("RECIPIENT_SECRET is not set");
}

const HTLC_CONTRACT_ADDRESS = process.env.HTLC_CONTRACT_ADDRESS;

if (!HTLC_CONTRACT_ADDRESS) {
  throw new Error("HTLC_CONTRACT_ADDRESS is not set");
}

// Get command line arguments
const args = process.argv.slice(2);
const swapIdArg = args[0];
const preimageArg = args[1];

if (!swapIdArg || !preimageArg) {
  console.error("Usage: npm run withdraw <swap-id> <preimage>");
  console.error("Example: npm run withdraw test-swap-002 test-secret-123");
  process.exit(1);
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

  // 2. Withdraw parameters from command line
  const swapId = Buffer.from(swapIdArg);
  const recipient = recipientKeypair.publicKey();
  const preimage = Buffer.from(preimageArg);

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