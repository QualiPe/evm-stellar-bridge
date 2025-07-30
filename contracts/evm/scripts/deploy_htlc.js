// scripts/deploy_htlc.js
// Deploys the HtlcUSDC contract

const { ethers } = require("hardhat");

async function main() {
  // USDC token address on Ethereum Sepolia testnet
  const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  const HtlcUSDC = await ethers.getContractFactory("HtlcUSDC");
  const htlc = await HtlcUSDC.deploy(usdcAddress);

  await htlc.waitForDeployment();
  const address = await htlc.getAddress();

  console.log(`HtlcUSDC deployed to: ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });