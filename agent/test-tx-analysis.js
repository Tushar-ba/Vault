const axios = require('axios');

async function testTransactionHashAnalysis() {
  const testQuery = {
    "message": "analyse this transaction hash 0x8c820443987eafcc822adc55b40d819c8d3863b2b50ff8ce4cb9178f155b1761 on sepolia testnet"
  };

  try {
    console.log('🧪 Testing Transaction Hash Analysis...\n');
    console.log('📤 Query:', JSON.stringify(testQuery, null, 2));
    
    const response = await axios.post('http://localhost:3000/chat', testQuery, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log('\n✅ Response received!\n');
    console.log('🔍 Transaction Analysis Result:');
    console.log('==========================================');
    console.log(response.data.response);
    console.log('==========================================');
    
    // Check if this is properly classified as transaction analysis
    if (response.data.response.includes('TRANSACTION ANALYSIS')) {
      console.log('\n✅ SUCCESS: Query correctly classified as transaction hash analysis!');
    } else {
      console.log('\n❌ ISSUE: Query not properly classified as transaction analysis.');
    }

    // Check if transaction details are present
    const expectedElements = [
      'TRANSACTION DETAILS',
      'From:',
      'To:',
      'Gas Used:',
      'METHOD CALL',
      'TOKEN TRANSFERS',
      'buyStock'
    ];

    const hasAllElements = expectedElements.every(element => 
      response.data.response.includes(element)
    );

    if (hasAllElements) {
      console.log('✅ SUCCESS: Response contains comprehensive transaction analysis!');
    } else {
      console.log('❌ ISSUE: Response missing some transaction analysis elements.');
    }
    
    if (response.data.toolCalls) {
      console.log(`\n🔧 Tool calls made: ${response.data.toolCalls.length}`);
      response.data.toolCalls.forEach((call, index) => {
        console.log(`${index + 1}. ${call.tool}`);
        if (call.args) {
          console.log(`   Args: ${JSON.stringify(call.args)}`);
        }
      });
    }
    
    console.log(`\n⏱️ Iterations: ${response.data.iterations}`);
    console.log(`🕒 Timestamp: ${response.data.timestamp}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

async function testContractAnalysis() {
  const testQuery = {
    "message": "Analyze this contract (0x067578da19fD94c8F1c9A8CEBbcC8ADB6421dae4) on base sepolia testnet and fetch me the most recent transaction and the event it has emitted"
  };

  try {
    console.log('\n\n🧪 Testing Enhanced Contract Analysis...\n');
    console.log('📤 Query:', JSON.stringify(testQuery, null, 2));
    
    const response = await axios.post('http://localhost:3000/chat', testQuery, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log('\n✅ Response received!\n');
    console.log('🔍 Contract Analysis Result:');
    console.log('==========================================');
    console.log(response.data.response);
    console.log('==========================================');
    
    // Check if this gets comprehensive contract analysis
    if (response.data.response.includes('CONTRACT ANALYSIS') && 
        response.data.response.length > 200) {
      console.log('\n✅ SUCCESS: Comprehensive contract analysis provided!');
    } else {
      console.log('\n❌ ISSUE: Contract analysis too basic or incorrect classification.');
    }
    
    if (response.data.toolCalls) {
      console.log(`\n🔧 Tool calls made: ${response.data.toolCalls.length}`);
      const hasAddressInfo = response.data.toolCalls.some(call => call.tool === 'get_address_info');
      const hasTransactions = response.data.toolCalls.some(call => call.tool === 'get_transactions_by_address');
      
      if (hasAddressInfo && hasTransactions) {
        console.log('✅ SUCCESS: Both address info and transactions fetched for comprehensive analysis!');
      } else {
        console.log('❌ ISSUE: Missing either address info or transaction data.');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run both tests
async function runTests() {
  await testTransactionHashAnalysis();
  await testContractAnalysis();
}

runTests();