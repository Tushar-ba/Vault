import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';

export interface VaultTradeResult {
  success: boolean;
  transactionHash?: string;
  data?: any;
  error?: string;
  timestamp: Date;
  operation: 'buy' | 'sell' | 'price';
  tokenAddress?: string;
  amount?: string;
  price?: string;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
}

export class SimpleVaultAgent {
  private llm: ChatGoogleGenerativeAI;
  private logger: Logger;
  public isInitialized: boolean = false;
  private conversationHistory: any[] = [];
  private maxIterations: number = 5;
  
  // Vault contract configuration
  private readonly VAULT_ADDRESS = '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b';
  private readonly CHAIN_ID = '11155111'; // Sepolia testnet
  private readonly PYUSD_DECIMALS = 6;
  private readonly STOCK_DECIMALS = 18;
  
  // Token list - easily configurable
  private tokenList: TokenInfo[] = [
    {
      address: '0x09572cED4772527f28c6Ea8E62B08C973fc47671',
      name: 'Tesla Token',
      symbol: 'TSLA',
      decimals: 18,
      isActive: true
    }
  ];

  // Mock price data for demonstration
  private mockPrices: Record<string, number> = {
    '0x09572cED4772527f28c6Ea8E62B08C973fc47671': 2.50 // Tesla at $2.50
  };

  constructor() {
    this.logger = new Logger('SimpleVaultAgent');
    
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.llm = new ChatGoogleGenerativeAI({
      apiKey: config.geminiApiKey,
      model: 'gemini-2.0-flash-exp',
      temperature: 0.1,
      maxOutputTokens: 4000,
    });
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Simple Vault Agent...');
      this.isInitialized = true;
      this.logger.info('Simple Vault Agent initialized successfully');
      this.logger.info(`Vault Address: ${this.VAULT_ADDRESS}`);
      this.logger.info(`Chain: Sepolia Testnet (${this.CHAIN_ID})`);
      this.logger.info(`Available Tokens: ${this.tokenList.length}`);
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
      
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Generate system prompt for vault trading
      const systemPrompt = this.generateVaultSystemPrompt();
      
      let iteration = 0;
      let finalResponse = '';

      while (iteration < this.maxIterations) {
        iteration++;
        this.logger.info(`🔄 Iteration ${iteration}`);

        // Create messages for LLM
        const messages = [
          new SystemMessage(systemPrompt),
          ...this.conversationHistory.slice(-10).map((msg: any) => 
            msg.role === 'user' 
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content)
          )
        ];

        // Get LLM response
        let response;
        let content = '';
        
        try {
          response = await this.llm.invoke(messages);
          
          if (!response || !response.content) {
            this.logger.warn('⚠️ LLM returned invalid response object');
            content = `FINAL_ANSWER: I understand your request but need more information to proceed.`;
          } else {
            content = typeof response.content === 'string' 
              ? response.content 
              : JSON.stringify(response.content);
          }
          
          // Handle empty or malformed responses
          if (!content || content.trim().length === 0 || content === '[]') {
            this.logger.warn('⚠️ LLM returned empty response');
            content = `FINAL_ANSWER: I'm ready to help with your trading request. Please provide more details.`;
          }
        } catch (llmError) {
          this.logger.error('LLM invocation error:', llmError);
          content = `FINAL_ANSWER: I encountered an error processing your request. Please try again.`;
        }

        this.logger.info(`🤖 LLM Response: ${content.substring(0, 300)}...`);

        // Check if this is a final answer
        if (content.includes('FINAL_ANSWER:')) {
          finalResponse = this.extractFinalResponse(content);
          break;
        }

        // If not a final answer, continue to next iteration
        this.conversationHistory.push({
          role: 'assistant',
          content: content
        });
      }

      if (iteration >= this.maxIterations) {
        finalResponse = "I've reached the maximum number of analysis steps. Here's what I can help you with:\n\n" + 
                       "• Get current token prices\n• Buy stock tokens\n• Sell stock tokens\n• Check vault status";
      }

      // Parse the final response to determine operation type and result
      const tradeResult = this.parseTradeResult(finalResponse, userMessage);

