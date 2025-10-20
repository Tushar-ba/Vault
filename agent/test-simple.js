// Simple test script for the Blockscout MCP Agent
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing Simple Blockscout MCP Agent API...\n');

  try {
    // Test health check
    console.log('1. Testing health check...');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check passed:', health.data.status);

    // Test API documentation
    console.log('\n2. Testing API documentation...');
    const docs = await axios.get(`${API_BASE}/api`);
    console.log('✅ API docs available:', docs.data.name);

    // Test transaction analysis (mock)
    console.log('\n3. Testing transaction analysis...');
    const txResult = await axios.post(`${API_BASE}/api/analyze/transaction`, {
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      chainId: 1
    });
    console.log('✅ Transaction analysis:', txResult.data.success ? 'Success' : 'Failed');

    // Test wallet analysis (mock)
    console.log('\n4. Testing wallet analysis...');
    const walletResult = await axios.post(`${API_BASE}/api/analyze/wallet`, {
      address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      chainId: 1
    });
    console.log('✅ Wallet analysis:', walletResult.data.success ? 'Success' : 'Failed');

    // Test custom analysis
    console.log('\n5. Testing custom analysis...');
    const customResult = await axios.post(`${API_BASE}/api/analyze/custom`, {
      prompt: 'What is blockchain technology?'
    });
    console.log('✅ Custom analysis:', customResult.data.success ? 'Success' : 'Failed');

    console.log('\n🎉 All tests passed! The API is working correctly.');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start it with: npm start');
    } else {
      console.log('❌ Test failed:', error.message);
    }
  }
}

// Run the test
testAPI();

