const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiHtlcUSDC", function () {
  let multiHtlc, usdc, sender1, sender2, recipient1, recipient2;
  
  const amount1 = ethers.parseUnits("100", 6);
  const amount2 = ethers.parseUnits("50", 6);
  const secret1 = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const secret2 = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  let hashlock1, hashlock2, timelock1, timelock2, swapId1, swapId2;

  beforeEach(async function () {
    [sender1, sender2, recipient1, recipient2] = await ethers.getSigners();

    // Deploy mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy MultiHtlcUSDC
    const MultiHtlcUSDC = await ethers.getContractFactory("MultiHtlcUSDC");
    multiHtlc = await MultiHtlcUSDC.deploy(await usdc.getAddress());

    // Setup USDC for both senders
    await usdc.mint(sender1.address, amount1);
    await usdc.mint(sender2.address, amount2);
    await usdc.connect(sender1).approve(await multiHtlc.getAddress(), amount1);
    await usdc.connect(sender2).approve(await multiHtlc.getAddress(), amount2);

    // Generate hashlocks and timelocks
    hashlock1 = ethers.sha256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [secret1]));
    hashlock2 = ethers.sha256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [secret2]));
    const currentBlock = await ethers.provider.getBlock("latest");
    timelock1 = currentBlock.timestamp + 3600;
    timelock2 = currentBlock.timestamp + 7200; // Different timelock
  });

  it("Should fund multiple HTLCs", async function () {
    // Fund first HTLC
    const tx1 = await multiHtlc.connect(sender1).fund(recipient1.address, amount1, hashlock1, timelock1);
    const receipt1 = await tx1.wait();
    const event1 = receipt1.logs.find(log => log.fragment?.name === 'Funded');
    swapId1 = event1.args[0];

    // Fund second HTLC
    const tx2 = await multiHtlc.connect(sender2).fund(recipient2.address, amount2, hashlock2, timelock2);
    const receipt2 = await tx2.wait();
    const event2 = receipt2.logs.find(log => log.fragment?.name === 'Funded');
    swapId2 = event2.args[0];

    // Verify both swaps are funded
    expect(await multiHtlc.isSwapFunded(swapId1)).to.be.true;
    expect(await multiHtlc.isSwapFunded(swapId2)).to.be.true;
    expect(swapId1).to.not.equal(swapId2);
  });

  it("Should withdraw from multiple HTLCs", async function () {
    // Fund both HTLCs
    const tx1 = await multiHtlc.connect(sender1).fund(recipient1.address, amount1, hashlock1, timelock1);
    const receipt1 = await tx1.wait();
    const event1 = receipt1.logs.find(log => log.fragment?.name === 'Funded');
    swapId1 = event1.args[0];

    const tx2 = await multiHtlc.connect(sender2).fund(recipient2.address, amount2, hashlock2, timelock2);
    const receipt2 = await tx2.wait();
    const event2 = receipt2.logs.find(log => log.fragment?.name === 'Funded');
    swapId2 = event2.args[0];

    // Withdraw from first HTLC
    await multiHtlc.connect(recipient1).withdraw(swapId1, secret1);
    
    // Withdraw from second HTLC
    await multiHtlc.connect(recipient2).withdraw(swapId2, secret2);

    // Verify both are withdrawn
    const details1 = await multiHtlc.getSwapDetails(swapId1);
    const details2 = await multiHtlc.getSwapDetails(swapId2);
    expect(details1[6]).to.be.true; // isWithdrawn
    expect(details2[6]).to.be.true; // isWithdrawn
  });

  it("Should refund multiple HTLCs after expiration", async function () {
    // Fund both HTLCs with short timelocks
    const shortTimelock = Math.floor(Date.now() / 1000) + 60; // 1 minute
    
    const tx1 = await multiHtlc.connect(sender1).fund(recipient1.address, amount1, hashlock1, shortTimelock);
    const receipt1 = await tx1.wait();
    const event1 = receipt1.logs.find(log => log.fragment?.name === 'Funded');
    swapId1 = event1.args[0];

    const tx2 = await multiHtlc.connect(sender2).fund(recipient2.address, amount2, hashlock2, shortTimelock);
    const receipt2 = await tx2.wait();
    const event2 = receipt2.logs.find(log => log.fragment?.name === 'Funded');
    swapId2 = event2.args[0];

    // Wait for expiration
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine");

    // Refund both HTLCs
    await multiHtlc.connect(sender1).refund(swapId1);
    await multiHtlc.connect(sender2).refund(swapId2);

    // Verify both are refunded
    const details1 = await multiHtlc.getSwapDetails(swapId1);
    const details2 = await multiHtlc.getSwapDetails(swapId2);
    expect(details1[7]).to.be.true; // isRefunded
    expect(details2[7]).to.be.true; // isRefunded
  });

  it("Should get correct swap count", async function () {
    expect(await multiHtlc.getSwapCount()).to.equal(0n);

    // Fund first HTLC
    await multiHtlc.connect(sender1).fund(recipient1.address, amount1, hashlock1, timelock1);
    expect(await multiHtlc.getSwapCount()).to.equal(1n);

    // Fund second HTLC
    await multiHtlc.connect(sender2).fund(recipient2.address, amount2, hashlock2, timelock2);
    expect(await multiHtlc.getSwapCount()).to.equal(2n);
  });

  it("Should check expiration correctly", async function () {
    // Fund HTLC
    const tx = await multiHtlc.connect(sender1).fund(recipient1.address, amount1, hashlock1, timelock1);
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.fragment?.name === 'Funded');
    swapId1 = event.args[0];

    // Should not be expired initially
    expect(await multiHtlc.isSwapExpired(swapId1)).to.be.false;

    // Wait for expiration
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine");

    // Should be expired now
    expect(await multiHtlc.isSwapExpired(swapId1)).to.be.true;
  });
}); 