import { Asset, Keypair } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import path from "path";
import readline from "readline";

const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const ISSUER_SECRET = process.env.ISSUER_SECRET;

if (!ISSUER_SECRET) {
  throw new Error("ISSUER_SECRET_KEY is not set");
}

const main = async () => {
  const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);
  const asset = new Asset("TEST", issuerKeypair.publicKey());

  console.log("=== TOKEN_ID HELPER ===");
  console.log("");
  console.log("This script helps you get the token_id for your HTLC contract.");
  console.log("");
  console.log("Asset details:");
  console.log(`   Code: ${asset.getCode()}`);
  console.log(`   Issuer: ${asset.getIssuer()}`);
  console.log(`   Full asset: ${asset.toString()}`);
  console.log("");
  console.log("To get the token_id (SAC address), you have two options:");
  console.log("");
  console.log("OPTION 1: Use Stellar CLI (Recommended)");
  console.log("1. Install Stellar CLI:");
  console.log("   curl -sSf https://soroban.stellar.org/install.sh | sh");
  console.log("");
  console.log("2. Deploy the asset to Soroban:");
  console.log(`   stellar contract deploy --source ${issuerKeypair.publicKey()} --network testnet`);
  console.log("");
  console.log("3. Copy the SAC address from the output");
  console.log("");
  console.log("OPTION 2: Manual input");
  console.log("If you already have the SAC address, you can input it manually.");
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const tokenId = await new Promise<string>((resolve) => {
    rl.question("Enter the SAC address (token_id): ", (answer) => {
      resolve(answer.trim());
    });
  });

  rl.close();

  if (tokenId) {
    console.log("");
    console.log("=== TOKEN_ID CONFIRMED ===");
    console.log(`Token ID: ${tokenId}`);
    console.log("");
    console.log("Use this in your HTLC scripts:");
    console.log(`const token_address = "${tokenId}";`);
    console.log("");
    console.log("Or update your .env file:");
    console.log(`TOKEN_ID=${tokenId}`);
    console.log("");
    console.log("=== END ===");
  } else {
    console.log("No token_id provided. Please run the Stellar CLI command first.");
  }
};

main().catch(console.error); 