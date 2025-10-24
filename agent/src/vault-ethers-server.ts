import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { ethers } from 'ethers';
import { VaultEthersAgent } from './vault-ethers-agent.js';
import { Logger } from './utils/logger.js';
import { config } from './config/index.js';

export interface VaultWebSocketMessage {
  type: 'trade_request' | 'price_update' | 'trade_result' | 'error' | 'status';
  data: any;
  timestamp: Date;
  clientId?: string;
}

export class VaultEthersWebSocketServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private vaultAgent: VaultEthersAgent;
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
    this.vaultAgent = new VaultEthersAgent();
    this.logger = new Logger('VaultEthersWebSocketServer');
    
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
        type: 'vault-ethers-server',
        features: {
          ethers: true,
          rpc: true,
          blockchain: true,
          realTimeUpdates: true
        }
      });
    });

    // Get token price via RPC
    this.app.get('/api/price/:tokenAddress', async (req, res) => {
      try {
        const tokenAddress = req.params.tokenAddress;
        const result = await this.vaultAgent.getTokenPrice(tokenAddress);
        
        res.json({
          success: result.success,
          data: result.data,
          error: result.error,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error getting token price:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get token price',
          timestamp: new Date()
        });
      }
    });

    // Get vault info via RPC
    this.app.get('/api/vault/info', async (req, res) => {
      try {
        const result = await this.vaultAgent.getVaultInfo();
        
        res.json({
          success: result.success,
          data: result.data,
          error: result.error,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error getting vault info:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get vault info',
          timestamp: new Date()
        });
      }
    });

    // Get all token prices via RPC
    this.app.get('/api/prices', async (req, res) => {
      try {
        const result = await this.vaultAgent.getAllTokenPrices();
        
        res.json({
          success: result.success,
          data: result.data,
          error: result.error,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error getting all token prices:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get token prices',
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

    // Execute transaction (buy/sell)
    this.app.post('/api/execute-transaction', async (req, res) => {
      try {
        const { operation, tokenAddress, amount, walletAddress } = req.body;
        
        if (!operation || !tokenAddress || !amount || !walletAddress) {
          res.status(400).json({
            success: false,
            error: 'Missing required fields: operation, tokenAddress, amount, walletAddress',
            timestamp: new Date()
          });
          return;
        }

        // Real transaction execution - this endpoint is for reference only
        // The actual transactions are handled by MetaMask in the frontend
        this.logger.info(`📝 Transaction request: ${operation} ${amount} tokens`);
        
        res.json({
          success: true,
          data: {
            message: 'Transaction execution is handled by MetaMask in the frontend',
            operation,
            tokenAddress,
            amount,
            walletAddress
          },
          error: null,
          timestamp: new Date()
        });
      } catch (error) {
        this.logger.error('Error executing transaction:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to execute transaction',
          timestamp: new Date()
        });
      }
    });

    // Get agent capabilities
    this.app.get('/api/agent/capabilities', (req, res) => {
      res.json({
        success: true,
        data: {
          features: {
            ethers: true,
            rpc: true,
            blockchain: true,
            realTimeUpdates: true,
            directContractCalls: true,
            transactionExecution: true,
            allowanceHandling: true
          },
          tools: [
            'getTokenPrice',
            'buyStockToken',
            'sellStockToken',
            'getVaultInfo',
            'getAllTokenPrices'
          ],
          supportedOperations: ['buy', 'sell', 'price', 'status'],
          chain: 'Sepolia Testnet',
          vaultAddress: '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b',
          rpcEndpoint: 'Direct blockchain calls via ethers.js'
        },
        timestamp: new Date()
      });
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
          vaultAddress: '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b',
          chainId: '11155111',
          serverType: 'vault-ethers-server',
          features: {
            ethers: true,
            rpc: true,
            blockchain: true,
            realTimeUpdates: true
          }
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
            data: { message: 'Processing trade request with RPC calls...' },
            timestamp: new Date()
          });

          // Process the trade request using ethers tools
          const result = await this.vaultAgent.processTradeRequest(data.message);
          
          // Send result back to client
          socket.emit('trade_result', {
            type: 'trade_completed',
            data: result,
            clientId: data.clientId || clientId,
            timestamp: new Date()
          });

          // Broadcast to all clients if it's a significant trade
          if (result.success && result.operation && ['buy', 'sell'].includes(result.operation)) {
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
          const tokenAddress = data.tokenAddress || '0x09572cED4772527f28c6Ea8E62B08C973fc47671';
          
          // Make direct RPC call to get price
          const result = await this.vaultAgent.getTokenPrice(tokenAddress);
          
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

      // Handle wallet connection requests
      socket.on('wallet_connect', async (data: { walletAddress?: string; privateKey?: string }) => {
        try {
          this.logger.info(`Wallet connection request from ${clientId}: ${data.walletAddress}`);
          
          // In a real implementation, this would handle wallet connection
          // For now, we'll just acknowledge the request
          socket.emit('wallet_status', {
            type: 'wallet_connected',
            data: {
              walletAddress: data.walletAddress || 'mock_wallet_address',
              connected: true,
              chainId: '11155111',
              message: 'Wallet connected successfully (ready for RPC calls)'
            },
            timestamp: new Date()
          });

        } catch (error) {
          this.logger.error('Error handling wallet connection:', error);
          
          socket.emit('error', {
            type: 'wallet_error',
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
    // Update prices every 30 seconds via RPC calls
    this.priceUpdateInterval = setInterval(async () => {
      try {
        if (this.connectedClients.size > 0) {
          // Get Tesla token price directly
          const result = await this.vaultAgent.getTokenPrice('0x09572cED4772527f28c6Ea8E62B08C973fc47671');
          
          if (result.success) {
            this.io.emit('price_update', {
              type: 'periodic_price_update',
              data: {
                success: true,
                data: {
                  price: result.data?.price,
                  currency: 'PYUSD',
                  tokenAddress: '0x09572cED4772527f28c6Ea8E62B08C973fc47671'
                }
              },
              timestamp: new Date()
            });
          }
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
        this.logger.info(`🚀 Vault Ethers WebSocket Server running on port ${port}`);
        this.logger.info(`📊 Vault Address: 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b`);
        this.logger.info(`⛓️ Chain: Sepolia Testnet (11155111)`);
        this.logger.info(`🔗 WebSocket: ws://localhost:${port}`);
        this.logger.info(`🌐 HTTP API: http://localhost:${port}`);
        this.logger.info(`🤖 Agent Type: Ethers.js + Direct RPC Calls`);
        this.logger.info(`🛠️ Features: Real blockchain calls, Transaction execution`);
      });

      // Price updates only when requested - no periodic updates

      // Graceful shutdown handling
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  private async shutdown(): Promise<void> {
    this.logger.info('Shutting down Vault Ethers WebSocket Server...');
    
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
                     process.argv[1].includes('vault-ethers-server');

if (isMainModule) {
  const server = new VaultEthersWebSocketServer();
  const port = parseInt(process.env.PORT || '3001');
  
  console.log('🚀 Starting Vault Ethers WebSocket Server...');
  
  server.start(port).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
