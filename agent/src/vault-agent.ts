import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';
import { DockerMCPClient } from './docker-mcp-client.js';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

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

export class VaultTradingAgent {
  private mcpClient: DockerMCPClient | null = null;
  private llm: ChatGoogleGenerativeAI;
  private logger: Logger;
  public isInitialized: boolean = false;
  private mcpConfig: any;
  private conversationHistory: any[] = [];
  private maxIterations: number = 10;
  
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

  constructor() {
    this.logger = new Logger('VaultTradingAgent');
    
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
      this.logger.info('Initializing Vault Trading Agent...');

      const mcpConfigPath = path.resolve(process.cwd(), 'mcp-config.json');
      this.mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));

      this.mcpClient = new DockerMCPClient(this.mcpConfig);
      await this.mcpClient.connect();

      // Unlock Sepolia testnet for vault operations
      await this.mcpClient.callTool('__unlock_blockchain_analysis__', {
        chain_id: this.CHAIN_ID
      });

      this.isInitialized = true;
      this.logger.info('Vault Trading Agent initialized successfully');
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
      let toolCallsMade: any[] = [];

      while (iteration < this.maxIterations) {
        iteration++;
        this.logger.info(`🔄 Iteration ${iteration}`);

        // Force FINAL_ANSWER if we've made several tool calls
        const forceAnswer = toolCallsMade.length >= 3 || iteration >= this.maxIterations - 2;
        
        // Create messages for LLM
        const additionalInstruction = forceAnswer 
          ? '\n\nIMPORTANT: You have made enough tool calls. You MUST provide your FINAL_ANSWER now based on the data collected. Do NOT call more tools.'
          : '';
        
        const messages = [
          new SystemMessage(systemPrompt + additionalInstruction),
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
            content = `FINAL_ANSWER: Based on ${toolCallsMade.length} tool calls, analysis complete. Check toolCalls for data.`;
          } else {
            content = typeof response.content === 'string' 
              ? response.content 
              : JSON.stringify(response.content);
          }
          
          // Handle empty or malformed responses
          if (!content || content.trim().length === 0 || content === '[]') {
            this.logger.warn('⚠️ LLM returned empty response, forcing summary');
            content = `FINAL_ANSWER: Based on ${toolCallsMade.length} tool calls, here's what I found:\n${JSON.stringify(toolCallsMade, null, 2)}`;
          }
        } catch (llmError) {
          this.logger.error('LLM invocation error:', llmError);
          // Synthesize deterministic summary if we already have tool data
          if (toolCallsMade.length > 0) {
            const synthesized = this.buildTradeSummary(toolCallsMade);
            content = `FINAL_ANSWER: ${synthesized}`;
          } else {
            content = `FINAL_ANSWER: No tool data collected. Please try again.`;
          }
        }

        this.logger.info(`🤖 LLM Response: ${content.substring(0, 300)}...`);

        // Check if LLM wants to use a tool
        let toolCall = null;
        try {
          toolCall = this.extractToolCall(content);
        } catch (extractError) {
          this.logger.error('Failed to extract tool call:', extractError);
          finalResponse = this.extractFinalResponse(content);
          break;
        }
        
        if (toolCall) {
          this.logger.info(`🔧 Executing tool: ${toolCall.name}`);
          
          try {
            const toolResult = await this.executeVaultTool(toolCall.name, toolCall.args);
            toolCallsMade.push({
              tool: toolCall.name,
              args: toolCall.args,
              result: toolResult
            });

            // Add tool result to conversation
            const toolResultMessage = `Tool "${toolCall.name}" returned data. 

IMPORTANT: You MUST now either:
1. Call another tool if you need more information, OR
2. Provide your FINAL_ANSWER starting with "FINAL_ANSWER: "

Data received:
${JSON.stringify(toolResult, null, 2)}

If this is sufficient to answer the user's question, provide FINAL_ANSWER now.`;
            this.conversationHistory.push({
              role: 'assistant',
              content: toolResultMessage
            });

            continue;
          } catch (error) {
            const errorMsg = `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            this.logger.error(errorMsg);
            this.conversationHistory.push({
              role: 'assistant',
              content: errorMsg
            });
            continue;
          }
        }

        // No tool call - this is the final response
        finalResponse = this.extractFinalResponse(content);
        break;
      }

      if (iteration >= this.maxIterations) {
        finalResponse = "I've reached the maximum number of analysis steps. Here's what I found:\n\n" + 
                       JSON.stringify(toolCallsMade, null, 2);
      }

      // Parse the final response to determine operation type and result
      const tradeResult = this.parseTradeResult(finalResponse, toolCallsMade);

      return {
        success: tradeResult.success,
        transactionHash: tradeResult.transactionHash,
        data: {
          response: finalResponse,
          toolCalls: toolCallsMade,
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
      `- ${token.name} (${token.symbol}): ${token.address}`
    ).join('\n');

    return `You are a specialized vault trading agent for the BitYield Protocol. You help users buy and sell stock tokens through the vault contract.

VAULT CONTRACT DETAILS:
- Address: ${this.VAULT_ADDRESS}
- Chain: Sepolia Testnet (${this.CHAIN_ID})
- PYUSD Decimals: ${this.PYUSD_DECIMALS}
- Stock Decimals: ${this.STOCK_DECIMALS}

AVAILABLE TOKENS:
${tokenListStr}

AVAILABLE TOOLS:
- get_address_info: Get basic information about an address
- get_transactions_by_address: Get transaction history for an address
- get_tokens_by_address: Get token holdings for an address

VAULT OPERATIONS:
1. **Get Price**: Check current price of a stock token
2. **Buy Stock**: Purchase stock tokens with PYUSD
3. **Sell Stock**: Sell stock tokens back to vault for PYUSD

TOOL CALLING FORMAT:
TOOL_CALL: tool_name
ARGS: {"param1": "value1", "param2": "value2"}
END_TOOL_CALL

After receiving tool results, you MUST either:
1. Call another tool if you need more information, OR
2. Provide "FINAL_ANSWER: " with your analysis

CRITICAL RULES:
1. **ALWAYS use chain_id: "${this.CHAIN_ID}" for all operations**
2. **For price checks**: Use get_address_info on the vault contract to get current state
3. **For trading**: Analyze vault state and provide clear instructions
4. **ALWAYS provide FINAL_ANSWER**: After getting tool data, analyze it and provide FINAL_ANSWER

RESPONSE FORMAT:
- Use TOOL_CALL when you need data
- ALWAYS use FINAL_ANSWER when you have data to analyze
- Be specific about prices, amounts, and operations

EXAMPLE CONVERSATIONS:

User: "What's the current price of Tesla token?"
Assistant:
TOOL_CALL: get_address_info
ARGS: {"address": "${this.VAULT_ADDRESS}", "chain_id": "${this.CHAIN_ID}"}
END_TOOL_CALL

[After receiving vault info]
FINAL_ANSWER: Current Tesla Token (TSLA) price: $2.50 PYUSD per token
- Token Address: 0x09572cED4772527f28c6Ea8E62B08C973fc47671
- Available Supply: 100,000 tokens
- Price per token: 2.50 PYUSD

User: "I want to buy 10 Tesla tokens"
Assistant:
TOOL_CALL: get_address_info
ARGS: {"address": "${this.VAULT_ADDRESS}", "chain_id": "${this.CHAIN_ID}"}
END_TOOL_CALL

[After receiving vault info]
FINAL_ANSWER: To buy 10 Tesla tokens:
- Token: Tesla (TSLA) - 0x09572cED4772527f28c6Ea8E62B08C973fc47671
- Amount: 10 tokens
- Current Price: $2.50 per token
- Total Cost: 25.00 PYUSD
- Available Supply: 100,000 tokens (sufficient)

**Transaction Details:**
- Contract: ${this.VAULT_ADDRESS}
- Function: buyStock(tokenAddress, amountInWholeTokens)
- Parameters: ["0x09572cED4772527f28c6Ea8E62B08C973fc47671", 10]

**Requirements:**
- You need 25.00 PYUSD in your wallet
- Approve the vault contract to spend your PYUSD
- Call buyStock function

User: "Sell 5 Tesla tokens"
Assistant:
TOOL_CALL: get_address_info
ARGS: {"address": "${this.VAULT_ADDRESS}", "chain_id": "${this.CHAIN_ID}"}
END_TOOL_CALL

[After receiving vault info]
FINAL_ANSWER: To sell 5 Tesla tokens:
- Token: Tesla (TSLA) - 0x09572cED4772527f28c6Ea8E62B08C973fc47671
- Amount: 5 tokens
- Current Price: $2.50 per token
- You will receive: 12.50 PYUSD

**Transaction Details:**
- Contract: ${this.VAULT_ADDRESS}
- Function: sellStock(tokenAddress, amountInWholeTokens)
- Parameters: ["0x09572cED4772527f28c6Ea8E62B08C973fc47671", 5]

**Requirements:**
- You need 5 Tesla tokens in your wallet
- Approve the vault contract to spend your Tesla tokens
- Call sellStock function

START WITH THE TOOL CALL IMMEDIATELY. DO NOT explain what you're going to do first.`;
  }

  private extractToolCall(content: string): { name: string; args: any } | null {
    const toolCallMatch = content.match(/TOOL_CALL:\s*(\w+)\s*ARGS:\s*({[\s\S]*?})\s*END_TOOL_CALL/);
    
    if (toolCallMatch) {
      try {
        const toolName = toolCallMatch[1].trim();
        const argsJson = toolCallMatch[2].trim();
        const args = JSON.parse(argsJson);
        
        return { name: toolName, args };
      } catch (error) {
        this.logger.error('Failed to parse tool call:', error);
        return null;
      }
    }

    return null;
  }

  private extractFinalResponse(content: string): string {
    try {
      const finalAnswerMatch = content.match(/FINAL_ANSWER:\s*([\s\S]*)/);
      
      if (finalAnswerMatch) {
        const answer = finalAnswerMatch[1].trim();
        return answer || content;
      }
      
      if (!content || content.trim().length === 0 || content.trim() === '[]') {
        return "Analysis in progress. The agent called tools but didn't provide a final answer. Please check toolCalls for the data retrieved.";
      }
      
      return content;
    } catch (error) {
      this.logger.error('Error extracting final response:', error);
      return "Analysis completed. Please check toolCalls for the data retrieved.";
    }
  }

  private async executeVaultTool(toolName: string, args: any): Promise<any> {
    if (!this.mcpClient) {
      throw new Error('MCP Client not connected');
    }

    // Ensure chain_id is set to Sepolia
    args.chain_id = this.CHAIN_ID;

    this.logger.info(`Calling MCP tool: ${toolName}`, args);

    const result = await this.mcpClient.callTool(toolName, args);

    // Parse result
    let contentArray;
    if (Array.isArray(result)) {
      contentArray = result;
    } else if (result.content && Array.isArray(result.content)) {
      contentArray = result.content;
    } else {
      return result;
    }

    if (contentArray.length > 0 && contentArray[0].type === 'text') {
      try {
        const parsed = JSON.parse(contentArray[0].text);
        return parsed;
      } catch (error) {
        return contentArray[0].text;
      }
    }

    return contentArray;
  }

  private buildTradeSummary(toolCallsMade: any[]): string {
    const lines: string[] = [];
    lines.push('**Vault Trading Summary**');
    lines.push('');
    
    for (const call of toolCallsMade) {
      if (call.tool === 'get_address_info') {
        const data = call.result?.data?.basic_info || {};
        lines.push(`- Vault Balance: ${data.coin_balance || '0'} ETH`);
        lines.push(`- Has Tokens: ${data.has_tokens ? 'Yes' : 'No'}`);
        lines.push(`- Has Token Transfers: ${data.has_token_transfers ? 'Yes' : 'No'}`);
      }
    }
    
    return lines.join('\n');
  }

  private parseTradeResult(response: string, toolCalls: any[]): {
    success: boolean;
    operation: 'buy' | 'sell' | 'price';
    transactionHash?: string;
    tokenAddress?: string;
    amount?: string;
    price?: string;
    error?: string;
  } {
    const lowerResponse = response.toLowerCase();
    
    // Determine operation type
    let operation: 'buy' | 'sell' | 'price' = 'price';
    if (lowerResponse.includes('buy') || lowerResponse.includes('purchase')) {
      operation = 'buy';
    } else if (lowerResponse.includes('sell')) {
      operation = 'sell';
    }

    // Extract token information
    let tokenAddress = '';
    let amount = '';
    let price = '';

    // Try to extract from tool calls first
    const addressInfo = toolCalls.find(call => call.tool === 'get_address_info');
    if (addressInfo?.result?.data?.basic_info) {
      // This would contain vault state information
    }

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

  clearHistory(): void {
    this.conversationHistory = [];
    this.logger.info('Conversation history cleared');
  }

  async disconnect(): Promise<void> {
    try {
      if (this.mcpClient) {
        await this.mcpClient.disconnect();
      }
      this.isInitialized = false;
      this.logger.info('Disconnected from MCP server');
    } catch (error) {
      this.logger.error('Error disconnecting:', error);
    }
  }
}
