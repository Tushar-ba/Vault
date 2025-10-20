import { BlockscoutMCPAgent } from '../src/blockscout-mcp-agent.js';
import { EnhancedBlockscoutAgent } from '../src/enhanced-agent.js';
import { config } from '../src/config/index.js';

// Example 1: Basic Transaction Analysis
async function basicTransactionAnalysis() {
  console.log('🔍 Basic Transaction Analysis Example');
  console.log('=====================================');
  
  const agent = new BlockscoutMCPAgent();
  await agent.initialize();
  
  const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const result = await agent.analyzeTransaction(txHash, 1); // Ethereum mainnet
  
  if (result.success) {
    console.log('✅ Transaction analysis completed');
    console.log('Result:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Transaction analysis failed:', result.error);
  }
  
  await agent.disconnect();
}

// Example 2: Streaming Analysis
async function streamingAnalysis() {
  console.log('\n🌊 Streaming Analysis Example');
  console.log('==============================');
  
  const agent = new BlockscoutMCPAgent();
  await agent.initialize();
  
  const prompt = 'Analyze the DeFi ecosystem and identify the top 5 protocols by TVL';
  
  console.log('Starting streaming analysis...');
  for await (const chunk of agent.streamAnalysis(prompt)) {
    process.stdout.write(chunk);
  }
  console.log('\n✅ Streaming analysis completed');
  
  await agent.disconnect();
}

// Example 3: Multi-Chain Analysis
async function multiChainAnalysis() {
  console.log('\n🌐 Multi-Chain Analysis Example');
  console.log('=================================');
  
  const agent = new BlockscoutMCPAgent();
  await agent.initialize();
  
  const address = '0x1234567890abcdef1234567890abcdef12345678';
  const result = await agent.multiChainAnalysis(address);
  
  if (result.success) {
    console.log('✅ Multi-chain analysis completed');
    console.log('Result:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Multi-chain analysis failed:', result.error);
  }
  
  await agent.disconnect();
}

// Example 4: Whale Tracking
async function whaleTracking() {
  console.log('\n🐋 Whale Tracking Example');
  console.log('==========================');
  
  const agent = new EnhancedBlockscoutAgent();
  await agent.initialize();
  
  const tokenAddress = '0xA0b86a33E6441c8C06DDD4C4c4c4c4c4c4c4c4c4c'; // USDC
  const thresholdUSD = 1000000; // $1M threshold
  
  const movements = await agent.trackWhaleMovements(tokenAddress, thresholdUSD);
  
  console.log(`✅ Found ${movements.length} whale movements`);
  movements.forEach((movement, index) => {
    console.log(`Movement ${index + 1}:`);
    console.log(`  Address: ${movement.address}`);
    console.log(`  Amount: ${movement.amount}`);
    console.log(`  Value: $${movement.valueUSD.toLocaleString()}`);
    console.log(`  Type: ${movement.type}`);
    console.log(`  Risk Level: ${movement.riskLevel}`);
    console.log('');
  });
  
  await agent.disconnect();
}

// Example 5: Vulnerability Scanning
async function vulnerabilityScanning() {
  console.log('\n🔒 Vulnerability Scanning Example');
  console.log('===================================');
  
  const agent = new EnhancedBlockscoutAgent();
  await agent.initialize();
  
  const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const vulnerabilities = await agent.scanForVulnerabilities(contractAddress);
  
  console.log(`✅ Found ${vulnerabilities.length} vulnerabilities`);
  vulnerabilities.forEach((vuln, index) => {
    console.log(`Vulnerability ${index + 1}:`);
    console.log(`  Type: ${vuln.type}`);
    console.log(`  Severity: ${vuln.severity}`);
    console.log(`  Description: ${vuln.description}`);
    console.log(`  Recommendation: ${vuln.recommendation}`);
    console.log('');
  });
  
  await agent.disconnect();
}

// Example 6: DeFi Yield Optimization
async function yieldOptimization() {
  console.log('\n💰 DeFi Yield Optimization Example');
  console.log('====================================');
  
  const agent = new EnhancedBlockscoutAgent();
  await agent.initialize();
  
  const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const opportunities = await agent.optimizeYield(walletAddress);
  
  console.log(`✅ Found ${opportunities.length} yield opportunities`);
  opportunities.forEach((opp, index) => {
    console.log(`Opportunity ${index + 1}:`);
    console.log(`  Protocol: ${opp.protocol}`);
    console.log(`  Token: ${opp.token}`);
    console.log(`  Current APY: ${opp.currentAPY}%`);
    console.log(`  Projected APY: ${opp.projectedAPY}%`);
    console.log(`  Risk Score: ${opp.riskScore}/10`);
    console.log(`  Recommendation: ${opp.recommendation}`);
    console.log('');
  });
  
  await agent.disconnect();
}

