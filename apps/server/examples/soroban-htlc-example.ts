import { SorobanClientService } from '../src/modules/htlc/soroban-client.service';
import { StellarHtlcService } from '../src/modules/htlc/stellar-htlc.service';
import * as crypto from 'crypto';

/**
 * Example demonstrating the Soroban HTLC token bindings
 */
async function demonstrateHTLCBindings() {
  console.log('🚀 Soroban HTLC Token Bindings Demo');
  console.log('=====================================\n');

  try {
    // Initialize services
    const sorobanClient = new SorobanClientService();
    const stellarHtlcService = new StellarHtlcService(sorobanClient);

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check service status
    const status = stellarHtlcService.getStatus();
    console.log('📊 Service Status:', status);

    if (!status.initialized) {
      console.log('❌ Service not properly initialized. Check configuration.');
      return;
    }

    // Generate test data
    const swapId = 'demo-swap-' + Date.now();
    const sender = 'GDEMO123456789012345678901234567890123456789';
    const recipient = 'GRECIPIENT123456789012345678901234567890123456789';
    const token = 'USDC';
    const amount = BigInt(1000000); // 1 USDC (6 decimals)
    
    // Generate a random preimage and hashlock
    const preimage = crypto.randomBytes(32);
    const hashlock = crypto.createHash('sha256').update(preimage).digest('hex');
    const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

    console.log('\n🔧 Test Parameters:');
    console.log(`Swap ID: ${swapId}`);
    console.log(`Sender: ${sender}`);
    console.log(`Recipient: ${recipient}`);
    console.log(`Token: ${token}`);
    console.log(`Amount: ${amount} (${Number(amount) / 1000000} USDC)`);
    console.log(`Hashlock: 0x${hashlock}`);
    console.log(`Timelock: ${timelock} (${new Date(Number(timelock) * 1000).toISOString()})`);
    console.log(`Preimage: 0x${preimage.toString('hex')}`);

    // Example 1: Create a swap
    console.log('\n📝 Example 1: Creating HTLC Swap');
    try {
      await stellarHtlcService.createSwap({
        swapId,
        sender,
        recipient,
        token,
        amount,
        hashlock: '0x' + hashlock,
        timelock,
      });
      console.log('✅ Swap created successfully');
    } catch (error) {
      console.log('❌ Swap creation failed:', error.message);
    }

    // Example 2: Check if swap exists
    console.log('\n🔍 Example 2: Checking Swap Existence');
    try {
      const exists = await stellarHtlcService.swapExists(swapId);
      console.log(`Swap exists: ${exists}`);
    } catch (error) {
      console.log('❌ Swap existence check failed:', error.message);
    }

    // Example 3: Get swap details
    console.log('\n📋 Example 3: Getting Swap Details');
    try {
      const swapDetails = await stellarHtlcService.getSwap(swapId);
      if (swapDetails) {
        console.log('Swap Details:', JSON.stringify(swapDetails, null, 2));
      } else {
        console.log('Swap not found');
      }
    } catch (error) {
      console.log('❌ Get swap details failed:', error.message);
    }

    // Example 4: Verify preimage
    console.log('\n🔐 Example 4: Verifying Preimage');
    try {
      const isValid = await stellarHtlcService.verifyPreimage(
        swapId,
        '0x' + preimage.toString('hex')
      );
      console.log(`Preimage valid: ${isValid}`);
    } catch (error) {
      console.log('❌ Preimage verification failed:', error.message);
    }

    // Example 5: Withdraw (this would fail in demo since swap wasn't actually created)
    console.log('\n💰 Example 5: Withdrawing from Swap');
    try {
      await stellarHtlcService.withdraw(
        swapId,
        recipient,
        '0x' + preimage.toString('hex')
      );
      console.log('✅ Withdrawal successful');
    } catch (error) {
      console.log('❌ Withdrawal failed:', error.message);
    }

    // Example 6: Refund (this would fail in demo since swap wasn't actually created)
    console.log('\n↩️ Example 6: Refunding Swap');
    try {
      await stellarHtlcService.refund(swapId, sender);
      console.log('✅ Refund successful');
    } catch (error) {
      console.log('❌ Refund failed:', error.message);
    }

    console.log('\n🎉 Demo completed!');
    console.log('\n💡 Note: Some operations may fail in demo mode');
    console.log('   because the swap is not actually created on-chain.');
    console.log('   In production, ensure proper contract deployment and configuration.');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
if (require.main === module) {
  demonstrateHTLCBindings();
}

export { demonstrateHTLCBindings }; 