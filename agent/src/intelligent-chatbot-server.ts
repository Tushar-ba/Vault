import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';
import { IntelligentBlockchainAgent } from './intelligent-agent.js';

const app = express();
const logger = new Logger('IntelligentChatbotServer');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize the intelligent agent
let agent: IntelligentBlockchainAgent;

async function initializeAgent() {
  try {
    agent = new IntelligentBlockchainAgent();
    await agent.initialize();
    logger.info('Intelligent agent initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize agent:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agentReady: agent?.isInitialized || false,
    timestamp: new Date().toISOString()
  });
});

// Main chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, chainId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    logger.info(`Chat request: ${message}`);

    const result = await agent.chat(message, chainId);

    return res.json({
      success: result.success,
      response: result.data?.response || result.error,
      toolCalls: result.data?.toolCalls,
      iterations: result.data?.iterations,
      timestamp: result.timestamp,
      chainId: chainId || 'auto'
    });

  } catch (error) {
    logger.error('Error processing chat:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Clear conversation history
app.post('/clear', (req, res) => {
  try {
    agent.clearHistory();
    res.json({
      success: true,
      message: 'Conversation history cleared'
    });
  } catch (error) {
    logger.error('Error clearing history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available tools
app.get('/tools', (req, res) => {
  try {
    res.json({
      success: true,
      tools: agent.availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema?.properties || {}
      }))
    });
  } catch (error) {
    logger.error('Error getting tools:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Example queries endpoint
app.get('/examples', (req, res) => {
  res.json({
    success: true,
    examples: [
      {
        category: 'Gas Analysis',
        queries: [
          'What was my total gas spend in the last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?',
          'Show me the gas fees for the last 5 transactions on Optimism',
          'What was the average gas price in my recent transactions?'
        ]
      },
      {
        category: 'Transaction Queries',
        queries: [
          'What is the last transaction for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?',
          'Show me recent transactions for vitalik.eth',
          'Get the last 20 transactions and show me which ones were contract interactions'
        ]
      },
      {
        category: 'Token Analysis',
        queries: [
          'What is the total supply of this token: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984?',
          'How many tokens does the creator hold?',
          'What restrictions does this token contract have?',
          'Is this token safe to interact with?'
        ]
      },
      {
        category: 'Creator Investigation',
        queries: [
          'Show me all tokens created by this address: 0xABC123...',
          'What was the behavior of this token creator in their past projects?',
          'Has this creator launched rug-pulls before?'
        ]
      },
      {
        category: 'Contract Safety',
        queries: [
          'Analyze the transaction pattern of this contract and tell me if it\'s safe',
          'Is this contract verified? What does it do?',
          'What are the security risks of this contract?'
        ]
      },
      {
        category: 'Multi-Chain',
        queries: [
          'Show me my activity across all chains',
          'Where does this address have the most transactions?',
          'Compare my holdings on Ethereum vs Optimism'
        ]
      }
    ]
  });
});

// Start server
const PORT = config.apiPort || 3000;

initializeAgent().then(() => {
  app.listen(PORT, () => {
    logger.info(`🚀 Intelligent Blockchain Chatbot Server running on port ${PORT}`);
    logger.info(`📡 Health check: http://localhost:${PORT}/health`);
    logger.info(`💬 Chat endpoint: http://localhost:${PORT}/chat`);
    logger.info(`🔧 Available tools: http://localhost:${PORT}/tools`);
    logger.info(`📝 Example queries: http://localhost:${PORT}/examples`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await agent.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await agent.disconnect();
  process.exit(0);
});

