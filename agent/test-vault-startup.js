import { VaultTradingAgent } from './dist/vault-agent.js';

async function testVaultStartup() {
  console.log('🧪 Testing Vault Agent Startup...\n');

  try {
    // Test 1: Initialize the agent
    console.log('1️⃣ Initializing Vault Trading Agent...');
    const agent = new VaultTradingAgent();
    
    console.log('✅ Agent created successfully');
    console.log(`📊 Vault Address: ${agent.VAULT_ADDRESS || '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b'}`);
    console.log(`⛓️  Chain ID: ${agent.CHAIN_ID || '11155111'}`);
    console.log(`🪙 Available Tokens: ${agent.getTokenList().length}`);
    
    // Show available tokens
    const tokens = agent.getTokenList();
    tokens.forEach(token => {
      console.log(`   - ${token.name} (${token.symbol}): ${token.address}`);
    });

    console.log('\n✅ Vault Agent startup test completed successfully!');
    console.log('\n📋 Ready to start the WebSocket server with:');
    console.log('   npm run dev:vault');
    console.log('\n🌐 Then access the web client at:');
    console.log('   http://localhost:3001/vault-client.html');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testVaultStartup().catch(console.error);
