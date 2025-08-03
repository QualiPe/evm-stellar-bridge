import { 
  createClient, 
  createServer, 
  createTrustline, 
  sendPayment, 
  createSwap, 
  createAsset 
} from "@QualiPe/htlc-helpers";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";

const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

const DEPLOYER_SECRET = process.env.DEPLOYER_SECRET;
const ISSUER_SECRET = process.env.ISSUER_SECRET;

if (!DEPLOYER_SECRET) {
  throw new Error("DEPLOYER_SECRET_KEY is not set");
}

if (!ISSUER_SECRET) {
  throw new Error("ISSUER_SECRET_KEY is not set");
}

const HTLC_CONTRACT_ADDRESS = process.env.HTLC_CONTRACT_ADDRESS;
const TOKEN_ID = process.env.TOKEN_ID;

if (!HTLC_CONTRACT_ADDRESS) {
  throw new Error("HTLC_CONTRACT_ADDRESS is not set");
}

if (!TOKEN_ID) {
  throw new Error("TOKEN_ID is not set. Run the get-token-id.ts script first to get the token_id");
}

const ASSET_CODE = "TEST";
const ASSET_ISSUER = "GCOXN2JY3EA23RJXIKRX6FMOBEIDMONBJ3KGJNTUGX76C2ZKDLTLBPAU";

const main = async () => {
  const deployerKeypair = Keypair.fromSecret(DEPLOYER_SECRET);
  const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);

  // 1. Create a server
  const server = createServer(TESTNET_RPC_URL);

  const deployerAccount = await server.getAccount(deployerKeypair.publicKey());
  const issuerAccount = await server.getAccount(issuerKeypair.publicKey());

  // 2. Create client
  const client = createClient({
    signerKeypair: deployerKeypair,
    rpcUrl: TESTNET_RPC_URL,
    contractId: HTLC_CONTRACT_ADDRESS,
    networkPassphrase: Networks.TESTNET,
  });

  // 3. Create asset
  const asset = createAsset(ASSET_CODE, ASSET_ISSUER);

  // 4. Create trustline for the deployer
  await createTrustline(
    server,
    deployerKeypair,
    deployerAccount,
    asset,
    Networks.TESTNET
  );

  // 5. Send tokens from issuer to deployer
  await sendPayment(
    server,
    issuerKeypair,
    issuerAccount,
    asset,
    "1000",
    deployerKeypair.publicKey(),
    Networks.TESTNET
  );

  const secret = "test-secret-123";
  // 6. Create a new swap
  await createSwap(
    client,
    {
      sender: deployerKeypair.publicKey(),
      recipient: deployerKeypair.publicKey(),
      tokenId: TOKEN_ID,
      amount: BigInt(1000),
      timelockHours: 10, // 10 hours timelock
      swapId: Buffer.from("test-swap-003"),
      secret,
    }
  );

  console.log("Swap created successfully");
  console.log("Secret hash:", crypto.createHash("sha256").update(secret).digest("hex"));
};

main();
