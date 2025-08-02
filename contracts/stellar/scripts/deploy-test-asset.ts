import { Asset, BASE_FEE, Keypair, Networks, Operation, rpc, TransactionBuilder } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import path from "path";
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

const ISSUER_SECRET = process.env.ISSUER_SECRET;
const DISTRIBUTOR_SECRET = process.env.DISTRIBUTOR_SECRET;

if (!ISSUER_SECRET) {
  throw new Error("ISSUER_SECRET_KEY is not set");
}

if (!DISTRIBUTOR_SECRET) {
  throw new Error("DISTRIBUTOR_SECRET_KEY is not set");
}

const main = async () => {
  const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);
  const distributorKeypair = Keypair.fromSecret(DISTRIBUTOR_SECRET);

  // 1. Create a server
  const server = new rpc.Server(TESTNET_RPC_URL);

  // 2. Create a new asset
  const asset = new Asset("TEST", issuerKeypair.publicKey());

  // 3. Load issuer account
  const issuerAccount = await server.getAccount(issuerKeypair.publicKey());

  // 4. Create asset and create distributor's trustline
  const tx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
    .addOperation(Operation.changeTrust({
      asset,
      source: distributorKeypair.publicKey(),
    }))
    .addOperation(Operation.payment({
      asset,
      amount: "1000",
      destination: distributorKeypair.publicKey(),
    }))
    .setTimeout(30)
    .build();

  // log asset
  console.log("Asset:", asset);

  // 5. Sign and submit transaction
  tx.sign(issuerKeypair, distributorKeypair);

  let sendTxResponse = await server.sendTransaction(tx);
  console.log("Transaction submitted:", sendTxResponse);

  // 6. Await transaction to be confirmed
  if (sendTxResponse.status === "PENDING") {
    let getResponse = await server.getTransaction(sendTxResponse.hash);
    // Poll `getTransaction` until the status is not "NOT_FOUND"
    while (getResponse.status === "NOT_FOUND") {
      console.log("Waiting for transaction confirmation...");
      // See if the transaction is complete
      getResponse = await server.getTransaction(sendTxResponse.hash);
      // Wait one second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (getResponse.status === "SUCCESS") {
      // Make sure the transaction's resultMetaXDR is not empty
      if (!getResponse.resultMetaXdr) {
        throw "Empty resultMetaXDR in getTransaction response";
      }
      // Find the return value from the contract and return it
      console.log(`Transaction result: `, getResponse);
    } else {
      throw `Transaction failed: ${getResponse.resultXdr}`;
    }
  }

  // 7. Instructions for getting the token_id
  console.log("\n=== TO GET THE TOKEN_ID ===");
  console.log("The token_id you need is the Stellar Asset Contract (SAC) address.");
  console.log("To get it, you need to deploy the asset to Soroban using the Stellar CLI:");
  console.log("");
  console.log("1. Install Stellar CLI if you haven't already:");
  console.log("   curl -sSf https://soroban.stellar.org/install.sh | sh");
  console.log("");
  console.log("2. Deploy the asset to Soroban:");
  console.log(`   stellar contract deploy --source ${issuerKeypair.publicKey()} --network testnet`);
  console.log("");
  console.log("3. The output will include the SAC address (token_id)");
  console.log("");
  console.log("4. Use the SAC address in your HTLC scripts like this:");
  console.log("   const token_address = \"[SAC_ADDRESS_FROM_CLI_OUTPUT]\";");
  console.log("");
  console.log("Asset details:");
  console.log(`   Code: ${asset.getCode()}`);
  console.log(`   Issuer: ${asset.getIssuer()}`);
  console.log(`   Full asset: ${asset.toString()}`);
  console.log("=== END INSTRUCTIONS ===\n");
};

main();
