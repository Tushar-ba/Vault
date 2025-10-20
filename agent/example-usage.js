// Simple example of how to give prompts to the AI agent
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function sendCustomPrompt(prompt) {
  console.log(`💬 Sending prompt: "${prompt}"`);
  
  try {
    const result = await axios.post(`${API_BASE}/api/analyze/custom`, {
      prompt: prompt
    });
    
    console.log('🤖 AI Response:');
    console.log(result.data.data);
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start it with: npm start');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 Simple Blockscout AI Agent - Prompt Examples\n');
  
  // Example prompts you can try
  const prompts = [
    "What is MEV and how does it work?",
    "Explain DeFi yield farming strategies",
    "What are the risks of using Uniswap?",
    "How does blockchain consensus work?",
    "What is a smart contract vulnerability?",
    "Explain the concept of gas fees in Ethereum"
  ];
  
  // Send each prompt
  for (const prompt of prompts) {
    await sendCustomPrompt(prompt);
  }
  
  console.log('✅ All prompts sent! Try your own prompts by modifying this file.');
}

main();