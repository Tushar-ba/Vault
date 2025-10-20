// Quick test script for sending prompts
const axios = require('axios');

async function testPrompt() {
  const prompt = process.argv[2] || "What is blockchain technology?";
  
  try {
    console.log(`🚀 Sending prompt: "${prompt}"`);
    
    const response = await axios.post('http://localhost:3000/api/analyze/custom', {
      prompt: prompt
    });
    
    console.log('\n🤖 AI Response:');
    console.log(response.data.data);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Start it with: npm start');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testPrompt();

