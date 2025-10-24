import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { StateGraph, END, START } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

// Types for LangGraph state
interface VaultAgentState {
  messages: BaseMessage[];
  userMessage: string;
  vaultAddress: string;
  chainId: string;
  currentToken?: string;
  operation?: 'buy' | 'sell' | 'price' | 'status';
  amount?: string;
  price?: string;
  transactionHash?: string;
  error?: string;
  iteration: number;
  maxIterations: number;
  isComplete: boolean;
  result?: any;
}

// Tool definitions for vault operations
interface VaultTool {
  name: string;
  description: string;
  parameters: any;
  execute: (state: VaultAgentState) => Promise<any>;
}

export class VaultLangGraphAgent {
  private llm: ChatGoogleGenerativeAI;
  private logger: Logger;
  private mcpClient: any = null;
  private mcpConfig: any;
  private graph: any;
  private tools: Map<string, VaultTool> = new Map();
  public isInitialized: boolean = false;
  
  // Vault configuration
  private readonly VAULT_ADDRESS = '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b';
  private readonly CHAIN_ID = '11155111'; // Sepolia testnet
  private readonly PYUSD_ADDRESS = '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8'; // PYUSD on Sepolia
  
  // Token configuration
  private tokenList = [
    {
      address: '0x09572cED4772527f28c6Ea8E62B08C973fc47671',
      name: 'Tesla Token',
      symbol: 'TSLA',
      decimals: 18,
      isActive: true,
      defaultPrice: 2.50 // Default price in PYUSD
    }
  ];

  constructor() {
    this.logger = new Logger('VaultLangGraphAgent');
    
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.llm = new ChatGoogleGenerativeAI({
      apiKey: config.geminiApiKey,
      model: 'gemini-2.0-flash-exp',
      temperature: 0.1,
      maxOutputTokens: 4000,
    });

    this.initializeTools();
    this.buildGraph();
  }

