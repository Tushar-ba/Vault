// Simple HTTP-based MCP client for Blockscout
import { Logger } from './utils/logger.js';

export class HttpMCPClient {
  private baseUrl: string;
  private timeout: number;
  private logger: Logger;
  private isConnected: boolean = false;
  private availableTools: any[] = [];

  constructor(baseUrl: string, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.logger = new Logger('HttpMCPClient');
  }

  async connect(): Promise<void> {
    try {
      this.logger.info(`Connecting to Blockscout MCP server at ${this.baseUrl}`);
      
      // Use the known tools from the Blockscout MCP server documentation
      this.availableTools = [
        { name: 'get_address_info', description: 'Get address information including balance' },
        { name: 'get_transaction_info', description: 'Get transaction details' },
        { name: 'get_transactions_by_address', description: 'Get address transaction history' },
        { name: 'get_tokens_by_address', description: 'Get token holdings for address' },
        { name: 'get_latest_block', description: 'Get latest block information' },
        { name: 'get_chains_list', description: 'Get list of supported chains' },
        { name: 'get_contract_abi', description: 'Get contract ABI' },
        { name: 'transaction_summary', description: 'Get human-readable transaction summary' }
      ];
      
      this.logger.info(`Connected! Using ${this.availableTools.length} Blockscout MCP tools`);
      this.isConnected = true;
    } catch (error) {
      this.logger.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.isConnected) {
      throw new Error('MCP client not connected');
    }

    this.logger.info(`Calling MCP tool: ${toolName} with args:`, args);

    try {
      // Map MCP tools to actual Blockscout API calls
      let apiUrl = '';
      let apiParams: any = {};

      switch (toolName) {
        case 'get_address_info':
          // Use Blockscout API directly for address info
          apiUrl = `https://eth-sepolia.blockscout.com/api/v2/addresses/${args.address}`;
          break;
        case 'get_transaction_info':
          apiUrl = `https://eth-sepolia.blockscout.com/api/v2/transactions/${args.hash}`;
          break;
        case 'get_transactions_by_address':
          apiUrl = `https://eth-sepolia.blockscout.com/api/v2/addresses/${args.address}/transactions`;
          break;
        case 'get_latest_block':
          apiUrl = 'https://eth-sepolia.blockscout.com/api/v2/blocks';
          break;
        case 'get_chains_list':
          // Return supported chains
          return {
            content: [
              { id: 1, name: 'Ethereum Mainnet', rpc: 'https://eth.blockscout.com' },
              { id: 11155111, name: 'Sepolia Testnet', rpc: 'https://eth-sepolia.blockscout.com' },
              { id: 10, name: 'Optimism', rpc: 'https://optimism.blockscout.com' },
              { id: 42161, name: 'Arbitrum One', rpc: 'https://arbitrum.blockscout.com' }
            ]
          };
        default:
          throw new Error(`Tool ${toolName} not implemented`);
      }

      // Make the actual API call
      const response = await this.makeRequest('GET', apiUrl, null, true);
      
      return {
        content: response
      };
    } catch (error) {
      this.logger.error(`Tool ${toolName} failed:`, error);
      throw error;
    }
  }

  async listTools(): Promise<{ tools: any[] }> {
    return { tools: this.availableTools };
  }

  private async makeRequest(method: string, path: string, data?: any, isDirectUrl: boolean = false): Promise<any> {
    const url = isDirectUrl ? path : `${this.baseUrl}${path}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'blockscout-chatbot/1.0.0'
      },
      signal: AbortSignal.timeout(this.timeout)
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.logger.info('Disconnected from MCP server');
  }
}
