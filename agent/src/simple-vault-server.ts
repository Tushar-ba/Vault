import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { SimpleVaultAgent, VaultTradeResult, TokenInfo } from './simple-vault-agent.js';
import { Logger } from './utils/logger.js';
import { config } from './config/index.js';

export interface VaultWebSocketMessage {
  type: 'trade_request' | 'price_update' | 'trade_result' | 'error' | 'status';
  data: any;
  timestamp: Date;
  clientId?: string;
}

export class SimpleVaultWebSocketServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private vaultAgent: SimpleVaultAgent;
  private logger: Logger;
  private connectedClients: Map<string, any> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
      },
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });
    this.vaultAgent = new SimpleVaultAgent();
    this.logger = new Logger('SimpleVaultWebSocketServer');
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocketHandlers();
  }

  private setupMiddleware(): void {
    // Configure helmet with more permissive settings for development
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for WebSocket connections
      crossOriginEmbedderPolicy: false
    }));
    
    // Configure CORS to allow WebSocket connections
    this.app.use(cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    }));
    
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        agentInitialized: this.vaultAgent.isInitialized,
        connectedClients: this.connectedClients.size,
        type: 'simple-vault-server'
      });
    });

    // Get token list
    this.app.get('/api/tokens', (req, res) => {
      try {
        const tokens = this.vaultAgent.getTokenList();
        res.json({
          success: true,
          data: tokens,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error getting token list:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get token list',
          timestamp: new Date()
        });
      }
    });

    // Add new token
    this.app.post('/api/tokens', (req, res) => {
      try {
        const token: TokenInfo = req.body;
        
        // Validate token data
        if (!token.address || !token.name || !token.symbol) {
          res.status(400).json({
            success: false,
            error: 'Missing required fields: address, name, symbol',
            timestamp: new Date()
          });
          return;
        }

        this.vaultAgent.addToken(token);
        
        // Broadcast token update to all connected clients
        this.io.emit('token_update', {
          type: 'token_added',
          data: token,
          timestamp: new Date()
        });

        res.json({
          success: true,
          message: 'Token added successfully',
          data: token,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error adding token:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to add token',
          timestamp: new Date()
        });
      }
    });

    // Remove token
    this.app.delete('/api/tokens/:address', (req, res) => {
      try {
        const tokenAddress = req.params.address;
        this.vaultAgent.removeToken(tokenAddress);
        
        // Broadcast token update to all connected clients
        this.io.emit('token_update', {
          type: 'token_removed',
          data: { address: tokenAddress },
          timestamp: new Date()
        });

        res.json({
          success: true,
          message: 'Token removed successfully',
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error removing token:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to remove token',
          timestamp: new Date()
        });
      }
    });

    // Get vault status
    this.app.get('/api/vault/status', async (req, res) => {
      try {
        if (!this.vaultAgent.isInitialized) {
          res.status(503).json({
            success: false,
            error: 'Vault agent not initialized',
            timestamp: new Date()
          });
          return;
        }

        // Get basic vault information
        const result = await this.vaultAgent.processTradeRequest('Get vault status and current token prices');
        
        res.json({
          success: true,
          data: result,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error getting vault status:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get vault status',
          timestamp: new Date()
        });
      }
    });

    // Process trade request via HTTP (alternative to WebSocket)
    this.app.post('/api/trade', async (req, res) => {
      try {
        const { message, clientId } = req.body;
        
        if (!message) {
          res.status(400).json({
            success: false,
            error: 'Message is required',
            timestamp: new Date()
          });
          return;
        }

        const result = await this.vaultAgent.processTradeRequest(message);
        
        // Broadcast trade result to all connected clients
        this.io.emit('trade_result', {
          type: 'trade_completed',
          data: result,
          clientId: clientId,
          timestamp: new Date()
        });

        res.json({
          success: true,
          data: result,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error processing trade:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to process trade',
          timestamp: new Date()
        });
      }
    });
  }

  private setupWebSocketHandlers(): void {
    this.io.on('connection', (socket: any) => {
      const clientId = socket.id;
      this.connectedClients.set(clientId, {
        socket,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      this.logger.info(`Client connected: ${clientId}`);
      this.logger.info(`Total connected clients: ${this.connectedClients.size}`);

      // Send welcome message with current status
      socket.emit('status', {
        type: 'connected',
        data: {
          clientId,
          agentInitialized: this.vaultAgent.isInitialized,
          availableTokens: this.vaultAgent.getTokenList(),
          vaultAddress: '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b',
          chainId: '11155111',
          serverType: 'simple-vault-server'
        },
        timestamp: new Date()
      });

      // Handle trade requests
      socket.on('trade_request', async (data: { message: string; clientId?: string }) => {
        try {
          this.logger.info(`Trade request from ${clientId}: ${data.message}`);
          
          // Update client activity
          const client = this.connectedClients.get(clientId);
          if (client) {
            client.lastActivity = new Date();
          }

          // Send processing status
          socket.emit('status', {
            type: 'processing',
            data: { message: 'Processing trade request...' },
            timestamp: new Date()
          });

          // Process the trade request
          const result = await this.vaultAgent.processTradeRequest(data.message);
          
          // Send result back to client
          socket.emit('trade_result', {
            type: 'trade_completed',
            data: result,
            clientId: data.clientId || clientId,
            timestamp: new Date()
          });

          // Broadcast to all clients if it's a significant trade
          if (result.success && (result.operation === 'buy' || result.operation === 'sell')) {
            this.io.emit('trade_broadcast', {
              type: 'trade_executed',
              data: {
                operation: result.operation,
                tokenAddress: result.tokenAddress,
                amount: result.amount,
                price: result.price,
                transactionHash: result.transactionHash
              },
              timestamp: new Date()
            });
          }

        } catch (error) {
          this.logger.error('Error processing trade request:', error);
          
          socket.emit('error', {
            type: 'trade_error',
            data: {
              error: error instanceof Error ? error.message : 'Unknown error',
              clientId: data.clientId || clientId
            },
            timestamp: new Date()
          });
        }
      });

      // Handle price update requests
      socket.on('price_request', async (data: { tokenAddress?: string }) => {
        try {
          const message = data.tokenAddress 
            ? `Get current price for token ${data.tokenAddress}`
            : 'Get current prices for all available tokens';
          
          const result = await this.vaultAgent.processTradeRequest(message);
          
          socket.emit('price_update', {
            type: 'price_data',
            data: result,
            timestamp: new Date()
          });

        } catch (error) {
          this.logger.error('Error getting price update:', error);
          
          socket.emit('error', {
            type: 'price_error',
            data: {
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            timestamp: new Date()
          });
        }
      });

      // Handle client disconnect
      socket.on('disconnect', () => {
        this.connectedClients.delete(clientId);
        this.logger.info(`Client disconnected: ${clientId}`);
        this.logger.info(`Total connected clients: ${this.connectedClients.size}`);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });
    });
  }

  private startPriceUpdates(): void {
    // Update prices every 30 seconds
    this.priceUpdateInterval = setInterval(async () => {
      try {
        if (this.connectedClients.size > 0) {
          const result = await this.vaultAgent.processTradeRequest('Get current prices for all tokens');
          
          this.io.emit('price_update', {
            type: 'periodic_price_update',
            data: result,
            timestamp: new Date()
          });
        }
      } catch (error) {
        this.logger.error('Error in periodic price update:', error);
      }
    }, 30000); // 30 seconds
  }

  private stopPriceUpdates(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
  }

  async start(port: number = 3001): Promise<void> {
    try {
      // Initialize the vault agent
      await this.vaultAgent.initialize();
      
      // Start the server
      this.server.listen(port, () => {
        this.logger.info(`🚀 Simple Vault WebSocket Server running on port ${port}`);
        this.logger.info(`📊 Vault Address: 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b`);
        this.logger.info(`⛓️  Chain: Sepolia Testnet (11155111)`);
        this.logger.info(`🔗 WebSocket: ws://localhost:${port}`);
        this.logger.info(`🌐 HTTP API: http://localhost:${port}`);
        this.logger.info(`🤖 Agent Type: Simple (No MCP dependency)`);
      });

      // Start periodic price updates
      this.startPriceUpdates();

      // Graceful shutdown handling
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  private async shutdown(): Promise<void> {
    this.logger.info('Shutting down Simple Vault WebSocket Server...');
    
    // Stop price updates
    this.stopPriceUpdates();
    
    // Disconnect vault agent
    await this.vaultAgent.disconnect();
    
    // Close all client connections
    this.io.close();
    
    // Close HTTP server
    this.server.close(() => {
      this.logger.info('Server shutdown complete');
      process.exit(0);
    });
  }

  // Public methods for external control
  getConnectedClients(): number {
    return this.connectedClients.size;
  }

  broadcastMessage(type: string, data: any): void {
    this.io.emit(type, {
      type,
      data,
      timestamp: new Date()
    });
  }

  sendToClient(clientId: string, type: string, data: any): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.socket.emit(type, {
        type,
        data,
        timestamp: new Date()
      });
    }
  }
}

// Start server if this file is run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1]) ||
                     process.argv[1].includes('simple-vault-server');

if (isMainModule) {
  const server = new SimpleVaultWebSocketServer();
  const port = parseInt(process.env.PORT || '3001');
  
  console.log('🚀 Starting Simple Vault WebSocket Server...');
  
  server.start(port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
