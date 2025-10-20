// Test MCP connection and available tools
const axios = require('axios');

async function testMCP() {
  try {
    console.log('🔍 Testing MCP connection...');
    
    // Test health check first
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test a simple transaction analysis
    console.log('\n🔍 Testing transaction analysis with MCP...');
    const txResponse = await axios.post('http://localhost:3000/api/analyze/transaction', {
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      chainId: 1
    });
    
    console.log('📊 Transaction analysis result:');
    console.log(JSON.stringify(txResponse.data, null, 2));
    
    // Test wallet analysis
    console.log('\n🔍 Testing wallet analysis with MCP...');
    const walletResponse = await axios.post('http://localhost:3000/api/analyze/wallet', {
      address: '0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55',
      chainId: 11155111 // Sepolia
    });
    
    console.log('👛 Wallet analysis result:');
    console.log(JSON.stringify(walletResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  }
}

testMCP();

