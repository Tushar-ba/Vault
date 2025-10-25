const axios = require('axios');

async function testMultiChainAnalysis() {
  const testPrompt = {
    "message": "Analyze transaction patterns for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 across all chains - which chain is most active?"
  };

  try {
    console.log('🧪 Testing optimized multi-chain analysis...\n');
    console.log('📤 Sending request:', JSON.stringify(testPrompt, null, 2));
    
    const response = await axios.post('http://localhost:3000/chat', testPrompt, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout for multi-chain analysis
    });

    console.log('\n✅ Response received!\n');
    console.log('📊 Analysis Result:');
    console.log('==================');
    console.log(response.data.response);
    console.log('\n==================');
    
    if (response.data.toolCalls) {
      console.log(`\n🔧 Tool calls made: ${response.data.toolCalls.length}`);
      response.data.toolCalls.forEach((call, index) => {
        console.log(`${index + 1}. ${call.tool} - Chain: ${call.args.chain_id}`);
      });
    }
    
    console.log(`\n⏱️ Iterations: ${response.data.iterations}`);
    console.log(`🕒 Timestamp: ${response.data.timestamp}`);
    
    // Check if the response properly identifies the most active chain
    if (response.data.response.includes('MOST ACTIVE CHAIN:')) {
      console.log('\n✅ SUCCESS: The analysis properly identifies the most active chain!');
    } else {
      console.log('\n❌ ISSUE: The analysis does not clearly identify the most active chain.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testMultiChainAnalysis();