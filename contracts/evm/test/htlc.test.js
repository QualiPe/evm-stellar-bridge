const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HtlcUSDC", function () {
  let htlc, usdc, sender, recipient;
  
  const amount = ethers.parseUnits("100", 6);
  const secret = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  let hashlock, timelock;

  beforeEach(async function () {
    [sender, recipient] = await ethers.getSigners();

    // Deploy mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy HTLC
    const HtlcUSDC = await ethers.getContractFactory("HtlcUSDC");
    htlc = await HtlcUSDC.deploy(await usdc.getAddress());

    // Setup
    await usdc.mint(sender.address, amount);
    await usdc.connect(sender).approve(await htlc.getAddress(), amount);

    // Generate hashlock and timelock
    hashlock = ethers.sha256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [secret]));
    const currentBlock = await ethers.provider.getBlock("latest");
    timelock = currentBlock.timestamp + 3600;
  });

  it("Should fund HTLC", async function () {
    await htlc.connect(sender).fund(recipient.address, amount, hashlock, timelock);
    expect(await htlc.isFunded()).to.be.true;
  });

  it("Should withdraw with correct preimage", async function () {
    await htlc.connect(sender).fund(recipient.address, amount, hashlock, timelock);
    await htlc.connect(recipient).withdraw(secret);
    expect(await htlc.isWithdrawn()).to.be.true;
  });

  it("Should refund after timelock", async function () {
    await htlc.connect(sender).fund(recipient.address, amount, hashlock, timelock);
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine");
    await htlc.connect(sender).refund();
    expect(await htlc.isRefunded()).to.be.true;
  });
}); 