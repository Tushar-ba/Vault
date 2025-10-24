import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { VaultAIAgent } from './vault-ai-agent.js';
import { Logger } from './utils/logger.js';

export class VaultAIWebSocketServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private vaultAgent: VaultAIAgent;
  private logger: Logger;
  private connectedClients: Set<string> = new Set();

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
      },
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });
    
    this.vaultAgent = new VaultAIAgent();
    this.logger = new Logger('VaultAIWebSocketServer');

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocketHandlers();
  }

  private setupMiddleware(): void {
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }));
    
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connectedClients: this.connectedClients.size,
        type: 'vault-ai-server',
        features: {
          llm: true,
          toolCalling: true,
          blockchain: true,
          mcpIntegration: true,
          realTimeUpdates: true
        }
      });
    });

    // Chat endpoint (HTTP)
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message } = req.body;
        
        if (!message) {
          res.status(400).json({
            success: false,
            error: 'Message is required',
            timestamp: new Date()
          });
          return;
        }

        const result = await this.vaultAgent.chat(message);
        
        res.json({
          success: result.success,
          data: result.data,
          error: result.error,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error in chat endpoint:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          timestamp: new Date()
        });
      }
    });

    // Clear history endpoint
    this.app.post('/api/clear-history', (req, res) => {
      this.vaultAgent.clearHistory();
      res.json({
        success: true,
        message: 'Conversation history cleared',
        timestamp: new Date()
      });
    });
  }

  private setupWebSocketHandlers(): void {
    this.io.on('connection', (socket: any) => {
      const clientId = socket.id;
      this.connectedClients.add(clientId);
      this.logger.info(`✅ Client connected: ${clientId}`);
      this.logger.info(`📊 Total connected clients: ${this.connectedClients.size}`);

      // Send welcome message
      socket.emit('status', {
        type: 'connected',
        data: {
          serverType: 'vault-ai-server',
          vaultAddress: '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b',
          features: ['LLM', 'Tool Calling', 'Blockchain Analysis', 'MCP Integration']
        },
        timestamp: new Date()
      });

      // Handle chat messages
      socket.on('chat_message', async (data: { message: string }) => {
        this.logger.info(`💬 Chat from ${clientId}: ${data.message}`);
        
        try {
          const result = await this.vaultAgent.chat(data.message);
          
          socket.emit('chat_response', {
            type: 'chat_response',
            data: result,
            timestamp: new Date()
          });
        } catch (error) {
          this.logger.error('Error processing chat:', error);
          socket.emit('error', {
            type: 'error',
            data: {
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            timestamp: new Date()
          });
        }
      });

      // Handle wallet connection
      socket.on('wallet_connect', (data: { address: string }) => {
        this.logger.info(`🔗 Wallet connected from ${clientId}: ${data.address}`);
        socket.emit('wallet_status', {
          type: 'connected',
          data: { address: data.address },
          timestamp: new Date()
        });
      });

      // Handle clear history
      socket.on('clear_history', () => {
        this.vaultAgent.clearHistory();
        socket.emit('history_cleared', {
          type: 'history_cleared',
          data: { message: 'Conversation history cleared' },
          timestamp: new Date()
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.connectedClients.delete(clientId);
        this.logger.info(`❌ Client disconnected: ${clientId}`);
        this.logger.info(`📊 Total connected clients: ${this.connectedClients.size}`);
      });

      // Handle ping
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });
    });
  }

  async start(port: number = 3002): Promise<void> {
    this.server.listen(port, () => {
      this.logger.info(`🚀 Vault AI WebSocket Server running on port ${port}`);
      this.logger.info(`📊 Vault Address: 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b`);
      this.logger.info(`⛓️ Chain: Sepolia Testnet (11155111)`);
      this.logger.info(`🔗 WebSocket: ws://localhost:${port}`);
      this.logger.info(`🌐 HTTP API: http://localhost:${port}`);
      this.logger.info(`🤖 Agent Type: LLM + Tool Calling + MCP Integration`);
      this.logger.info(`🛠️ Features: Gemini 2.0 Flash, Real blockchain calls, Contract analysis`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private shutdown(): void {
    this.logger.info('Shutting down server...');
    this.io.close();
    this.server.close();
    process.exit(0);
  }
}

// Start the server
const server = new VaultAIWebSocketServer();
server.start(3002).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