      return {
        success: tradeResult.success,
        transactionHash: tradeResult.transactionHash,
        data: {
          response: finalResponse,
          iterations: iteration
        },
        error: tradeResult.error,
        timestamp: new Date(),
        operation: tradeResult.operation,
        tokenAddress: tradeResult.tokenAddress,
        amount: tradeResult.amount,
        price: tradeResult.price
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
    const tokenListStr = this.tokenList.map(token => 
      `- ${token.name} (${token.symbol}): ${token.address} - Current Price: $${this.mockPrices[token.address] || 'N/A'}`
    ).join('\n');

    return `You are a specialized vault trading agent for the BitYield Protocol. You help users buy and sell stock tokens through the vault contract.

VAULT CONTRACT DETAILS:
- Address: ${this.VAULT_ADDRESS}
- Chain: Sepolia Testnet (${this.CHAIN_ID})
- PYUSD Decimals: ${this.PYUSD_DECIMALS}
- Stock Decimals: ${this.STOCK_DECIMALS}

AVAILABLE TOKENS:
${tokenListStr}

VAULT OPERATIONS:
1. **Get Price**: Check current price of a stock token
2. **Buy Stock**: Purchase stock tokens with PYUSD
3. **Sell Stock**: Sell stock tokens back to vault for PYUSD

CRITICAL RULES:
1. **ALWAYS provide FINAL_ANSWER**: After analyzing the request, provide a clear FINAL_ANSWER
2. **Be specific about prices, amounts, and operations**
3. **Use the mock price data provided above**
4. **Provide clear instructions for trading operations**

RESPONSE FORMAT:
- Always end with "FINAL_ANSWER: " followed by your response
- Be detailed and specific about prices, amounts, and operations
- Include transaction details when applicable

EXAMPLE RESPONSES:

User: "What's the current price of Tesla token?"
FINAL_ANSWER: Current Tesla Token (TSLA) price: $2.50 PYUSD per token
- Token Address: 0x09572cED4772527f28c6Ea8E62B08C973fc47671
- Available Supply: 100,000 tokens
- Price per token: 2.50 PYUSD

User: "I want to buy 5 Tesla tokens"
FINAL_ANSWER: To buy 5 Tesla tokens:
- Token: Tesla (TSLA) - 0x09572cED4772527f28c6Ea8E62B08C973fc47671
- Amount: 5 tokens
- Current Price: $2.50 per token
- Total Cost: 12.50 PYUSD

**Transaction Details:**
- Contract: ${this.VAULT_ADDRESS}
- Function: buyStock(tokenAddress, amountInWholeTokens)
- Parameters: ["0x09572cED4772527f28c6Ea8E62B08C973fc47671", 5]

**Requirements:**
- You need 12.50 PYUSD in your wallet
- Approve the vault contract to spend your PYUSD
- Call buyStock function

User: "Sell 3 Tesla tokens"
FINAL_ANSWER: To sell 3 Tesla tokens:
- Token: Tesla (TSLA) - 0x09572cED4772527f28c6Ea8E62B08C973fc47671
- Amount: 3 tokens
- Current Price: $2.50 per token
- You will receive: 7.50 PYUSD

**Transaction Details:**
- Contract: ${this.VAULT_ADDRESS}
- Function: sellStock(tokenAddress, amountInWholeTokens)
- Parameters: ["0x09572cED4772527f28c6Ea8E62B08C973fc47671", 3]

**Requirements:**
- You need 3 Tesla tokens in your wallet
- Approve the vault contract to spend your Tesla tokens
- Call sellStock function

Always provide a FINAL_ANSWER with clear, actionable information.`;
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
    operation: 'buy' | 'sell' | 'price';
    transactionHash?: string;
    tokenAddress?: string;
    amount?: string;
    price?: string;
    error?: string;
  } {
    const lowerResponse = response.toLowerCase();
    const lowerUserMessage = userMessage.toLowerCase();
    
    // Determine operation type
    let operation: 'buy' | 'sell' | 'price' = 'price';
    if (lowerUserMessage.includes('buy') || lowerUserMessage.includes('purchase')) {
      operation = 'buy';
    } else if (lowerUserMessage.includes('sell')) {
      operation = 'sell';
    }

    // Extract token information
    let tokenAddress = '';
    let amount = '';
    let price = '';

    // Try to extract from response text
    const tokenMatch = response.match(/0x[a-fA-F0-9]{40}/);
    if (tokenMatch) {
      tokenAddress = tokenMatch[0];
    }

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

  // Utility methods for token management
  addToken(token: TokenInfo): void {
    const existingIndex = this.tokenList.findIndex(t => t.address.toLowerCase() === token.address.toLowerCase());
    if (existingIndex >= 0) {
      this.tokenList[existingIndex] = token;
      this.logger.info(`Updated token: ${token.name}`);
    } else {
      this.tokenList.push(token);
      this.logger.info(`Added new token: ${token.name}`);
    }
  }

  removeToken(tokenAddress: string): void {
    const index = this.tokenList.findIndex(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    if (index >= 0) {
      const removed = this.tokenList.splice(index, 1)[0];
      this.logger.info(`Removed token: ${removed.name}`);
    }
  }

  getTokenList(): TokenInfo[] {
    return [...this.tokenList];
  }

  getTokenByAddress(address: string): TokenInfo | undefined {
    return this.tokenList.find(t => t.address.toLowerCase() === address.toLowerCase());
  }

  // Update mock price
  updateTokenPrice(tokenAddress: string, price: number): void {
    this.mockPrices[tokenAddress] = price;
    this.logger.info(`Updated price for token ${tokenAddress}: $${price}`);
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.logger.info('Conversation history cleared');
  }

  async disconnect(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('Simple Vault Agent disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting:', error);
    }
  }
}
