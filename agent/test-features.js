#!/usr/bin/env node

// Test script for all the fun features
const API_BASE = 'http://localhost:3000';

// Fun test cases
const testCases = [
  {
    name: "🔍 Address Safety Check",
    message: "Is this address safe? 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55",
    description: "Multi-chain address risk analysis"
  },
  {
    name: "💸 Transaction Analysis", 
    message: "Analyze this transaction: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    description: "Comprehensive transaction investigation"
  },
  {
    name: "🏗️ Contract Interactions",
    message: "What contracts has 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 interacted with?",
    description: "Smart contract and protocol analysis"
  },
  {
    name: "🪙 Token Portfolio",
    message: "What tokens does 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D hold?",
    description: "Token holdings and interactions"
  },
  {
    name: "🕵️ Suspicious Activity",
    message: "Is this address involved in any hacks? 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55",
    description: "Security and compliance check"
  },
  {
    name: "🎯 Risk Assessment",
    message: "What's the risk score for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?",
    description: "Comprehensive risk analysis"
  }
];

async function testFeature(testCase) {
  console.log(`\n${testCase.name}`);
  console.log(`📝 ${testCase.description}`);
  console.log(`💬 Query: "${testCase.message}"`);
  console.log('⏳ Analyzing...');

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testCase.message
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Analysis completed!');
      console.log('📊 Response preview:');
      console.log(data.response.substring(0, 300) + '...\n');
    } else {
      console.log('❌ Analysis failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Testing Blockchain Intelligence Agent Features\n');
  console.log('=' .repeat(60));

  // Test health first
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Agent is healthy and ready!');
    console.log(`📡 Status: ${healthData.status}`);
    console.log(`🤖 Agent: ${healthData.agent}`);
  } catch (error) {
    console.log('❌ Agent is not running. Please start it with: npm run dev');
    return;
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🧪 Running feature tests...\n');

  // Run all test cases
  for (const testCase of testCases) {
    await testFeature(testCase);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🎉 All tests completed!');
  console.log('\n💡 Try these other fun queries:');
  console.log('   • "Is this transaction legit? [tx_hash]"');
  console.log('   • "What protocols does this address use? [address]"');
  console.log('   • "Show me the cross-chain activity for [address]"');
  console.log('   • "Are there any vulnerabilities in this contract? [address]"');
  console.log('   • "What\'s the story behind this transaction? [tx_hash]"');
}

// Run the tests
runAllTests().catch(console.error);
