import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { SimpleBlockscoutAgent } from './simple-agent.js';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';

export class SimpleServer {
  private app: express.Application;
  private agent: SimpleBlockscoutAgent;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.agent = new SimpleBlockscoutAgent();
    this.logger = new Logger('SimpleServer');

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS
    this.app.use(cors());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        agent: this.agent ? 'connected' : 'disconnected'
      });
    });

    // Transaction analysis
    this.app.post('/api/analyze/transaction', async (req, res) => {
      try {
        const { txHash, chainId } = req.body;
        
        if (!txHash) {
          res.status(400).json({ error: 'Transaction hash is required' });
          return;
        }
        
        const result = await this.agent.analyzeTransaction(txHash, chainId);
        res.json(result);
      } catch (error) {
        this.logger.error('Transaction analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Wallet analysis
    this.app.post('/api/analyze/wallet', async (req, res) => {
      try {
        const { address, chainId } = req.body;
        
        if (!address) {
          res.status(400).json({ error: 'Address is required' });
          return;
        }
        
        const result = await this.agent.analyzeWallet(address, chainId);
        res.json(result);
      } catch (error) {
        this.logger.error('Wallet analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Contract analysis
    this.app.post('/api/analyze/contract', async (req, res) => {
      try {
        const { address, chainId } = req.body;
        
        if (!address) {
          res.status(400).json({ error: 'Address is required' });
          return;
        }
        
        const result = await this.agent.analyzeContract(address, chainId);
        res.json(result);
      } catch (error) {
        this.logger.error('Contract analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Custom analysis
    this.app.post('/api/analyze/custom', async (req, res) => {
      try {
        const { prompt } = req.body;
        
        if (!prompt) {
          res.status(400).json({ error: 'Prompt is required' });
          return;
        }
        
        const result = await this.agent.executeCustomPrompt(prompt);
        res.json(result);
      } catch (error) {
        this.logger.error('Custom analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Blockscout MCP Agent API',
        version: '1.0.0',
        description: 'AI-powered blockchain intelligence using Blockscout MCP with Gemini',
        endpoints: {
          'POST /api/analyze/transaction': {
            description: 'Analyze a blockchain transaction',
            parameters: {
              txHash: 'string (required) - Transaction hash',
              chainId: 'number (optional) - Chain ID'
            }
          },
          'POST /api/analyze/wallet': {
            description: 'Analyze a blockchain wallet',
            parameters: {
              address: 'string (required) - Wallet address',
              chainId: 'number (optional) - Chain ID'
            }
          },
          'POST /api/analyze/contract': {
            description: 'Analyze a smart contract',
            parameters: {
              address: 'string (required) - Contract address',
              chainId: 'number (optional) - Chain ID'
            }
          },
          'POST /api/analyze/custom': {
            description: 'Execute custom analysis prompt',
            parameters: {
              prompt: 'string (required) - Analysis prompt'
            }
          },
          'GET /health': {
            description: 'Health check endpoint'
          }
        }
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize agent
      await this.agent.initialize();
      this.logger.info('Simple Blockscout Agent initialized');

      // Start server
      this.app.listen(config.apiPort, () => {
        this.logger.info(`Simple API server running on port ${config.apiPort}`);
        this.logger.info(`API documentation: http://localhost:${config.apiPort}/api`);
        this.logger.info(`Health check: http://localhost:${config.apiPort}/health`);
      });
    } catch (error) {
      this.logger.error('Failed to start simple server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.agent.disconnect();
      this.logger.info('Simple server stopped');
    } catch (error) {
      this.logger.error('Error stopping simple server:', error);
    }
  }
}

// Start server if this file is run directly
if (process.argv[1] && process.argv[1].endsWith('simple-server.ts')) {
  const server = new SimpleServer();
  
  server.start().catch(console.error);
  
  // Graceful shutdown
  process.once('SIGINT', () => server.stop());
  process.once('SIGTERM', () => server.stop());
}