  private initializeTools(): void {
    // Tool 1: Get Token Price
    this.tools.set('get_token_price', {
      name: 'get_token_price',
      description: 'Get the current price of a token from the vault contract',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'The token contract address'
          }
        },
        required: ['tokenAddress']
      },
      execute: async (state: VaultAgentState) => {
        try {
          const token = this.tokenList.find(t => t.address.toLowerCase() === state.currentToken?.toLowerCase());
          if (!token) {
            throw new Error('Token not found in vault');
          }
          
          // In a real implementation, this would call the vault contract's getPrice function
          // For now, we'll use the default price
          const price = token.defaultPrice;
          
          this.logger.info(`💰 Token price for ${token.symbol}: $${price} PYUSD`);
          
          return {
            success: true,
            token: token.symbol,
            price: price,
            currency: 'PYUSD',
            tokenAddress: token.address
          };
        } catch (error) {
          this.logger.error('Error getting token price:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Tool 2: Buy Stock Token
    this.tools.set('buy_stock_token', {
      name: 'buy_stock_token',
      description: 'Buy stock tokens from the vault using PYUSD',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'The token contract address to buy'
          },
          amount: {
            type: 'string',
            description: 'Amount of tokens to buy (in whole tokens)'
          }
        },
        required: ['tokenAddress', 'amount']
      },
      execute: async (state: VaultAgentState) => {
        try {
          const token = this.tokenList.find(t => t.address.toLowerCase() === state.currentToken?.toLowerCase());
          if (!token) {
            throw new Error('Token not found in vault');
          }

          const amount = parseFloat(state.amount || '0');
          const price = token.defaultPrice;
          const totalCost = amount * price;

          this.logger.info(`🛒 Buying ${amount} ${token.symbol} tokens for ${totalCost} PYUSD`);

          // In a real implementation, this would:
          // 1. Check user's PYUSD balance
          // 2. Approve vault to spend PYUSD
          // 3. Call vault.buyStock(tokenAddress, amount)
          // 4. Return transaction hash

          const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

          return {
            success: true,
            operation: 'buy',
            token: token.symbol,
            amount: amount,
            price: price,
            totalCost: totalCost,
            transactionHash: mockTxHash,
            message: `Successfully bought ${amount} ${token.symbol} tokens for ${totalCost} PYUSD`
          };
        } catch (error) {
          this.logger.error('Error buying stock token:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Tool 3: Sell Stock Token
    this.tools.set('sell_stock_token', {
      name: 'sell_stock_token',
      description: 'Sell stock tokens back to the vault for PYUSD',
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'The token contract address to sell'
          },
          amount: {
            type: 'string',
            description: 'Amount of tokens to sell (in whole tokens)'
          }
        },
        required: ['tokenAddress', 'amount']
      },
      execute: async (state: VaultAgentState) => {
        try {
          const token = this.tokenList.find(t => t.address.toLowerCase() === state.currentToken?.toLowerCase());
          if (!token) {
            throw new Error('Token not found in vault');
          }

          const amount = parseFloat(state.amount || '0');
          const price = token.defaultPrice;
          const totalReceived = amount * price;

          this.logger.info(`💰 Selling ${amount} ${token.symbol} tokens for ${totalReceived} PYUSD`);

          // In a real implementation, this would:
          // 1. Check user's token balance
          // 2. Approve vault to spend tokens
          // 3. Call vault.sellStock(tokenAddress, amount)
          // 4. Return transaction hash

          const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

          return {
            success: true,
            operation: 'sell',
            token: token.symbol,
            amount: amount,
            price: price,
            totalReceived: totalReceived,
            transactionHash: mockTxHash,
            message: `Successfully sold ${amount} ${token.symbol} tokens for ${totalReceived} PYUSD`
          };
        } catch (error) {
          this.logger.error('Error selling stock token:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Tool 4: Get Vault Status
    this.tools.set('get_vault_status', {
      name: 'get_vault_status',
      description: 'Get the current status of the vault including available tokens and balances',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      execute: async (state: VaultAgentState) => {
        try {
          this.logger.info('📊 Getting vault status');

          const status = {
            vaultAddress: this.VAULT_ADDRESS,
            chainId: this.CHAIN_ID,
            availableTokens: this.tokenList.map(token => ({
              symbol: token.symbol,
              name: token.name,
              address: token.address,
              price: token.defaultPrice,
              isActive: token.isActive
            })),
            totalTokens: this.tokenList.length,
            timestamp: new Date().toISOString()
          };

          return {
            success: true,
            data: status
          };
        } catch (error) {
          this.logger.error('Error getting vault status:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Tool 5: MCP Blockchain Query (if MCP is available)
    this.tools.set('mcp_blockchain_query', {
      name: 'mcp_blockchain_query',
      description: 'Query blockchain data using MCP tools for additional context',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The blockchain query to execute'
          }
        },
        required: ['query']
      },
      execute: async (state: VaultAgentState) => {
        try {
          if (!this.mcpClient) {
            return {
              success: false,
              error: 'MCP client not available'
            };
          }

          this.logger.info(`🔍 MCP Query: ${state.userMessage}`);

          // Use MCP to get blockchain data
          const result = await this.mcpClient.callTool('get_address_info', {
            address: this.VAULT_ADDRESS,
            chain_id: this.CHAIN_ID
          });

          return {
            success: true,
            data: result,
            source: 'mcp'
          };
        } catch (error) {
          this.logger.error('Error in MCP query:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });
  }

  private buildGraph(): void {
    // For now, we'll implement a simple workflow without the complex StateGraph
    // This can be enhanced later with proper LangGraph implementation
    this.logger.info('Building simplified workflow (LangGraph implementation pending)');
  }

  private async analyzeRequest(state: VaultAgentState): Promise<Partial<VaultAgentState>> {
    this.logger.info(`🔍 Analyzing request: ${state.userMessage}`);

    const systemPrompt = `You are a vault trading agent. Analyze the user's request and determine:
1. What operation they want (buy, sell, price, status)
2. Which token they're referring to
3. What amount (if applicable)
4. Any additional context needed

Available tokens:
${this.tokenList.map(t => `- ${t.symbol} (${t.name}): ${t.address}`).join('\n')}

Respond with a JSON object containing:
{
  "operation": "buy|sell|price|status",
  "tokenAddress": "0x...",
  "amount": "number as string",
  "needsTool": "tool_name",
  "reasoning": "explanation"
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(state.userMessage)
    ];

    const response = await this.llm.invoke(messages);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    try {
      const analysis = JSON.parse(content);
      
      return {
        operation: analysis.operation,
        currentToken: analysis.tokenAddress,
        amount: analysis.amount,
        messages: [...state.messages, new AIMessage(content)]
      };
    } catch (error) {
      this.logger.error('Error parsing analysis:', error);
      return {
        error: 'Failed to analyze request',
        messages: [...state.messages, new AIMessage(content)]
      };
    }
  }

  private async executeTool(state: VaultAgentState): Promise<Partial<VaultAgentState>> {
    this.logger.info(`🔧 Executing tool for operation: ${state.operation}`);

    let toolName = '';
    let toolResult: any = {};

    switch (state.operation) {
      case 'price':
        toolName = 'get_token_price';
        break;
      case 'buy':
        toolName = 'buy_stock_token';
        break;
      case 'sell':
        toolName = 'sell_stock_token';
        break;
      case 'status':
        toolName = 'get_vault_status';
        break;
      default:
        // Try MCP query for additional context
        if (this.mcpClient) {
          toolName = 'mcp_blockchain_query';
        } else {
          toolName = 'get_vault_status';
        }
    }

    const tool = this.tools.get(toolName);
    if (tool) {
      try {
        toolResult = await tool.execute(state);
        this.logger.info(`✅ Tool ${toolName} executed successfully`);
      } catch (error) {
        this.logger.error(`❌ Tool ${toolName} failed:`, error);
        toolResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      toolResult = {
        success: false,
        error: `Tool ${toolName} not found`
      };
    }

    return {
      result: toolResult,
      messages: [...state.messages, new AIMessage(`Tool ${toolName} result: ${JSON.stringify(toolResult)}`)]
    };
  }

  private async generateResponse(state: VaultAgentState): Promise<Partial<VaultAgentState>> {
    this.logger.info('💬 Generating response');

    const systemPrompt = `You are a vault trading agent. Generate a clear, helpful response based on the tool execution result.

Format your response as:
- Clear explanation of what happened
- Transaction details if applicable
- Next steps for the user
- Any important warnings or information

Be concise but informative.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(state.userMessage),
      new AIMessage(`Tool result: ${JSON.stringify(state.result)}`)
    ];

    const response = await this.llm.invoke(messages);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    return {
      messages: [...state.messages, new AIMessage(content)]
    };
  }

  private async checkCompletion(state: VaultAgentState): Promise<Partial<VaultAgentState>> {
    this.logger.info(`✅ Checking completion (iteration ${state.iteration})`);

    // Check if we have a successful result and should complete
    const shouldComplete = state.result?.success || 
                          state.iteration >= state.maxIterations ||
                          state.error;

    return {
      isComplete: shouldComplete
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Vault LangGraph Agent...');

      // Initialize MCP client if available
      try {
        const mcpConfigPath = path.resolve(process.cwd(), 'mcp-config.json');
        if (fs.existsSync(mcpConfigPath)) {
          this.mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
          // MCP client initialization will be added when needed
          this.logger.info('✅ MCP config loaded (client initialization pending)');
        } else {
          this.logger.info('⚠️ MCP config not found, running without MCP');
        }
      } catch (error) {
        this.logger.warn('⚠️ MCP initialization failed, continuing without MCP:', error);
      }

      this.isInitialized = true;
      this.logger.info('✅ Vault LangGraph Agent initialized successfully');
      this.logger.info(`📊 Vault Address: ${this.VAULT_ADDRESS}`);
      this.logger.info(`⛓️ Chain: Sepolia Testnet (${this.CHAIN_ID})`);
      this.logger.info(`🛠️ Available Tools: ${this.tools.size}`);
      this.logger.info(`🪙 Available Tokens: ${this.tokenList.length}`);
    } catch (error) {
      this.logger.error('Failed to initialize:', error);
      throw error;
    }
  }

  async processTradeRequest(userMessage: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized');
    }

    try {
      this.logger.info(`💬 Processing trade request: ${userMessage}`);

      // Step 1: Analyze the request
      const analysis = await this.analyzeRequest({
        messages: [new HumanMessage(userMessage)],
        userMessage,
        vaultAddress: this.VAULT_ADDRESS,
        chainId: this.CHAIN_ID,
        iteration: 0,
        maxIterations: 10,
        isComplete: false
      });

      // Step 2: Execute appropriate tool
      const toolResult = await this.executeTool({
        messages: [new HumanMessage(userMessage)],
        userMessage,
        vaultAddress: this.VAULT_ADDRESS,
        chainId: this.CHAIN_ID,
        operation: analysis.operation,
        currentToken: analysis.currentToken,
        amount: analysis.amount,
        iteration: 1,
        maxIterations: 10,
        isComplete: false
      });

      // Step 3: Generate response
      const response = await this.generateResponse({
        messages: [new HumanMessage(userMessage)],
        userMessage,
        vaultAddress: this.VAULT_ADDRESS,
        chainId: this.CHAIN_ID,
        operation: analysis.operation,
        currentToken: analysis.currentToken,
        amount: analysis.amount,
        result: toolResult.result,
        iteration: 2,
        maxIterations: 10,
        isComplete: false
      });

      const lastMessage = response.messages?.[response.messages.length - 1];
      const finalResponse = lastMessage?.content || 'No response generated';

      return {
        success: !toolResult.error,
        data: {
          response: finalResponse,
          operation: analysis.operation,
          tokenAddress: analysis.currentToken,
          amount: analysis.amount,
          price: toolResult.result?.price,
          transactionHash: toolResult.result?.transactionHash,
          iterations: 3,
          toolResult: toolResult.result
        },
        error: toolResult.error,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error processing trade request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  // Utility methods
  addToken(token: any): void {
    this.tokenList.push(token);
    this.logger.info(`Added token: ${token.symbol}`);
  }

  removeToken(tokenAddress: string): void {
    const index = this.tokenList.findIndex(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    if (index >= 0) {
      const removed = this.tokenList.splice(index, 1)[0];
      this.logger.info(`Removed token: ${removed.symbol}`);
    }
  }

  getTokenList(): any[] {
    return [...this.tokenList];
  }

  async disconnect(): Promise<void> {
    try {
      if (this.mcpClient) {
        await this.mcpClient.disconnect();
      }
      this.isInitialized = false;
      this.logger.info('Vault LangGraph Agent disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting:', error);
    }
  }
}
