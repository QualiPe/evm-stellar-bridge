import { Asset, Keypair } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import path from "path";
import readline from "readline";
import fs from "fs";

const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const ISSUER_SECRET = process.env.ISSUER_SECRET;

if (!ISSUER_SECRET) {
  throw new Error("ISSUER_SECRET_KEY is not set");
}

const main = async () => {
  const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);
  const asset = new Asset("TEST", issuerKeypair.publicKey());

  console.log("=== TOKEN_ID SETUP ===");
  console.log("");
  console.log("This script helps you set up the token_id in your .env file.");
  console.log("");
  console.log("Asset details:");
  console.log(`   Code: ${asset.getCode()}`);
  console.log(`   Issuer: ${asset.getIssuer()}`);
  console.log(`   Full asset: ${asset.toString()}`);
  console.log("");
  console.log("To get the token_id (SAC address):");
  console.log("");
  console.log("1. Install Stellar CLI if you haven't already:");
  console.log("   curl -sSf https://soroban.stellar.org/install.sh | sh");
  console.log("");
  console.log("2. Deploy the asset to Soroban:");
  console.log(`   stellar contract deploy --source ${issuerKeypair.publicKey()} --network testnet`);
  console.log("");
  console.log("3. Copy the SAC address from the output");
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
    console.log("=== UPDATING .ENV FILE ===");
    
    // Read the current .env file
    let envContent = "";
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      console.log("No existing .env file found, creating new one...");
    }

    // Check if TOKEN_ID already exists
    if (envContent.includes("TOKEN_ID=")) {
      // Replace existing TOKEN_ID
      envContent = envContent.replace(/TOKEN_ID=.*/g, `TOKEN_ID=${tokenId}`);
    } else {
      // Add TOKEN_ID to the end
      envContent += `\nTOKEN_ID=${tokenId}`;
    }

    // Write back to .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log("✅ TOKEN_ID added to .env file");
    console.log(`Token ID: ${tokenId}`);
    console.log("");
    console.log("You can now run the create-swap.ts script!");
    console.log("=== END ===");
  } else {
    console.log("No token_id provided. Please run the Stellar CLI command first.");
  }
};

main().catch(console.error); 