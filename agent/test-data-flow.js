// Quick test to verify data flow from MCP to LLM
// Run with: node test-data-flow.js

const axios = require('axios');

const testCases = [
  {
    name: 'Token Analysis - Base Sepolia',
    body: {
      message: 'What tokens does 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 hold?',
      chainId: '84532'
    }
  },
  {
    name: 'Address Safety - Sepolia',
    body: {
      message: 'Is this address safe? 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55',
      chainId: '11155111'
    }
  },
  {
    name: 'Raw MCP Data Test',
    endpoint: '/test-mcp/0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55',
    method: 'GET'
  }
];

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Test: ${test.name}`);
  console.log('='.repeat(60));

  try {
    const url = `http://localhost:3000${test.endpoint || '/chat'}`;
    const method = test.method || 'POST';
    
    console.log(`📤 Request: ${method} ${url}`);
    if (test.body) {
      console.log('📝 Body:', JSON.stringify(test.body, null, 2));
    }

    const response = method === 'GET'
      ? await axios.get(url)
      : await axios.post(url, test.body);

    console.log(`✅ Status: ${response.status}`);
    console.log('📥 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Check for specific issues
    if (response.data.response) {
      const responseText = response.data.response;
      if (responseText.includes('0 chains')) {
        console.log('❌ ISSUE: Response indicates 0 chains analyzed');
      }
      if (responseText.includes('empty dictionary') || responseText.includes('{}')) {
        console.log('❌ ISSUE: Empty data detected in response');
      }
      if (responseText.includes('No chain data')) {
        console.log('❌ ISSUE: No chain data message detected');
      }
    }

    if (response.data.mcpData) {
      console.log('✅ MCP Data retrieved successfully');
      console.log('📊 Data summary:', {
        hasData: !!response.data.mcpData.data,
        dataLength: response.data.mcpData.data?.length || 0,
        dataType: Array.isArray(response.data.mcpData.data) ? 'array' : typeof response.data.mcpData.data
      });
    }

  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Starting Data Flow Test');
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  // Check if server is running
  try {
    await axios.get('http://localhost:3000/health');
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm run dev');
    process.exit(1);
  }

  for (const test of testCases) {
    await runTest(test);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between tests
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🏁 Test Complete');
  console.log('='.repeat(60));
  console.log('\n💡 Tips:');
  console.log('- Check server logs for detailed debug output');
  console.log('- If seeing "0 chains", check MCP data parsing');
  console.log('- If quota exceeded, wait 24h or upgrade API key');
  console.log('- Use /test-mcp/:address to verify raw MCP data');
}

main().catch(console.error);

