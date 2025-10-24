import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';
import { ethers } from 'ethers';

// Tool definitions for the vault trading
interface VaultTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export class VaultAIAgent {
  private llm: ChatGoogleGenerativeAI;
  private logger: Logger;
  private provider: ethers.JsonRpcProvider;
  private vaultContract: ethers.Contract;
  private conversationHistory: any[] = [];
  
  // Contract addresses and configuration
  private readonly VAULT_ADDRESS = '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b';
  private readonly TESLA_TOKEN = '0x09572cED4772527f28c6Ea8E62B08C973fc47671';
  private readonly PYUSD_ADDRESS = '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9';
  private readonly RPC_URL = 'https://0xrpc.io/sep';
  private readonly CHAIN_ID = 11155111;
  private readonly MCP_SERVER_URL = 'http://localhost:3001'; // MCP server endpoint

  private readonly VAULT_ABI = [
    "function getPrice(address _token) public view returns (uint256 price)",
    "function buyStock(address _token, uint256 _amountInWholeTokens) public",
    "function sellStock(address _token, uint256 _amountInWholeTokens) public",
    "function stockList(address) public view returns (string name, uint256 pricingFactor, uint256 currentSupply, bool isSupported)"
  ];

  // Available tools for the LLM
  private tools: VaultTool[] = [
    {
      name: 'get_token_price',
      description: 'Get the current price of a token from the vault contract',
      parameters: {
        type: 'object',
        properties: {
          token_address: {
            type: 'string',
            description: 'The token contract address (e.g., Tesla token address)'
          }
        },
        required: ['token_address']
      }
    },
    {
      name: 'get_stock_info',
      description: 'Get detailed information about a stock token from the vault',
      parameters: {
        type: 'object',
        properties: {
          token_address: {
            type: 'string',
            description: 'The token contract address'
          }
        },
        required: ['token_address']
      }
    },
    {
      name: 'calculate_buy_cost',
      description: 'Calculate the cost to buy a specific amount of tokens',
      parameters: {
        type: 'object',
        properties: {
          token_address: {
            type: 'string',
            description: 'The token contract address'
          },
          amount: {
            type: 'number',
            description: 'The amount of tokens to buy (whole numbers)'
          }
        },
        required: ['token_address', 'amount']
      }
    },
    {
      name: 'calculate_sell_return',
      description: 'Calculate how much PYUSD you will receive for selling tokens',
      parameters: {
        type: 'object',
        properties: {
          token_address: {
            type: 'string',
            description: 'The token contract address'
          },
          amount: {
            type: 'number',
            description: 'The amount of tokens to sell (whole numbers)'
          }
        },
        required: ['token_address', 'amount']
      }
    },
    {
      name: 'analyze_contract',
      description: 'Analyze a smart contract using the MCP blockchain analysis server',
      parameters: {
        type: 'object',
        properties: {
          contract_address: {
            type: 'string',
            description: 'The contract address to analyze'
          },
          chain_id: {
            type: 'string',
            description: 'The blockchain chain ID (default: 11155111 for Sepolia)'
          }
        },
        required: ['contract_address']
      }
    },
    {
      name: 'get_address_transactions',
      description: 'Get recent transactions for an address using MCP server',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'The wallet or contract address'
          },
          chain_id: {
            type: 'string',
            description: 'The blockchain chain ID'
          },
          limit: {
            type: 'number',
            description: 'Number of transactions to fetch (default: 10)'
          }
        },
        required: ['address']
      }
    },
    {
      name: 'prepare_buy_transaction',
      description: 'Prepare a buy transaction for the user to sign with MetaMask. Returns transaction details including PYUSD allowance requirements.',
      parameters: {
        type: 'object',
        properties: {
          token_address: {
            type: 'string',
            description: 'The token contract address'
          },
          amount: {
            type: 'number',
            description: 'The amount of tokens to buy (whole numbers)'
          }
        },
        required: ['token_address', 'amount']
      }
    },
    {
      name: 'prepare_sell_transaction',
      description: 'Prepare a sell transaction for the user to sign with MetaMask. Returns transaction details including token allowance requirements.',
      parameters: {
        type: 'object',
        properties: {
          token_address: {
            type: 'string',
            description: 'The token contract address'
          },
          amount: {
            type: 'number',
            description: 'The amount of tokens to sell (whole numbers)'
          }
        },
        required: ['token_address', 'amount']
      }
    }
  ];

  constructor() {
    this.logger = new Logger('VaultAIAgent');
    
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    // Initialize Gemini LLM
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: config.geminiApiKey,
      model: 'gemini-2.0-flash-exp',
      temperature: 0.1,
      maxOutputTokens: 8000,
    });

    // Initialize ethers provider and contract
    this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
    this.vaultContract = new ethers.Contract(this.VAULT_ADDRESS, this.VAULT_ABI, this.provider);
    
    this.logger.info('🤖 VaultAIAgent initialized');
    this.logger.info(`📊 Vault: ${this.VAULT_ADDRESS}`);
    this.logger.info(`⛓️ Chain: Sepolia (${this.CHAIN_ID})`);
  }

  /**
   * Main chat function - processes user messages with LLM and tool calling
   */
  async chat(userMessage: string): Promise<any> {
    try {
      this.logger.info(`💬 User: ${userMessage}`);
      
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      let iteration = 0;
      const maxIterations = 10;
      const toolCallsMade: any[] = [];

      while (iteration < maxIterations) {
        iteration++;
        this.logger.info(`🔄 Iteration ${iteration}`);

        // Generate system prompt with available tools
        const systemPrompt = this.generateSystemPrompt();
        
        // Create messages for LLM
        const messages = [
          new SystemMessage(systemPrompt),
          ...this.conversationHistory.slice(-10).map(msg => 
            msg.role === 'user' 
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content)
          )
        ];

        // Get LLM response
        const response = await this.llm.invoke(messages);
        const content = typeof response.content === 'string' 
          ? response.content 
          : JSON.stringify(response.content);

        this.logger.info(`🤖 LLM: ${content.substring(0, 200)}...`);

        // Check if LLM wants to call a tool
        const toolCall = this.extractToolCall(content);
        
        if (toolCall) {
          this.logger.info(`🔧 Tool Call: ${toolCall.name}`);
          
          // Execute the tool
          const toolResult = await this.executeTool(toolCall.name, toolCall.args);
          toolCallsMade.push({
            tool: toolCall.name,
            args: toolCall.args,
            result: toolResult
          });

          // Add tool result to conversation with clear instruction
          const toolResultMessage = toolCall.name === 'prepare_buy_transaction' || toolCall.name === 'prepare_sell_transaction'
            ? `Tool "${toolCall.name}" executed successfully. Transaction is ready for MetaMask signing. Now provide FINAL_ANSWER with: "To ${toolCall.name === 'prepare_buy_transaction' ? 'buy' : 'sell'} ${toolCall.args.amount} tokens: Cost/Return: [amount] PYUSD. Click the MetaMask button to execute."`
            : `Tool "${toolCall.name}" executed. Result: ${JSON.stringify(toolResult)}. Now provide your FINAL_ANSWER based on this data.`;
          
          this.conversationHistory.push({
            role: 'assistant',
            content: toolResultMessage
          });

          continue;
        }

        // No tool call - extract final answer
        const finalAnswer = this.extractFinalAnswer(content);
        
        if (finalAnswer) {
          this.conversationHistory.push({
            role: 'assistant',
            content: finalAnswer
          });

          return {
            success: true,
            data: {
              response: finalAnswer,
              toolCalls: toolCallsMade,
              iterations: iteration
            },
            timestamp: new Date()
          };
        }
        
        // If no final answer and we have tool calls, generate a summary
        if (toolCallsMade.length > 0 && iteration >= 2) {
          const lastToolCall = toolCallsMade[toolCallsMade.length - 1];
          let summaryResponse = '';
          
          if (lastToolCall.tool === 'prepare_buy_transaction' && lastToolCall.result.success) {
            summaryResponse = `To buy ${lastToolCall.args.amount} tokens:\n- Cost: ${lastToolCall.result.totalCost} PYUSD\n- Step 1: Approve PYUSD\n- Step 2: Execute buy\n\nClick the MetaMask button below to proceed.`;
          } else if (lastToolCall.tool === 'prepare_sell_transaction' && lastToolCall.result.success) {
            summaryResponse = `To sell ${lastToolCall.args.amount} tokens:\n- You will receive: ${lastToolCall.result.totalReturn} PYUSD\n- Step 1: Approve tokens\n- Step 2: Execute sell\n\nClick the MetaMask button below to proceed.`;
          } else if (lastToolCall.tool === 'get_address_transactions' || lastToolCall.tool === 'analyze_contract') {
            // For MCP tools, extract the response from the result
            if (lastToolCall.result.success && lastToolCall.result.response) {
              summaryResponse = lastToolCall.result.response;
            } else if (lastToolCall.result.data) {
              summaryResponse = `Operation completed. Retrieved data from MCP server.\n\nCheck the tool calls section for detailed information.`;
            } else {
              summaryResponse = `Operation completed. Check the tool calls for details.`;
            }
          } else {
            summaryResponse = `Operation completed. Check the tool calls for details.`;
          }
          
          return {
            success: true,
            data: {
              response: summaryResponse,
              toolCalls: toolCallsMade,
              iterations: iteration
            },
            timestamp: new Date()
          };
        }
      }

      // Max iterations reached
      return {
        success: true,
        data: {
          response: 'Analysis complete. Check tool calls for details.',
          toolCalls: toolCallsMade,
          iterations: iteration
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error in chat:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Error object could not be serialized';
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate system prompt with tool definitions
   */
  private generateSystemPrompt(): string {
    const toolDescriptions = this.tools.map(tool => 
      `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.parameters.properties)}`
    ).join('\n\n');

    return `You are a specialized AI agent for the Vault Trading System on Sepolia testnet.

**VAULT INFORMATION:**
- Vault Address: ${this.VAULT_ADDRESS}
- Tesla Token: ${this.TESLA_TOKEN}
- PYUSD Address: ${this.PYUSD_ADDRESS}
- Chain: Sepolia (${this.CHAIN_ID})

**AVAILABLE TOOLS:**
${toolDescriptions}

**TOOL CALLING FORMAT:**
When you need to call a tool, use this EXACT format:
TOOL_CALL: tool_name
ARGS: {"param1": "value1", "param2": "value2"}
END_TOOL_CALL

**RESPONSE FORMAT:**
After getting tool results, provide your final answer using:
FINAL_ANSWER: Your detailed response here

**CAPABILITIES:**
1. Get real-time token prices from the vault
2. Calculate buy/sell costs
3. Prepare buy/sell transactions for MetaMask signing
4. **Analyze smart contracts using MCP server (supports MULTI-CHAIN)**
5. **Get transaction history using MCP server (supports MULTI-CHAIN)**
6. **Check token holdings using MCP server (supports MULTI-CHAIN)**
7. Provide trading recommendations

**MCP SERVER CAPABILITIES (via analyze_contract and get_address_transactions):**
- ✅ Multi-chain support: Ethereum (1), Sepolia (11155111), Base Sepolia (84532), Optimism (10), Arbitrum (42161)
- ✅ Contract verification and security analysis
- ✅ Transaction history with gas calculations
- ✅ Token holdings and balances
- ✅ Cross-chain activity tracking
- ✅ Comprehensive blockchain data

**RULES:**
1. ALWAYS call tools to get real data - never make up prices or information
2. For price queries: use get_token_price
3. For buy/sell calculations: use calculate_buy_cost or calculate_sell_return
4. For actual buy/sell requests: use prepare_buy_transaction or prepare_sell_transaction
5. **For ANY blockchain analysis (contract, transactions, tokens, multi-chain): use analyze_contract or get_address_transactions**
6. **NEVER say "I cannot do multi-chain" - MCP server supports it! Just call the tool with the appropriate chain_id**
7. For multi-chain queries: Call get_address_transactions or analyze_contract multiple times with different chain_ids
8. Be concise and clear in your responses
9. Show actual numbers and calculations
10. When user wants to buy/sell, prepare the transaction with all steps

**IMPORTANT FOR MULTI-CHAIN QUERIES:**
- User asks "across all chains" → Call get_address_transactions for each chain: 1, 11155111, 84532, 10, 42161
- User asks "token holdings" → Call get_address_transactions with the address (MCP will return token data)
- User asks "contract analysis" → Call analyze_contract with the contract address
- MCP server handles ALL blockchain analysis - use it!

**EXAMPLES:**

User: "What's the current price of Tesla token?"
Assistant:
TOOL_CALL: get_token_price
ARGS: {"token_address": "${this.TESLA_TOKEN}"}
END_TOOL_CALL

[After receiving result]
FINAL_ANSWER: The current Tesla token price is $1.0 PYUSD per token.

User: "How much will it cost to buy 5 Tesla tokens?"
Assistant:
TOOL_CALL: calculate_buy_cost
ARGS: {"token_address": "${this.TESLA_TOKEN}", "amount": 5}
END_TOOL_CALL

[After receiving result]
FINAL_ANSWER: To buy 5 Tesla tokens, you will need 5.0 PYUSD.

User: "Analyze the vault contract"
Assistant:
TOOL_CALL: analyze_contract
ARGS: {"contract_address": "${this.VAULT_ADDRESS}", "chain_id": "11155111"}
END_TOOL_CALL

[After receiving result]
FINAL_ANSWER: [Comprehensive contract analysis based on MCP server data]

User: "Buy 5 Tesla tokens"
Assistant:
TOOL_CALL: prepare_buy_transaction
ARGS: {"token_address": "${this.TESLA_TOKEN}", "amount": 5}
END_TOOL_CALL

[After receiving result]
FINAL_ANSWER: To buy 5 Tesla tokens:
- Cost: 5.0 PYUSD
- Step 1: Approve 5.0 PYUSD for vault
- Step 2: Execute buy transaction
Connect MetaMask to proceed with the transaction.

User: "Sell 3 Tesla tokens"
Assistant:
TOOL_CALL: prepare_sell_transaction
ARGS: {"token_address": "${this.TESLA_TOKEN}", "amount": 3}
END_TOOL_CALL

[After receiving result]
FINAL_ANSWER: To sell 3 Tesla tokens:
- You will receive: 3.0 PYUSD
- Step 1: Approve 3 tokens for vault
- Step 2: Execute sell transaction
Connect MetaMask to proceed with the transaction.

User: "What tokens does 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 hold across all chains?"
Assistant:
TOOL_CALL: get_address_transactions
ARGS: {"address": "0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55", "chain_id": "1", "limit": 1}
END_TOOL_CALL

[After receiving Ethereum data, call for other chains]
TOOL_CALL: get_address_transactions
ARGS: {"address": "0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55", "chain_id": "11155111", "limit": 1}
END_TOOL_CALL

[Continue for chains 84532, 10, 42161, then provide summary]
FINAL_ANSWER: Token holdings across all chains:
- Ethereum: [data from MCP]
- Sepolia: [data from MCP]
- Base Sepolia: [data from MCP]
- Optimism: [data from MCP]
- Arbitrum: [data from MCP]

User: "Calculate my total gas spend across all chains"
Assistant:
TOOL_CALL: get_address_transactions
ARGS: {"address": "0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55", "chain_id": "1", "limit": 10}
END_TOOL_CALL

[Call for each chain, then sum gas fees]
FINAL_ANSWER: Total gas spend across all chains: [calculated total]

START WITH A TOOL CALL IMMEDIATELY. DO NOT explain what you're going to do first.`;
  }

  /**
   * Extract tool call from LLM response
   */
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

  /**
   * Extract final answer from LLM response
   */
  private extractFinalAnswer(content: string): string | null {
    const finalAnswerMatch = content.match(/FINAL_ANSWER:\s*([\s\S]*)/);
    
    if (finalAnswerMatch) {
      return finalAnswerMatch[1].trim();
    }

    return null;
  }

  /**
   * Execute a tool based on its name
   */
  private async executeTool(toolName: string, args: any): Promise<any> {
    this.logger.info(`Executing tool: ${toolName}`, args);

    switch (toolName) {
      case 'get_token_price':
        return await this.getTokenPrice(args.token_address);
      
      case 'get_stock_info':
        return await this.getStockInfo(args.token_address);
      
      case 'calculate_buy_cost':
        return await this.calculateBuyCost(args.token_address, args.amount);
      
      case 'calculate_sell_return':
        return await this.calculateSellReturn(args.token_address, args.amount);
      
      case 'analyze_contract':
        return await this.analyzeContract(args.contract_address, args.chain_id || '11155111');
      
      case 'get_address_transactions':
        return await this.getAddressTransactions(args.address, args.chain_id || '11155111', args.limit || 10);
      
      case 'prepare_buy_transaction':
        return await this.prepareBuyTransaction(args.token_address, args.amount);
      
      case 'prepare_sell_transaction':
        return await this.prepareSellTransaction(args.token_address, args.amount);
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Tool: Get token price
   */
  private async getTokenPrice(tokenAddress: string): Promise<any> {
    try {
      const price = await this.vaultContract.getPrice(tokenAddress);
      const priceInPYUSD = ethers.formatUnits(price, 6);
      
      return {
        success: true,
        tokenAddress,
        price: priceInPYUSD,
        priceWei: price.toString(),
        currency: 'PYUSD'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Tool: Get stock info
   */
  private async getStockInfo(tokenAddress: string): Promise<any> {
    try {
      const stockInfo = await this.vaultContract.stockList(tokenAddress);
      const price = await this.vaultContract.getPrice(tokenAddress);
      
      return {
        success: true,
        name: stockInfo.name,
        pricingFactor: stockInfo.pricingFactor.toString(),
        currentSupply: ethers.formatEther(stockInfo.currentSupply),
        isSupported: stockInfo.isSupported,
        currentPrice: ethers.formatUnits(price, 6)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Tool: Calculate buy cost
   */
  private async calculateBuyCost(tokenAddress: string, amount: number): Promise<any> {
    try {
      const price = await this.vaultContract.getPrice(tokenAddress);
      const priceInPYUSD = ethers.formatUnits(price, 6);
      const totalCost = (parseFloat(priceInPYUSD) * amount).toFixed(6);
      
      return {
        success: true,
        amount,
        pricePerToken: priceInPYUSD,
        totalCost,
        currency: 'PYUSD'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Tool: Calculate sell return
   */
  private async calculateSellReturn(tokenAddress: string, amount: number): Promise<any> {
    try {
      const price = await this.vaultContract.getPrice(tokenAddress);
      const priceInPYUSD = ethers.formatUnits(price, 6);
      const totalReturn = (parseFloat(priceInPYUSD) * amount).toFixed(6);
      
      return {
        success: true,
        amount,
        pricePerToken: priceInPYUSD,
        totalReturn,
        currency: 'PYUSD'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Tool: Analyze contract using MCP server
   */
  private async analyzeContract(contractAddress: string, chainId: string): Promise<any> {
    try {
      // Call the MCP server endpoint (from intelligent-chatbot-server.ts on port 3000)
      const response = await fetch(`http://localhost:3000/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Analyze contract ${contractAddress}`,
          chainId
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MCP server unavailable'
      };
    }
  }

  /**
   * Tool: Get address transactions using MCP server
   */
  private async getAddressTransactions(address: string, chainId: string, limit: number): Promise<any> {
    try {
      const response = await fetch(`http://localhost:3000/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Get last ${limit} transactions for ${address}`,
          chainId
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MCP server unavailable'
      };
    }
  }

  /**
   * Tool: Prepare buy transaction
   */
  private async prepareBuyTransaction(tokenAddress: string, amount: number): Promise<any> {
    try {
      const price = await this.vaultContract.getPrice(tokenAddress);
      const priceInPYUSD = ethers.formatUnits(price, 6);
      const totalCost = (parseFloat(priceInPYUSD) * amount).toFixed(6);
      const totalCostWei = ethers.parseUnits(totalCost, 6);
      
      return {
        success: true,
        operation: 'buy',
        tokenAddress,
        amount,
        pricePerToken: priceInPYUSD,
        totalCost,
        totalCostWei: totalCostWei.toString(),
        currency: 'PYUSD',
        steps: [
          {
            step: 1,
            action: 'approve_pyusd',
            description: `Approve ${totalCost} PYUSD for the vault contract`,
            contract: this.PYUSD_ADDRESS,
            spender: this.VAULT_ADDRESS,
            amount: totalCostWei.toString()
          },
          {
            step: 2,
            action: 'buy_stock',
            description: `Buy ${amount} tokens`,
            contract: this.VAULT_ADDRESS,
            function: 'buyStock',
            params: {
              token: tokenAddress,
              amount: amount
            }
          }
        ],
        requiresMetaMask: true,
        message: `To buy ${amount} tokens:\n1. Approve ${totalCost} PYUSD\n2. Execute buy transaction\n\nConnect MetaMask to proceed.`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Tool: Prepare sell transaction
   */
  private async prepareSellTransaction(tokenAddress: string, amount: number): Promise<any> {
    try {
      const price = await this.vaultContract.getPrice(tokenAddress);
      const priceInPYUSD = ethers.formatUnits(price, 6);
      const totalReturn = (parseFloat(priceInPYUSD) * amount).toFixed(6);
      const amountWei = ethers.parseEther(amount.toString());
      
      return {
        success: true,
        operation: 'sell',
        tokenAddress,
        amount,
        pricePerToken: priceInPYUSD,
        totalReturn,
        currency: 'PYUSD',
        steps: [
          {
            step: 1,
            action: 'approve_token',
            description: `Approve ${amount} tokens for the vault contract`,
            contract: tokenAddress,
            spender: this.VAULT_ADDRESS,
            amount: amountWei.toString()
          },
          {
            step: 2,
            action: 'sell_stock',
            description: `Sell ${amount} tokens`,
            contract: this.VAULT_ADDRESS,
            function: 'sellStock',
            params: {
              token: tokenAddress,
              amount: amount
            }
          }
        ],
        requiresMetaMask: true,
        message: `To sell ${amount} tokens:\n1. Approve ${amount} tokens\n2. Execute sell transaction\n3. Receive ${totalReturn} PYUSD\n\nConnect MetaMask to proceed.`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.logger.info('Conversation history cleared');
  }
}

