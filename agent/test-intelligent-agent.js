/**
 * Test script for the Intelligent Blockchain Agent
 * Run with: node test-intelligent-agent.js
 */

const BASE_URL = 'http://localhost:3000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testChat(message, chainId = '1', description = '') {
  console.log(`\n${colors.cyan}════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}TEST: ${description}${colors.reset}`);
  console.log(`${colors.yellow}Query: ${message}${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════${colors.reset}\n`);

  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, chainId })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`${colors.green}✅ SUCCESS${colors.reset}`);
      console.log(`\n${colors.bright}Response:${colors.reset}`);
      console.log(data.response);
      
      if (data.toolCalls && data.toolCalls.length > 0) {
        console.log(`\n${colors.bright}Tool Calls (${data.toolCalls.length}):${colors.reset}`);
        data.toolCalls.forEach((call, i) => {
          console.log(`  ${i + 1}. ${colors.cyan}${call.tool}${colors.reset}`);
          console.log(`     Args: ${JSON.stringify(call.args, null, 2).split('\n').join('\n     ')}`);
        });
      }
      
      console.log(`\n${colors.bright}Iterations:${colors.reset} ${data.iterations}`);
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`Error: ${data.error}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ REQUEST FAILED${colors.reset}`);
    console.log(`Error: ${error.message}`);
  }

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function checkHealth() {
  console.log(`${colors.bright}Checking server health...${colors.reset}`);
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'healthy' && data.agentReady) {
      console.log(`${colors.green}✅ Server is healthy and agent is ready${colors.reset}\n`);
      return true;
    } else {
      console.log(`${colors.red}❌ Server not ready${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Cannot connect to server${colors.reset}`);
    console.log(`Make sure the server is running: npm run dev`);
    console.log(`Error: ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  console.log(`\n${colors.bright}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Intelligent Blockchain Agent - Test Suite         ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Check if server is running
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    process.exit(1);
  }

  // Test 1: Simple last transaction query
  await testChat(
    'What is the last transaction for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?',
    '1',
    'Simple Transaction Query'
  );

  // Test 2: Gas analysis for multiple transactions
  await testChat(
    'What was the total gas spend in the last 5 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?',
    '1',
    'Gas Analysis (Multiple Transactions)'
  );

  // Test 3: Token analysis on Sepolia
  await testChat(
    'Show me the token holdings for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55',
    '11155111',
    'Token Holdings Query (Sepolia)'
  );

  // Test 4: Multi-chain query
  await testChat(
    'Does address 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 have any activity on Optimism?',
    '10',
    'Multi-Chain Activity Check'
  );

  // Test 5: Contract/Token safety analysis
  await testChat(
    'Is this token safe to interact with: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984?',
    '1',
    'Token Safety Analysis (UNI Token)'
  );

  console.log(`\n${colors.bright}${colors.green}`);
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   All Tests Complete!                                ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  console.log(`\n${colors.cyan}Try more queries at:${colors.reset} http://localhost:3000/examples`);
  console.log(`${colors.cyan}View available tools:${colors.reset} http://localhost:3000/tools\n`);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

