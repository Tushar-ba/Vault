import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';
import { VaultEthersTools, VaultToolResult } from './vault-ethers-tools.js';

export interface VaultTradeResult {
  success: boolean;
  transactionHash?: string;
  data?: any;
  error?: string;
  timestamp: Date;
  operation: 'buy' | 'sell' | 'price' | 'status';
  tokenAddress?: string;
  amount?: string;
  price?: string;
}

export class VaultEthersAgent {
  private llm: ChatGoogleGenerativeAI;
  private logger: Logger;
  private ethersTools: VaultEthersTools;
  public isInitialized: boolean = false;
  private conversationHistory: any[] = [];
  private maxIterations: number = 5;
  
  // Vault contract configuration
  private readonly VAULT_ADDRESS = '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b';
  private readonly CHAIN_ID = '11155111'; // Sepolia testnet
  private readonly TESLA_TOKEN = '0x09572cED4772527f28c6Ea8E62B08C973fc47671';

  constructor() {
    this.logger = new Logger('VaultEthersAgent');
    
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.llm = new ChatGoogleGenerativeAI({
      apiKey: config.geminiApiKey,
      model: 'gemini-2.0-flash-exp',
      temperature: 0.1,
      maxOutputTokens: 4000,
    });

    this.ethersTools = new VaultEthersTools();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Vault Ethers Agent...');
      this.isInitialized = true;
      this.logger.info('✅ Vault Ethers Agent initialized successfully');
      this.logger.info(`📊 Vault Address: ${this.VAULT_ADDRESS}`);
      this.logger.info(`⛓️ Chain: Sepolia Testnet (${this.CHAIN_ID})`);
      this.logger.info(`🪙 Tesla Token: ${this.TESLA_TOKEN}`);
    } catch (error) {
      this.logger.error('Failed to initialize:', error);
      throw error;
    }
  }

  async processTradeRequest(userMessage: string): Promise<VaultTradeResult> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized');
    }

    try {
      this.logger.info(`💬 Trade Request: ${userMessage}`);
      
      const lowerMessage = userMessage.toLowerCase();
      let finalResponse = '';
      let operation: 'buy' | 'sell' | 'price' | 'status' = 'price';
      let tokenAddress = this.TESLA_TOKEN;
      let amount = '';
      let price = '';

      // Handle buy requests (check first to avoid conflicts)
      if (lowerMessage.includes('buy')) {
        operation = 'buy';
        const amountMatch = userMessage.match(/(\d+(?:\.\d+)?)/);
        amount = amountMatch ? amountMatch[1] : '1';
        
        try {
          const priceResult = await this.ethersTools.getTokenPrice(tokenAddress);
          if (priceResult.success) {
            price = priceResult.data?.price || '0';
            const totalCost = (parseFloat(amount) * parseFloat(price)).toFixed(6);
            finalResponse = `To buy ${amount} Tesla tokens:\n- Cost: ${totalCost} PYUSD (${amount} × $${price})\n- Ready to execute transaction with MetaMask`;
          } else {
            finalResponse = `Error getting price: ${priceResult.error}`;
          }
        } catch (error) {
          finalResponse = `Error getting price: ${error}`;
        }
      }
      // Handle sell requests
      else if (lowerMessage.includes('sell')) {
        operation = 'sell';
        const amountMatch = userMessage.match(/(\d+(?:\.\d+)?)/);
        amount = amountMatch ? amountMatch[1] : '1';
        
        try {
          const priceResult = await this.ethersTools.getTokenPrice(tokenAddress);
          if (priceResult.success) {
            price = priceResult.data?.price || '0';
            const totalReceived = (parseFloat(amount) * parseFloat(price)).toFixed(6);
            finalResponse = `To sell ${amount} Tesla tokens:\n- You will receive: ${totalReceived} PYUSD (${amount} × $${price})\n- Ready to execute transaction with MetaMask`;
          } else {
            finalResponse = `Error getting price: ${priceResult.error}`;
          }
        } catch (error) {
          finalResponse = `Error getting price: ${error}`;
        }
      }
      // Handle price requests
      else if (lowerMessage.includes('price') || lowerMessage.includes('tesla')) {
        operation = 'price';
        try {
          const priceResult = await this.ethersTools.getTokenPrice(tokenAddress);
          if (priceResult.success) {
            price = priceResult.data?.price || '0';
            finalResponse = `Tesla Token (TSLA) Price: $${price} PYUSD`;
          } else {
            finalResponse = `Error getting price: ${priceResult.error}`;
          }
        } catch (error) {
          finalResponse = `Error getting price: ${error}`;
        }
      }
      // Default response
      else {
        finalResponse = 'I can help you with:\n• Get Tesla token price\n• Buy Tesla tokens\n• Sell Tesla tokens\n\nJust ask me what you need!';
      }

      return {
        success: true,
        data: {
          response: finalResponse,
          iterations: 1
        },
        timestamp: new Date(),
        operation,
        tokenAddress,
        amount,
        price
      };

    } catch (error) {
      this.logger.error('Error in trade request:', error);
      
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        operation: 'price'
      };
    }
  }

  private generateVaultSystemPrompt(): string {
    return `You are a specialized vault trading agent. You help users get token prices and execute trades.

CRITICAL RULES:
1. **ALWAYS provide FINAL_ANSWER**: After analyzing the request, provide a clear FINAL_ANSWER
2. **Keep responses SHORT and CLEAR**
3. **Show actual prices when available**
4. **For price requests, just show the price**

RESPONSE FORMAT:
- Always end with "FINAL_ANSWER: " followed by your response
- Keep it simple and direct

EXAMPLE RESPONSES:

User: "What's the current price of Tesla token?"
FINAL_ANSWER: Tesla Token (TSLA) Price: $2.50 PYUSD

User: "I want to buy 5 Tesla tokens"
FINAL_ANSWER: To buy 5 Tesla tokens:
- Cost: 12.50 PYUSD (5 × $2.50)
- Connect your wallet to execute the transaction

User: "Sell 3 Tesla tokens"
FINAL_ANSWER: To sell 3 Tesla tokens:
- You will receive: 7.50 PYUSD (3 × $2.50)
- Connect your wallet to execute the transaction

Always provide a FINAL_ANSWER with clear, concise information.`;
  }

  private extractFinalResponse(content: string): string {
    try {
      const finalAnswerMatch = content.match(/FINAL_ANSWER:\s*([\s\S]*)/);
      
      if (finalAnswerMatch) {
        const answer = finalAnswerMatch[1].trim();
        return answer || content;
      }
      
      return content;
    } catch (error) {
      this.logger.error('Error extracting final response:', error);
      return content;
    }
  }

  private parseTradeResult(response: string, userMessage: string): {
    success: boolean;
    operation: 'buy' | 'sell' | 'price' | 'status';
    transactionHash?: string;
    tokenAddress?: string;
    amount?: string;
    price?: string;
    error?: string;
  } {
    const lowerResponse = response.toLowerCase();
    const lowerUserMessage = userMessage.toLowerCase();
    
    // Determine operation type
    let operation: 'buy' | 'sell' | 'price' | 'status' = 'price';
    if (lowerUserMessage.includes('buy') || lowerUserMessage.includes('purchase')) {
      operation = 'buy';
    } else if (lowerUserMessage.includes('sell')) {
      operation = 'sell';
    } else if (lowerUserMessage.includes('status') || lowerUserMessage.includes('info')) {
      operation = 'status';
    }

    // Extract token information
    let tokenAddress = this.TESLA_TOKEN; // Default to Tesla
    let amount = '';
    let price = '';

    // Try to extract from response text
    const amountMatch = response.match(/(\d+(?:\.\d+)?)\s*(?:tokens?|TSLA)/i);
    if (amountMatch) {
      amount = amountMatch[1];
    }

    const priceMatch = response.match(/\$?(\d+(?:\.\d+)?)\s*(?:PYUSD|per token)/i);
    if (priceMatch) {
      price = priceMatch[1];
    }

    return {
      success: !response.includes('error') && !response.includes('failed'),
      operation,
      tokenAddress,
      amount,
      price
    };
  }

  // Direct tool access methods
  async getTokenPrice(tokenAddress: string = this.TESLA_TOKEN): Promise<VaultToolResult> {
    return await this.ethersTools.getTokenPrice(tokenAddress);
  }

  async buyStockToken(tokenAddress: string, amount: string, walletPrivateKey?: string): Promise<VaultToolResult> {
    return await this.ethersTools.buyStockToken(tokenAddress, amount, walletPrivateKey);
  }

  async sellStockToken(tokenAddress: string, amount: string, walletPrivateKey?: string): Promise<VaultToolResult> {
    return await this.ethersTools.sellStockToken(tokenAddress, amount, walletPrivateKey);
  }

  async getVaultInfo(): Promise<VaultToolResult> {
    return await this.ethersTools.getVaultInfo();
  }

  async getAllTokenPrices(): Promise<VaultToolResult> {
    return await this.ethersTools.getAllTokenPrices();
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.logger.info('Conversation history cleared');
  }

  async disconnect(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('Vault Ethers Agent disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting:', error);
    }
  }
}
