import { VaultAIAgent } from './src/vault-ai-agent.js';

console.log('🧪 Testing Token Resolution for Vault AI Agent\n');

async function testTokenResolution() {
  try {
    const agent = new VaultAIAgent();
    
    console.log('✅ Agent initialized successfully\n');
    
    // Test queries with different token identifiers
    const testQueries = [
      'Get Tesla price',
      'Buy 5 Google tokens',
      'What is the current price of Microsoft?',
      'How much will it cost to buy 3 TSLA?',
      'Calculate sell return for 2 GOOGL',
      'Sell 1 Microsoft token',
      'Get MSFT token info'
    ];
    
    console.log('🔍 Testing token resolution with various queries:\n');
    
    for (const query of testQueries) {
      console.log(`📝 Query: "${query}"`);
      try {
        const result = await agent.chat(query);
        
        if (result.success) {
          console.log('✅ Success:', result.data.response.substring(0, 100) + '...');
          if (result.data.toolCalls && result.data.toolCalls.length > 0) {
            const lastToolCall = result.data.toolCalls[result.data.toolCalls.length - 1];
            console.log(`🔧 Tool used: ${lastToolCall.tool}`);
            if (lastToolCall.args.token_address) {
              console.log(`🪙 Token resolved to: ${lastToolCall.args.token_address}`);
            }
          }
        } else {
          console.log('❌ Error:', result.error);
        }
      } catch (error) {
        console.log('❌ Exception:', error.message);
      }
      
      console.log('─'.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize agent:', error.message);
  }
}

testTokenResolution().catch(console.error);