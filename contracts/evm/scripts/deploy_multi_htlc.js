// scripts/deploy_multi_htlc.js
// Deploys the MultiHtlcUSDC contract

const { ethers } = require("hardhat");

async function main() {
  // USDC token address on Ethereum Sepolia testnet
  const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  const MultiHtlcUSDC = await ethers.getContractFactory("MultiHtlcUSDC");
  const multiHtlc = await MultiHtlcUSDC.deploy(usdcAddress);

  await multiHtlc.waitForDeployment();
  const address = await multiHtlc.getAddress();

  console.log(`MultiHtlcUSDC deployed to: ${address}`);
  console.log(`USDC Token: ${usdcAddress}`);
  console.log(`Network: Sepolia Testnet`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 