const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';

async function testFullRelayer() {
  console.log('🚀 Testing Full Relayer on Testnets...\n');

  try {
    // 1. Check server status
    console.log('1. Server status...');
    const status = await axios.get(`${BASE_URL}/htlc/evm/status`);
    console.log('✅ Server running:', status.data.status);
    console.log('   Contract balance:', status.data.contractBalance);
    console.log('   Total swaps:', status.data.totalSwaps);
    console.log('');

    // 2. Check Stellar status
    console.log('2. Stellar status...');
    const stellarStatus = await axios.get(`${BASE_URL}/htlc/stellar/status`);
    console.log('✅ Stellar service:', stellarStatus.data.status);
    console.log('   Contract address:', stellarStatus.data.contractAddress);
    console.log('   Network:', stellarStatus.data.network);
    console.log('');

    // 3. Start relayer
    console.log('3. Starting relayer...');
    await axios.post(`${BASE_URL}/htlc/relayer/start`);
    console.log('✅ Relayer started');
    console.log('');

    // 4. Generate test data for cross-chain swap
    console.log('4. Generating test data...');
    const preimage = crypto.randomBytes(32);
    const hashlock = '0x' + crypto.createHash('sha256').update(preimage).digest('hex');
    const testRecipient = '0xc5a30632C77E18a5Cb5481c8bb0572c83EeA6508';
    const testAmount = '1.0';
    const testTimelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    console.log('   Hashlock:', hashlock);
    console.log('   Amount:', testAmount, 'USDC');
    console.log('   Timelock:', new Date(testTimelock * 1000).toISOString());
    console.log('');

    // 5. Create intent for EVM to Stellar swap
    console.log('5. Creating intent (EVM to Stellar)...');
    const intentResponse = await axios.post(`${BASE_URL}/intents`, {
      direction: 'EVM_TO_STELLAR',
      fromToken: 'USDC',
      toToken: 'USDC',
      amountIn: testAmount,
      toAddress: testRecipient
    });
    console.log('✅ Intent created:', intentResponse.data.id);
    console.log('');

    // 6. Fund EVM HTLC
    console.log('6. Funding EVM HTLC...');
    const evmFundResponse = await axios.post(`${BASE_URL}/htlc/evm/fund`, {
      swapId: hashlock,
      sender: testRecipient,
      recipient: testRecipient,
      token: 'USDC',
      amount: '1000000', // 1 USDC in minor units
      hashlock: hashlock,
      timelock: testTimelock
    });
    console.log('✅ EVM HTLC funded:', evmFundResponse.data.swapId);
    console.log('');

    // 7. Check EVM HTLC status
    console.log('7. Checking EVM HTLC status...');
    const evmSwap = await axios.get(`${BASE_URL}/htlc/evm/swap/${hashlock}`);
    console.log('✅ EVM HTLC status:', {
      isFunded: evmSwap.data.isFunded,
      isWithdrawn: evmSwap.data.isWithdrawn,
      isRefunded: evmSwap.data.isRefunded
    });
    console.log('');

    // 8. Create Stellar HTLC
    console.log('8. Creating Stellar HTLC...');
    await axios.post(`${BASE_URL}/htlc/stellar/create`, {
      swapId: hashlock,
      sender: testRecipient,
      recipient: testRecipient,
      token: 'USDC',
      amount: '1000000',
      hashlock: hashlock,
      timelock: testTimelock
    });
    console.log('✅ Stellar HTLC created');
    console.log('');

    // 9. Check Stellar HTLC status
    console.log('9. Checking Stellar HTLC status...');
    const stellarSwap = await axios.get(`${BASE_URL}/htlc/stellar/swap/${hashlock}`);
    console.log('✅ Stellar HTLC status:', {
      isWithdrawn: stellarSwap.data.isWithdrawn,
      isRefunded: stellarSwap.data.isRefunded
    });
    console.log('');

    // 10. Test preimage verification
    console.log('10. Testing preimage verification...');
    const verificationResult = await axios.post(`${BASE_URL}/htlc/stellar/verify-preimage`, {
      swapId: hashlock,
      preimage: '0x' + preimage.toString('hex')
    });
    console.log('✅ Preimage verification:', verificationResult.data.valid);
    console.log('');

    // 11. Test withdrawal on Stellar
    console.log('11. Testing Stellar withdrawal...');
    await axios.post(`${BASE_URL}/htlc/stellar/withdraw`, {
      swapId: hashlock,
      recipient: testRecipient,
      preimage: '0x' + preimage.toString('hex')
    });
    console.log('✅ Stellar withdrawal successful');
    console.log('');

    // 12. Check final Stellar status
    console.log('12. Final Stellar status...');
    const finalStellarSwap = await axios.get(`${BASE_URL}/htlc/stellar/swap/${hashlock}`);
    console.log('✅ Final Stellar status:', {
      isWithdrawn: finalStellarSwap.data.isWithdrawn,
      preimage: finalStellarSwap.data.preimage ? 'Stored' : 'Not stored'
    });
    console.log('');

    // 13. Test withdrawal on EVM
    console.log('13. Testing EVM withdrawal...');
    await axios.post(`${BASE_URL}/htlc/evm/withdraw`, {
      swapId: hashlock,
      preimage: '0x' + preimage.toString('hex')
    });
    console.log('✅ EVM withdrawal successful');
    console.log('');

    // 14. Check final EVM status
    console.log('14. Final EVM status...');
    const finalEvmSwap = await axios.get(`${BASE_URL}/htlc/evm/swap/${hashlock}`);
    console.log('✅ Final EVM status:', {
      isWithdrawn: finalEvmSwap.data.isWithdrawn,
      isRefunded: finalEvmSwap.data.isRefunded
    });
    console.log('');

    // 15. Check relayer status
    console.log('15. Relayer status...');
    const relayerStatus = await axios.get(`${BASE_URL}/htlc/relayer/status`);
    console.log('✅ Relayer status:', relayerStatus.data);
    console.log('');

    // 16. Stop relayer
    console.log('16. Stopping relayer...');
    await axios.post(`${BASE_URL}/htlc/relayer/stop`);
    console.log('✅ Relayer stopped');

    console.log('\n🎉 Full Relayer Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Server connectivity');
    console.log('   ✅ EVM HTLC operations');
    console.log('   ✅ Stellar HTLC operations');
    console.log('   ✅ Cross-chain intent creation');
    console.log('   ✅ Preimage verification');
    console.log('   ✅ Withdrawal operations');
    console.log('   ✅ Relayer service');
    console.log('   ✅ Full cross-chain swap flow');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check server is running: npm run start:dev');
    console.log('   2. Verify .env configuration');
    console.log('   3. Check contract addresses and balances');
    console.log('   4. Verify network connectivity');
    
    if (error.response?.status) {
      console.log(`   HTTP Status: ${error.response.status}`);
    }
  }
}

testFullRelayer(); 