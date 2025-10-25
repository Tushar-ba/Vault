const axios = require('axios');

async function testEnhancedContractAnalysis() {
  const testQuery = {
    "message": "Analyze this contract (0x067578da19fD94c8F1c9A8CEBbcC8ADB6421dae4) on base sepolia testnet and fetch me the most recent transaction and the event it has emitted"
  };

  try {
    console.log('🧪 Testing Enhanced Contract Analysis...\n');
    console.log('📤 Query:', JSON.stringify(testQuery, null, 2));
    
    const response = await axios.post('http://localhost:3000/chat', testQuery, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });

    console.log('\n✅ Response received!\n');
    console.log('📊 Enhanced Analysis Result:');
    console.log('=' .repeat(50));
    console.log(response.data.response);
    console.log('=' .repeat(50));
    
    if (response.data.toolCalls) {
      console.log(`\n🔧 Tool calls made: ${response.data.toolCalls.length}`);
      response.data.toolCalls.forEach((call, index) => {
        console.log(`${index + 1}. ${call.tool}`);
        console.log(`   Args: ${JSON.stringify(call.args)}`);
      });
    }
    
    // Check if enhanced features are present
    const hasTransactionData = response.data.response.includes('RECENT TRANSACTION ANALYSIS');
    const hasSecurityAssessment = response.data.response.includes('SECURITY ASSESSMENT');
    const hasRecommendations = response.data.response.includes('RECOMMENDATIONS');
    const hasProxyInfo = response.data.response.includes('PROXY IMPLEMENTATION');
    
    console.log('\n🔍 Enhancement Check:');
    console.log(`✅ Recent Transaction Analysis: ${hasTransactionData ? 'Present' : 'Missing'}`);
    console.log(`✅ Security Assessment: ${hasSecurityAssessment ? 'Present' : 'Missing'}`);
    console.log(`✅ Recommendations: ${hasRecommendations ? 'Present' : 'Missing'}`);
    console.log(`✅ Proxy Information: ${hasProxyInfo ? 'Present' : 'Missing'}`);
    
    if (hasTransactionData && hasSecurityAssessment && hasRecommendations) {
      console.log('\n🎉 SUCCESS: Enhanced contract analysis is working!');
    } else {
      console.log('\n⚠️  PARTIAL: Some enhanced features may be missing.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testEnhancedContractAnalysis();