// Example 7: Market Manipulation Detection
async function marketManipulationDetection() {
  console.log('\n📈 Market Manipulation Detection Example');
  console.log('==========================================');
  
  const agent = new EnhancedBlockscoutAgent();
  await agent.initialize();
  
  const tokenAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const patterns = await agent.detectMarketManipulation(tokenAddress);
  
  console.log(`✅ Found ${patterns.length} manipulation patterns`);
  patterns.forEach((pattern, index) => {
    console.log(`Pattern ${index + 1}:`);
    console.log(`  Type: ${pattern.type}`);
    console.log(`  Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
    console.log(`  Description: ${pattern.description}`);
    console.log(`  Impact: ${pattern.impact}`);
    console.log(`  Participants: ${pattern.participants.join(', ')}`);
    console.log('');
  });
  
  await agent.disconnect();
}

// Example 8: Portfolio Analysis
async function portfolioAnalysis() {
  console.log('\n📊 Portfolio Analysis Example');
  console.log('==============================');
  
  const agent = new EnhancedBlockscoutAgent();
  await agent.initialize();
  
  const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const result = await agent.getPortfolioAnalysis(walletAddress);
  
  if (result.success) {
    console.log('✅ Portfolio analysis completed');
    console.log('Result:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Portfolio analysis failed:', result.error);
  }
  
  await agent.disconnect();
}

// Example 9: Risk Score Calculation
async function riskScoreCalculation() {
  console.log('\n⚠️ Risk Score Calculation Example');
  console.log('===================================');
  
  const agent = new EnhancedBlockscoutAgent();
  await agent.initialize();
  
  const address = '0x1234567890abcdef1234567890abcdef12345678';
  const riskScore = await agent.getRiskScore(address);
  
  console.log(`✅ Risk score calculated: ${riskScore}/100`);
  
  let riskLevel;
  if (riskScore <= 25) riskLevel = 'Low Risk';
  else if (riskScore <= 50) riskLevel = 'Medium Risk';
  else if (riskScore <= 75) riskLevel = 'High Risk';
  else riskLevel = 'Critical Risk';
  
  console.log(`Risk Level: ${riskLevel}`);
  
  await agent.disconnect();
}

// Example 10: WebSocket Client
async function webSocketClient() {
  console.log('\n🔌 WebSocket Client Example');
  console.log('============================');
  
  const WebSocket = require('ws');
  const ws = new WebSocket('ws://localhost:3001');
  
  ws.on('open', () => {
    console.log('✅ Connected to WebSocket server');
    
    // Subscribe to alerts
    ws.send(JSON.stringify({
      type: 'subscribe-alerts',
      data: { address: '0x1234567890abcdef1234567890abcdef12345678' }
    }));
    
    // Request analysis
    ws.send(JSON.stringify({
      type: 'analyze-wallet',
      data: { address: '0x1234567890abcdef1234567890abcdef12345678' }
    }));
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 Received message:', message);
  });
  
  ws.on('close', () => {
    console.log('❌ WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error);
  });
  
  // Close connection after 10 seconds
  setTimeout(() => {
    ws.close();
  }, 10000);
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 Running Blockscout MCP Agent Examples');
  console.log('==========================================');
  
  try {
    await basicTransactionAnalysis();
    await streamingAnalysis();
    await multiChainAnalysis();
    await whaleTracking();
    await vulnerabilityScanning();
    await yieldOptimization();
    await marketManipulationDetection();
    await portfolioAnalysis();
    await riskScoreCalculation();
    await webSocketClient();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run specific example if provided as argument
const example = process.argv[2];
if (example) {
  switch (example) {
    case 'transaction':
      basicTransactionAnalysis();
      break;
    case 'streaming':
      streamingAnalysis();
      break;
    case 'multichain':
      multiChainAnalysis();
      break;
    case 'whale':
      whaleTracking();
      break;
    case 'vulnerability':
      vulnerabilityScanning();
      break;
    case 'yield':
      yieldOptimization();
      break;
    case 'manipulation':
      marketManipulationDetection();
      break;
    case 'portfolio':
      portfolioAnalysis();
      break;
    case 'risk':
      riskScoreCalculation();
      break;
    case 'websocket':
      webSocketClient();
      break;
    default:
      console.log('Available examples: transaction, streaming, multichain, whale, vulnerability, yield, manipulation, portfolio, risk, websocket');
  }
} else {
  runAllExamples();
}

