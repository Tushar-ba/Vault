// Simple Blockscout Chatbot Server
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { SimpleBlockscoutAgent } from './simple-agent.js';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';

const logger = new Logger('ChatbotServer');

export class ChatbotServer {
  private app: express.Application;
  private agent: SimpleBlockscoutAgent;
  private port: number;

  constructor() {
    this.app = express();
    this.agent = new SimpleBlockscoutAgent();
    this.port = config.apiPort;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        agent: this.agent.isInitialized ? 'connected' : 'disconnected'
      });
    });

    // Main chatbot endpoint
    this.app.post('/chat', async (req, res) => {
      try {
        const { message, chainId } = req.body;
        
        if (!message) {
          return res.status(400).json({ error: 'Message is required' });
        }

        logger.info(`Chat request: ${message}${chainId ? ` (Chain: ${chainId})` : ''}`);
        
        // Use the agent to process the message
        const result = await this.agent.executeCustomPrompt(message, chainId);
        
        return res.json({
          success: true,
          response: result.data,
          timestamp: new Date().toISOString(),
          chainId: chainId || 'auto'
        });
        
      } catch (error) {
        logger.error('Chat error:', error);
        return res.status(500).json({ 
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get available tools
    this.app.get('/tools', (req, res) => {
      res.json({
        success: true,
        tools: this.agent.availableTools || [],
        timestamp: new Date().toISOString()
      });
    });

    // Example prompts
    this.app.get('/examples', (req, res) => {
      res.json({
        success: true,
        examples: [
          // Address Analysis (Multi-chain)
          "Is this address safe? 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55",
          "Analyze this wallet: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
          "Is 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D a legitimate address?",
          "What's the risk score for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?",
          
          // Transaction Analysis (Multi-chain)
          "Analyze this transaction: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          "Is this transaction legit? 0x0d4110bf509c19a0715e3d45de48e732fa6f965b5f9db0484679babd4fc84a21",
          "What happened in this transaction? 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          
          // Contract Analysis
          "What contracts has 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 interacted with?",
          "Analyze the contract interactions for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
          "What protocols does this address use? 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
          
          // Token Analysis
          "What tokens has 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 interacted with?",
          "Show me all token interactions for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
          
          // General Queries
          "What is the latest block on Ethereum mainnet?",
          "What chains are supported by Blockscout?"
        ],
        timestamp: new Date().toISOString()
      });
    });

    // Test endpoint to check raw MCP data
    this.app.get('/test-mcp/:address', async (req, res) => {
      try {
        const address = req.params.address;
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return res.status(400).json({ error: 'Invalid address format' });
        }

        // Test MCP data fetching directly
        const mcpData = await this.agent.callMcpTool('get_tokens_by_address', { 
          address, 
          chain_id: '1', 
          page_size: 10 
        });

        return res.json({
          address,
          chain: 'Ethereum Mainnet',
          mcpData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return res.status(500).json({ 
          error: 'Failed to fetch MCP data', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize the agent first
      await this.agent.initialize();
      
      // Start the server
      this.app.listen(this.port, () => {
        logger.info(`🚀 Blockscout Chatbot Server running on port ${this.port}`);
        logger.info(`📡 Health check: http://localhost:${this.port}/health`);
        logger.info(`💬 Chat endpoint: http://localhost:${this.port}/chat`);
        logger.info(`🔧 Available tools: http://localhost:${this.port}/tools`);
        logger.info(`📝 Example prompts: http://localhost:${this.port}/examples`);
      });
    } catch (error) {
      logger.error('Failed to start Chatbot Server:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping Chatbot Server...');
    await this.agent.disconnect();
    logger.info('Chatbot Server stopped.');
  }
}

// Always start when this module is executed (works for both .ts and built .js)
const server = new ChatbotServer();
server.start().catch(console.error);

// Graceful shutdown
process.once('SIGINT', () => server.stop());
process.once('SIGTERM', () => server.stop());
