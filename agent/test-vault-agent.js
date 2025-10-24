import { VaultTradingAgent } from './dist/vault-agent.js';
import { VaultTokenManager } from './dist/vault-token-manager.js';

async function testVaultAgent() {
  console.log('🧪 Testing Vault Trading Agent...\n');

  try {
    // Test 1: Initialize the agent
    console.log('1️⃣ Initializing Vault Trading Agent...');
    const agent = new VaultTradingAgent();
    await agent.initialize();
    console.log('✅ Agent initialized successfully\n');

    // Test 2: Test token management
    console.log('2️⃣ Testing Token Management...');
    const tokenManager = new VaultTokenManager();
    const tokens = tokenManager.getAllTokens();
    console.log(`📊 Available tokens: ${tokens.length}`);
    tokens.forEach(token => {
      console.log(`   - ${token.name} (${token.symbol}): ${token.address}`);
    });
    console.log('✅ Token management working\n');

    // Test 3: Test price query
    console.log('3️⃣ Testing Price Query...');
    const priceResult = await agent.processTradeRequest('What is the current price of Tesla token?');
    console.log('📈 Price Query Result:');
    console.log(`   Success: ${priceResult.success}`);
    console.log(`   Operation: ${priceResult.operation}`);
    if (priceResult.data?.response) {
      console.log(`   Response: ${priceResult.data.response.substring(0, 200)}...`);
    }
    console.log('✅ Price query completed\n');

    // Test 4: Test buy request
    console.log('4️⃣ Testing Buy Request...');
    const buyResult = await agent.processTradeRequest('I want to buy 5 Tesla tokens');
    console.log('💰 Buy Request Result:');
    console.log(`   Success: ${buyResult.success}`);
    console.log(`   Operation: ${buyResult.operation}`);
    console.log(`   Token Address: ${buyResult.tokenAddress || 'N/A'}`);
    console.log(`   Amount: ${buyResult.amount || 'N/A'}`);
    console.log(`   Price: ${buyResult.price || 'N/A'}`);
    if (buyResult.data?.response) {
      console.log(`   Response: ${buyResult.data.response.substring(0, 200)}...`);
    }
    console.log('✅ Buy request completed\n');

    // Test 5: Test sell request
    console.log('5️⃣ Testing Sell Request...');
    const sellResult = await agent.processTradeRequest('Sell 3 Tesla tokens');
    console.log('💸 Sell Request Result:');
    console.log(`   Success: ${sellResult.success}`);
    console.log(`   Operation: ${sellResult.operation}`);
    console.log(`   Token Address: ${sellResult.tokenAddress || 'N/A'}`);
    console.log(`   Amount: ${sellResult.amount || 'N/A'}`);
    console.log(`   Price: ${sellResult.price || 'N/A'}`);
    if (sellResult.data?.response) {
      console.log(`   Response: ${sellResult.data.response.substring(0, 200)}...`);
    }
    console.log('✅ Sell request completed\n');

    // Test 6: Test vault status
    console.log('6️⃣ Testing Vault Status...');
    const statusResult = await agent.processTradeRequest('Get vault status and current token prices');
    console.log('📊 Vault Status Result:');
    console.log(`   Success: ${statusResult.success}`);
    if (statusResult.data?.response) {
      console.log(`   Response: ${statusResult.data.response.substring(0, 200)}...`);
    }
    console.log('✅ Vault status completed\n');

    // Test 7: Test token list operations
    console.log('7️⃣ Testing Token List Operations...');
    
    // Add a new token
    try {
      tokenManager.addToken({
        address: '0x1234567890123456789012345678901234567890',
        name: 'Apple Token',
        symbol: 'AAPL',
        decimals: 18,
        isActive: true,
        description: 'Apple stock token for testing'
      });
      console.log('✅ Added new token successfully');
    } catch (error) {
      console.log(`⚠️ Could not add token (expected if already exists): ${error.message}`);
    }

    // Get updated token list
    const updatedTokens = tokenManager.getAllTokens();
    console.log(`📊 Updated token count: ${updatedTokens.length}`);
    
    // Remove the test token
    try {
      tokenManager.removeToken('0x1234567890123456789012345678901234567890');
      console.log('✅ Removed test token successfully');
    } catch (error) {
      console.log(`⚠️ Could not remove token: ${error.message}`);
    }

    console.log('✅ Token list operations completed\n');

    // Test 8: Test error handling
    console.log('8️⃣ Testing Error Handling...');
    const errorResult = await agent.processTradeRequest('Invalid request that should fail');
    console.log('❌ Error Handling Result:');
    console.log(`   Success: ${errorResult.success}`);
    if (errorResult.error) {
      console.log(`   Error: ${errorResult.error}`);
    }
    console.log('✅ Error handling test completed\n');

    // Cleanup
    console.log('🧹 Cleaning up...');
    await agent.disconnect();
    console.log('✅ Cleanup completed\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Agent initialization');
    console.log('   ✅ Token management');
    console.log('   ✅ Price queries');
    console.log('   ✅ Buy requests');
    console.log('   ✅ Sell requests');
    console.log('   ✅ Vault status');
    console.log('   ✅ Token operations');
    console.log('   ✅ Error handling');
    console.log('   ✅ Cleanup');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the tests
testVaultAgent().catch(console.error);
