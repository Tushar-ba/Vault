const axios = require('axios');

// Test prompts from the prompts file
const testPrompts = [
  // DeFi Protocol Analysis
  {
    category: "DeFi Protocols",
    message: "What DeFi protocols has 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 interacted with across all chains?",
    expected: ["DeFi", "protocol", "interactions", "contract"]
  },
  
  // Chain Comparison
  {
    category: "Chain Comparison", 
    message: "Compare the activity of 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 on Ethereum mainnet vs Sepolia testnet",
    expected: ["comparison", "vs", "ethereum", "sepolia"]
  },
  
  // Token Analysis
  {
    category: "Token Analysis",
    message: "What tokens does 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 hold across all chains?",
    expected: ["token", "holdings", "balance", "portfolio"]
  },
  
  // Gas Analysis
  {
    category: "Gas Analysis",
    message: "Calculate my total gas spend across all chains for the last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55",
    expected: ["gas", "spend", "efficiency", "breakdown"]
  },
  
  // Activity Ranking
  {
    category: "Activity Ranking",
    message: "Analyze transaction patterns for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 across all chains - which chain is most active?",
    expected: ["most active", "ranking", "activity score"]
  },
  
  // Comprehensive Report
  {
    category: "Comprehensive Report",
    message: "Generate a comprehensive report for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 including: balance, tokens, transaction count, and gas spend across all chains",
    expected: ["comprehensive", "report", "including", "balance"]
  }
];

async function testOptimizedResponses() {
  console.log('🧪 Testing Optimized MCP Response System\n');
  console.log('=' .repeat(60));
  
  for (let i = 0; i < testPrompts.length; i++) {
    const test = testPrompts[i];
    console.log(`\n${i + 1}. Testing: ${test.category}`);
    console.log('-'.repeat(40));
    console.log(`Query: ${test.message.substring(0, 80)}...`);
    
    try {
      const response = await axios.post('http://localhost:3000/chat', {
        message: test.message
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      if (response.data.success) {
        const responseText = response.data.response.toLowerCase();
        
        // Check if response is tailored (not generic)
        const isGeneric = responseText.includes('most active chain:') && 
                         responseText.includes('activity score:') &&
                         !test.expected.some(keyword => responseText.includes(keyword.toLowerCase()));
        
        if (isGeneric) {
          console.log('❌ GENERIC RESPONSE - Not tailored to query type');
        } else {
          console.log('✅ TAILORED RESPONSE - Matches query intent');
          
          // Check for expected keywords
          const foundKeywords = test.expected.filter(keyword => 
            responseText.includes(keyword.toLowerCase())
          );
          console.log(`   Keywords found: ${foundKeywords.join(', ')}`);
        }
        
        console.log(`   Tool calls: ${response.data.toolCalls?.length || 0}`);
        console.log(`   Response length: ${response.data.response.length} chars`);
        
        // Show first 200 characters of response
        console.log(`   Preview: ${response.data.response.substring(0, 200)}...`);
        
      } else {
        console.log('❌ REQUEST FAILED:', response.data.error);
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log('   Server not running? Start with: npm run dev');
        break;
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Testing Complete');
}

// Run the tests
testOptimizedResponses().catch(console.error);