import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';
import { DockerMCPClient } from './docker-mcp-client.js';
import { AnalysisResponseGenerator } from './analysis/response-generator.js';
import fs from 'fs';
import path from 'path';

export interface AnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
  chainId?: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class IntelligentBlockchainAgent {
  private mcpClient: DockerMCPClient | null = null;
  private llm: ChatGoogleGenerativeAI;
  private logger: Logger;
  private responseGenerator: AnalysisResponseGenerator;
  public isInitialized: boolean = false;
  public availableTools: any[] = [];
  private mcpConfig: any;
  private conversationHistory: ConversationMessage[] = [];
  private maxIterations: number = 15; // Increased for multi-chain queries

  constructor() {
    this.logger = new Logger('IntelligentAgent');
    this.responseGenerator = new AnalysisResponseGenerator();
    
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.llm = new ChatGoogleGenerativeAI({
      apiKey: config.geminiApiKey,
      model: 'gemini-2.0-flash-exp',
      temperature: 0.1,
      maxOutputTokens: 8000,
    });
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Intelligent Blockchain Agent...');

      const mcpConfigPath = path.resolve(process.cwd(), 'mcp-config.json');
      this.mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));

      this.mcpClient = new DockerMCPClient(this.mcpConfig);
      await this.mcpClient.connect();

      const toolsResponse = await this.mcpClient.listTools();
      this.availableTools = toolsResponse.tools || [];
      this.logger.info(`Loaded ${this.availableTools.length} MCP tools`);

      await this.unlockMultipleChains();

      this.isInitialized = true;
      this.logger.info('Intelligent Blockchain Agent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize:', error);
      throw error;
    }
  }

  private async unlockMultipleChains(): Promise<void> {
    const priorityChains = [
      { id: '1', name: 'Ethereum' },
      { id: '11155111', name: 'Sepolia' },
      { id: '84532', name: 'Base Sepolia' },
      { id: '10', name: 'Optimism' },
      { id: '42161', name: 'Arbitrum' }
    ];

    for (const chain of priorityChains) {
      try {
        await this.mcpClient!.callTool('__unlock_blockchain_analysis__', {
          chain_id: chain.id
        });
        this.logger.info(`✅ Unlocked ${chain.name}`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        this.logger.warn(`⚠️ Failed to unlock ${chain.name}`);
      }
    }
  }

  async chat(userMessage: string, chainId?: string): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized');
    }

    try {
      this.logger.info(`💬 User: ${userMessage}`);
      
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Check if this is a multi-chain request
      const isMultiChainRequest = this.isMultiChainRequest(userMessage);
      
      // Generate system prompt with available tools and chain context
      const systemPrompt = this.generateSystemPrompt(chainId);
      
      let iteration = 0;
      let finalResponse = '';
      let toolCallsMade: any[] = [];

      // If multi-chain request, automatically check all chains
      if (isMultiChainRequest && !chainId) {
        this.logger.info('🌐 Multi-chain request detected, checking chains automatically');
        
        // Extract which specific chains are mentioned, or use all chains
        const requestedChains = this.extractRequestedChains(userMessage);
        const chainsToCheck = requestedChains.length > 0 ? requestedChains : ['1', '11155111', '84532', '10', '42161'];
        
        this.logger.info(`📊 Checking ${chainsToCheck.length} chains: ${chainsToCheck.join(', ')}`);
        
        const address = this.extractAddressFromMessage(userMessage);
        
        // Detect what type of data the user wants
        const wantsTokens = this.isTokenQuery(userMessage);
        const wantsTransactions = this.isTransactionQuery(userMessage);
        const wantsGasAnalysis = this.isGasQuery(userMessage);
        const wantsContractAnalysis = this.isContractAnalysisRequest(userMessage);
        
        for (const chain of chainsToCheck) {
          try {
            if (wantsTokens) {
              // Get token holdings
              const result = await this.executeTool('get_tokens_by_address', {
                address: address,
                chain_id: chain
              }, chain);
              
              toolCallsMade.push({
                tool: 'get_tokens_by_address',
                args: { address: address, chain_id: chain },
                result: result
              });
            } else if (wantsContractAnalysis) {
              // Get comprehensive contract data - both address info and transactions
              const addressResult = await this.executeTool('get_address_info', {
                address: address,
                chain_id: chain
              }, chain);
              
              toolCallsMade.push({
                tool: 'get_address_info',
                args: { address: address, chain_id: chain },
                result: addressResult
              });
              
              // Also get recent transactions for contract analysis
              const txResult = await this.executeTool('get_transactions_by_address', {
                address: address,
                chain_id: chain,
                page_size: 10
              }, chain);
              
              toolCallsMade.push({
                tool: 'get_transactions_by_address',
                args: { address: address, chain_id: chain, page_size: 10 },
                result: txResult
              });
              
            } else if (wantsTransactions || wantsGasAnalysis) {
              // Get transactions
              const result = await this.executeTool('get_transactions_by_address', {
                address: address,
                chain_id: chain,
                page_size: 10
              }, chain);
              
              toolCallsMade.push({
                tool: 'get_transactions_by_address',
                args: { address: address, chain_id: chain, page_size: 10 },
                result: result
              });
            } else {
              // Default: get address info
              const result = await this.executeTool('get_address_info', {
                address: address,
                chain_id: chain
              }, chain);
              
              toolCallsMade.push({
                tool: 'get_address_info',
                args: { address: address, chain_id: chain },
                result: result
              });
            }
            
            this.logger.info(`✅ Checked chain ${chain}`);
          } catch (error) {
            this.logger.warn(`⚠️ Failed to check chain ${chain}:`, error);
          }
        }
        
        // Generate summary from collected data
        finalResponse = this.buildSummaryFromToolCalls(toolCallsMade, userMessage);
        
        return {
          success: true,
          data: {
            response: finalResponse,
            toolCalls: toolCallsMade,
            iterations: 1
          },
          timestamp: new Date()
        };
      }

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
          ...this.conversationHistory.slice(-10).map(msg => 
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
            const synthesized = this.buildSummaryFromToolCalls(toolCallsMade, userMessage);
            content = `FINAL_ANSWER: ${synthesized}`;
          } else {
            // Force a minimal final answer if LLM fails and we have no data
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
          // Force final answer if tool extraction fails
          finalResponse = this.extractFinalResponse(content);
          break;
        }
        
        if (toolCall) {
          this.logger.info(`🔧 Executing tool: ${toolCall.name}`);
          
          try {
            const toolResult = await this.executeTool(toolCall.name, toolCall.args, chainId);
            toolCallsMade.push({
              tool: toolCall.name,
              args: toolCall.args,
              result: toolResult
            });

            // Add tool result to conversation with instruction to analyze
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

            // Continue to next iteration to let LLM process the result
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
        
        // Use the response generator for intelligent analysis
        if (!finalResponse || finalResponse.trim().length < 10) {
          // Fallback to basic summary
          finalResponse = `Analysis complete. I made ${toolCallsMade.length} tool call(s):\n\n` +
            toolCallsMade.map((call, i) => 
              `${i + 1}. ${call.tool}\n   Result: ${JSON.stringify(call.result).substring(0, 200)}...`
            ).join('\n\n');
        }
        
        this.conversationHistory.push({
          role: 'assistant',
          content: finalResponse
        });

        break;
      }

      if (iteration >= this.maxIterations) {
        // Use response generator for final analysis
        finalResponse = this.buildSummaryFromToolCalls(toolCallsMade, userMessage);
      }

      return {
        success: true,
        data: {
          response: finalResponse,
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
          const jsonError = JSON.stringify(error);
          errorMessage = jsonError !== '{}' ? jsonError : 'Empty error object - check logs for details';
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

  private generateSystemPrompt(chainId?: string): string {
    // Filter out internal/system tools that user shouldn't call
    const userTools = this.availableTools.filter(tool => 
      !tool.name.startsWith('__') && !tool.name.includes('unlock')
    );

    const toolDescriptions = userTools.map(tool => 
      `- ${tool.name}: ${tool.description || 'No description'}`
    ).join('\n');

    const chainContext = chainId 
      ? `The user specified chain_id: ${chainId}. Use this chain ONLY unless they explicitly ask about other chains.`
      : `No specific chain was specified. DEFAULT TO chain_id: "1" (Ethereum Mainnet) for the first query. Only check other chains if the user explicitly asks for "all chains" or "multiple chains".`;

    return `You are an intelligent blockchain analysis agent with access to blockchain data through MCP tools.

${chainContext}

AVAILABLE CHAINS:
- 1: Ethereum Mainnet (DEFAULT if not specified)
- 11155111: Sepolia Testnet
- 84532: Base Sepolia
- 10: Optimism
- 42161: Arbitrum One

AVAILABLE TOOLS:
${toolDescriptions}

CAPABILITIES:
- Analyze transactions, addresses, contracts, tokens
- Calculate gas fees, transaction patterns, token holdings
- Investigate creator behavior, token launches, contract safety
- Handle pagination for large datasets
- Provide detailed analysis and recommendations
- Comprehensive contract analysis with risk assessment
- Multi-tool analysis for thorough investigation

TOOL CALLING FORMAT:
TOOL_CALL: tool_name
ARGS: {"param1": "value1", "param2": "value2"}
END_TOOL_CALL

After receiving tool results, you MUST either:
1. Call another tool if you need more information, OR
2. Provide "FINAL_ANSWER: " with your analysis

NEVER output empty responses. ALWAYS provide FINAL_ANSWER when you have enough data.

CRITICAL RULES:
1. **CHAIN SELECTION**: 
   - If chainId specified → use that chain ONLY
   - If no chainId → use chain_id "1" (Ethereum)
   - For multi-chain → only if user says "all chains", "across chains", etc.

2. **PAGINATION**: If response includes "pagination", note it in your answer but don't call it unless user asks for MORE data

3. **CALCULATIONS**: Always calculate totals, averages, min/max from the data

4. **COMPREHENSIVE DATA**: If user asks for "last 10 transactions" and you only get 5, note "only 5 transactions available"

5. **CONTRACT SAFETY**: 
   - Check is_verified, is_scam, reputation
   - Get transaction patterns
   - Analyze creator address
   - Provide risk assessment

6. **ALWAYS PROVIDE FINAL_ANSWER**: After getting tool data, analyze it and provide FINAL_ANSWER. Do NOT output empty responses.

7. **COMPREHENSIVE CONTRACT ANALYSIS**: When analyzing contracts, ALWAYS call multiple tools:
   - get_address_info (for basic contract info)
   - get_transactions_by_address (for transaction history)
   - get_tokens_by_address (for token holdings)
   - get_token_info (for specific token details if needed)
   - Then provide detailed analysis with risk assessment

RESPONSE FORMAT:
- Use TOOL_CALL when you need data
- ALWAYS use FINAL_ANSWER when you have data to analyze
- Be detailed and specific in FINAL_ANSWER

EXAMPLE CONVERSATIONS:

User: "What's the last transaction for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?"
Assistant:
TOOL_CALL: get_transactions_by_address
ARGS: {"address": "0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55", "chain_id": "1", "page_size": 1, "order": "desc"}
END_TOOL_CALL

[After receiving results with transaction data]
FINAL_ANSWER: The last transaction for this address was:
- Hash: 0x604650...
- Timestamp: 2024-12-23 05:24:11 UTC
- From: 0x49f51...
- To: 0x6900E...
- Value: 0.00059 ETH
- Gas Fee: 0.000093 ETH

User: "What was my total gas spend in the last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?"
Assistant:
TOOL_CALL: get_transactions_by_address
ARGS: {"address": "0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55", "chain_id": "1", "page_size": 10, "order": "desc"}
END_TOOL_CALL

[After receiving transaction data, you MUST analyze it]
FINAL_ANSWER: I analyzed the last 5 transactions for this address (only 5 available):

**Total Gas Spent: 0.000974575903387 ETH**

Breakdown by transaction:
1. 0x6046... (Dec 23, 2024) - Fee: 93053538291000 wei (0.000093 ETH)
2. 0x91f3... (Jul 16, 2024) - Fee: 174760240158000 wei (0.000175 ETH)
3. 0x9deb... (Jun 6, 2024) - Fee: 155792616168000 wei (0.000156 ETH)
4. 0xc1a9... (Apr 7, 2024) - Fee: 284412884070000 wei (0.000284 ETH)
5. 0x2815... (Apr 7, 2024) - Fee: 266556828678000 wei (0.000267 ETH)

**Statistics:**
- Average per transaction: 0.000195 ETH
- Highest fee: 0.000284 ETH (Transaction 4)
- Lowest fee: 0.000093 ETH (Transaction 1)

CRITICAL: When you receive tool results, you MUST:
1. Extract the "fee" field from each transaction (it's in wei)
2. Sum all fees together
3. Convert to ETH by dividing by 1e18
4. Provide detailed breakdown
5. Calculate statistics (average, min, max)

User: "Analyze this contract's safety: 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b"
Assistant:
TOOL_CALL: get_address_info
ARGS: {"address": "0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b", "chain_id": "11155111"}
END_TOOL_CALL

[After receiving contract info, call additional tools for comprehensive analysis]
TOOL_CALL: get_transactions_by_address
ARGS: {"address": "0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b", "chain_id": "11155111", "page_size": 20, "order": "desc"}
END_TOOL_CALL

TOOL_CALL: get_tokens_by_address
ARGS: {"address": "0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b", "chain_id": "11155111"}
END_TOOL_CALL

[After receiving all data, provide comprehensive analysis]
FINAL_ANSWER: **Contract Analysis: Vault (0xB6C5...4C4b) on Sepolia Testnet**

✅ **SAFE TO INTERACT**

**Contract Details:**
- Name: Vault
- Type: Smart Contract
- Verified: ✅ Yes (Source code available)
- Scam Flag: ✅ No
- Reputation: OK
- Creator: 0x49f51...D55
- Creation TX: 0xf69165d03939a0113bf339b997a9cd67c86118cee1aa3b93b3b4ba6b0728d24a

**Activity Analysis:**
- ETH Balance: 0 ETH
- Has Logs: ✅ Yes (Contract emits events)
- Has Token Transfers: ✅ Yes
- Has Tokens: ✅ Yes
- Transaction Count: [From transaction data]

**Token Holdings:**
[From token data - list all tokens with balances]

**Risk Assessment:**
- ✅ Contract is verified - source code available
- ✅ No scam flags detected
- ✅ Has transaction history
- ✅ Created successfully
- ✅ Creator address has good reputation

**Risk Level: LOW**
This contract appears safe for interaction on Sepolia testnet.

**Recommendations:**
- Review the verified source code before interacting
- Check transaction patterns for any unusual activity
- Verify token holdings and transfer patterns

User: "What tokens did creator 0xDEF... launch?"
Assistant:
TOOL_CALL: get_transactions_by_address
ARGS: {"address": "0xDEF...", "chain_id": "1", "page_size": 50}
END_TOOL_CALL
[Analyze results for contract creations, then call get_token_info for each]
FINAL_ANSWER: Creator 0xDEF... launched 3 tokens:
1. Token A (0x123...) - Active, 500 holders
2. Token B (0x456...) - Abandoned, rug pull suspected
3. Token C (0x789...) - Current project, 1000+ holders

User: "Show me address 0xXYZ... across all chains"
Assistant:
TOOL_CALL: get_address_info
ARGS: {"address": "0xXYZ...", "chain_id": "1"}
END_TOOL_CALL
[Then call for chains 11155111, 84532, 10, 42161]
FINAL_ANSWER: Multi-chain analysis for 0xXYZ...:
- Ethereum: 10 ETH, 5 tokens
- Sepolia: 2 ETH, 15 tokens
- Optimism: 0.5 ETH, 2 tokens
Total activity on 3 chains...

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
        return answer || content; // Fallback to full content if answer is empty
      }

      // If no FINAL_ANSWER marker, return the whole content
      // But if content is empty or just JSON, return a message
      if (!content || content.trim().length === 0 || content.trim() === '[]' || content.includes('"type":"text","text":""')) {
        return "Analysis in progress. The agent called tools but didn't provide a final answer. Please check toolCalls for the data retrieved.";
      }
      
      return content;
    } catch (error) {
      this.logger.error('Error extracting final response:', error);
      return "Analysis completed. Please check toolCalls for the data retrieved.";
    }
  }

  private async executeTool(toolName: string, args: any, defaultChainId?: string): Promise<any> {
    if (!this.mcpClient) {
      throw new Error('MCP Client not connected');
    }

    // Ensure chain_id is present
    if (!args.chain_id && defaultChainId) {
      args.chain_id = defaultChainId;
    }

    const tool = this.availableTools.find((t: any) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

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
        
        // Handle pagination - include cursor info in the result
        if (parsed.pagination && parsed.pagination.next_call) {
          this.logger.info(`📄 Pagination available - next page cursor exists`);
        }
        
        return parsed;
      } catch (error) {
        return contentArray[0].text;
      }
    }

    return contentArray;
  }

  // Check if the user message is requesting multi-chain analysis
  private isMultiChainRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const multiChainKeywords = [
      'across all chains', 'all chains', 'multiple chains', 'every chain',
      'each chain', 'all networks', 'multi-chain', 'multichain',
      'by chain', 'breakdown by chain', 'per chain',
      'compare', 'vs', 'versus', 'which chain', 'most active'
    ];
    
    // Check for explicit multi-chain keywords
    if (multiChainKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }
    
    // Check if multiple specific chains are mentioned
    // Note: Check longer names first to avoid false positives (e.g., "base sepolia" before "sepolia")
    const chainMentions = [];
    
    if (lowerMessage.includes('base sepolia')) {
      chainMentions.push('base sepolia');
    } else if (lowerMessage.includes('base')) {
      chainMentions.push('base');
    }
    
    // Only check for standalone "sepolia" if "base sepolia" wasn't found
    if (!chainMentions.includes('base sepolia') && lowerMessage.includes('sepolia')) {
      chainMentions.push('sepolia');
    }
    
    if (lowerMessage.includes('ethereum') || lowerMessage.includes('eth mainnet') || (lowerMessage.includes('mainnet') && !lowerMessage.includes('sepolia'))) {
      chainMentions.push('ethereum');
    }
    
    if (lowerMessage.includes('optimism') || lowerMessage.includes(' op ')) {
      chainMentions.push('optimism');
    }
    
    if (lowerMessage.includes('arbitrum') || lowerMessage.includes('arb')) {
      chainMentions.push('arbitrum');
    }
    
    // If 2 or more DISTINCT chains are mentioned, it's a multi-chain request
    return chainMentions.length >= 2;
  }

  // Check if the user is asking about tokens
  private isTokenQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const tokenKeywords = [
      'token', 'tokens', 'holdings', 'hold', 'owns', 'erc20', 'erc-20',
      'what tokens', 'which tokens', 'token holdings', 'token balance',
      'portfolio', 'distribution', 'suspicious', 'safety', 'creators'
    ];
    return tokenKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Check if the user is asking about transactions
  private isTransactionQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const txKeywords = [
      'transaction', 'transactions', 'tx', 'txs', 'transfer', 'transfers',
      'activity', 'activities', 'history', 'recent', 'last',
      'interactions', 'interact', 'defi', 'protocols', 'patterns',
      'comprehensive report', 'risk profile', 'assess'
    ];
    return txKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Check if the user is asking about gas
  private isGasQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const gasKeywords = [
      'gas', 'fee', 'fees', 'cost', 'spend', 'spent', 'efficiency', 'breakdown'
    ];
    return gasKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Check if the user message is requesting contract analysis
  private isContractAnalysisRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const contractKeywords = [
      'analyze', 'analysis', 'contract', 'safety', 'risk', 'assess',
      'evaluate', 'check', 'investigate', 'examine', 'review'
    ];
    const hasContractKeyword = contractKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(message);
    return hasContractKeyword && hasAddress;
  }

  // Extract address from user message
  private extractAddressFromMessage(message: string): string {
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    return addressMatch ? addressMatch[0] : '';
  }

  // Extract which specific chains are mentioned in the message
  private extractRequestedChains(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const chains: string[] = [];
    
    // Check for specific chains (longer names first to avoid false positives)
    if (lowerMessage.includes('base sepolia')) {
      chains.push('84532');
    } else if (lowerMessage.includes('base')) {
      chains.push('84532');
    }
    
    // Only check for standalone "sepolia" if "base sepolia" wasn't found
    if (!chains.includes('84532') && lowerMessage.includes('sepolia')) {
      chains.push('11155111');
    }
    
    if (lowerMessage.includes('ethereum') || lowerMessage.includes('eth mainnet') || (lowerMessage.includes('mainnet') && !lowerMessage.includes('sepolia'))) {
      if (!chains.includes('1')) chains.push('1');
    }
    
    if (lowerMessage.includes('optimism') || lowerMessage.includes(' op ')) {
      if (!chains.includes('10')) chains.push('10');
    }
    
    if (lowerMessage.includes('arbitrum') || lowerMessage.includes('arb')) {
      if (!chains.includes('42161')) chains.push('42161');
    }
    
    return chains;
  }

  // Removed - now handled by response generator

  // Removed gas analysis - now handled by response generator

  // Removed bulky transaction pattern analysis - now handled by response generator

  private weiToEth(weiString: string): string {
    try {
      const len = weiString.length;
      if (len === 0 || weiString === '0') return '0';
      const whole = len > 18 ? weiString.slice(0, len - 18) : '0';
      const frac = weiString.padStart(19, '0').slice(-18).slice(0, 6).replace(/0+$/, '') || '0';
      return frac === '0' ? whole : `${whole}.${frac}`;
    } catch {
      return '0';
    }
  }

  private buildSummaryFromToolCalls(toolCallsMade: any[], userMessage: string): string {
    // Use the new response generator for intelligent, context-aware responses
    return this.responseGenerator.generateResponse(userMessage, toolCallsMade);
  }

  // Removed - now handled by response generator

  // Build a comprehensive contract analysis from multiple tool results
  // Removed - now handled by response generator

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

