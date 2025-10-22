import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';
import { DockerMCPClient } from './docker-mcp-client.js';
import fs from 'fs';
import path from 'path';

export interface AnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
  chainId?: number;
}

export class SimpleBlockscoutAgent {
  private mcpClient: DockerMCPClient | null = null;
  private llm: ChatGoogleGenerativeAI;
  private logger: Logger;
  public isInitialized: boolean = false;
  public availableTools: any[] = [];
  private mcpConfig: any;

  constructor() {
    this.logger = new Logger('SimpleBlockscoutAgent');
    
    // Initialize Gemini LLM
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
      this.logger.info('Initializing Simple Blockscout Agent...');

      // Load MCP configuration
      const mcpConfigPath = path.resolve(process.cwd(), 'mcp-config.json');
      this.mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
      this.logger.info('Loaded MCP configuration from mcp-config.json');

      // Initialize Docker MCP client (real MCP via Docker proxy)
      this.mcpClient = new DockerMCPClient(this.mcpConfig);

      await this.mcpClient.connect();
      this.logger.info('Connected to real Blockscout MCP server via Docker');

      // Load available tools
      const toolsResponse = await this.mcpClient.listTools();
      this.availableTools = toolsResponse.tools || [];
      this.logger.info(`Loaded ${this.availableTools.length} real MCP tools from server`);

      // Log available tools for debugging
      this.availableTools.forEach((tool: any) => {
        this.logger.info(`Real MCP tool: ${tool.name} - ${tool.description || 'No description'}`);
      });

      // Unlock session for multiple chains to enable all tools
      await this.unlockMultipleChains();

      this.isInitialized = true;
      this.logger.info('Simple Blockscout Agent with real MCP initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Simple Blockscout Agent:', error);
      // Continue with mock mode for development
      this.logger.warn('Continuing in mock mode');
      this.isInitialized = true;
    }
  }

  async callMcpTool(toolName: string, args: any): Promise<any> {
    if (!this.mcpClient) {
      throw new Error('MCP Client not connected');
    }

    // Check if tool exists
    const tool = this.availableTools.find((t: any) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found. Available tools: ${this.availableTools.map((t: any) => t.name).join(', ')}`);
    }

    this.logger.info(`Calling MCP tool: ${toolName} with args:`, args);

    const result = await this.mcpClient.callTool(toolName, args);

    this.logger.info(`MCP tool ${toolName} raw result:`, JSON.stringify(result).substring(0, 200));
    
    // Handle both response formats:
    // 1. {content: [{type: "text", text: "..."}]} - wrapped format
    // 2. [{type: "text", text: "..."}] - direct array format
    
    let contentArray;
    if (Array.isArray(result)) {
      // Direct array format from DockerMCPClient
      contentArray = result;
    } else if (result.content && Array.isArray(result.content)) {
      // Wrapped format
      contentArray = result.content;
    } else {
      this.logger.warn(`MCP tool ${toolName} returning unexpected format:`, result);
      return result;
    }
    
    // Parse the first content item
    if (contentArray.length > 0 && contentArray[0].type === 'text') {
      try {
        const parsed = JSON.parse(contentArray[0].text);
        this.logger.info(`MCP tool ${toolName} parsed result:`, JSON.stringify(parsed).substring(0, 200));
        return parsed;
      } catch (error) {
        this.logger.warn(`Failed to parse MCP response as JSON:`, error);
        return contentArray[0].text;
      }
    }
    
    this.logger.warn(`MCP tool ${toolName} returning raw content (unexpected format)`);
    return contentArray;
  }

  private getChainName(chainId: string): string {
    const chainNames: { [key: string]: string } = {
      '1': 'Ethereum Mainnet',
      '11155111': 'Sepolia',
      '84532': 'Base Sepolia',
      '10': 'Optimism',
      '42161': 'Arbitrum One',
      '137': 'Polygon',
      '56': 'BSC',
      '43114': 'Avalanche',
      '250': 'Fantom',
      '25': 'Cronos'
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  }

  private async unlockMultipleChains(): Promise<void> {
    // Priority chains to unlock (most commonly used)
    const priorityChains = [
      { id: '1', name: 'Ethereum Mainnet' },
      { id: '11155111', name: 'Sepolia' },
      { id: '84532', name: 'Base Sepolia' },
      { id: '10', name: 'Optimism' },
      { id: '42161', name: 'Arbitrum One' }
    ];

    this.logger.info('🔓 Unlocking blockchain analysis tools for priority chains...');

    for (const chain of priorityChains) {
      try {
        await this.mcpClient!.callTool('__unlock_blockchain_analysis__', {
          chain_id: chain.id
        });
        this.logger.info(`✅ Unlocked tools for ${chain.name} (${chain.id})`);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        this.logger.warn(`⚠️ Failed to unlock ${chain.name} (${chain.id}):`, e);
      }
    }

    this.logger.info('🔓 Chain unlock process completed');
  }

  async analyzeTransaction(txHash: string, chainId?: number): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      this.logger.info(`Analyzing transaction: ${txHash}`);
      
      // Get transaction data using MCP tools
      let transactionData = null;
      if (this.mcpClient) {
        try {
          const chain = String(chainId ?? '1');
          transactionData = await this.callMcpTool('get_transaction_info', { transaction_hash: txHash, chain_id: chain });
        } catch (error) {
          this.logger.warn('Failed to get transaction data from MCP');
        }
      }

      // Create analysis prompt
      const prompt = `
Analyze this blockchain transaction in detail:
- Transaction Hash: ${txHash}
- Chain ID: ${chainId || 'auto-detect'}
- Transaction Data: ${transactionData ? JSON.stringify(transactionData) : 'Not available'}

Please provide:
1. Transaction details (from, to, value, gas, etc.)
2. Method call analysis
3. Risk assessment (1-10 scale)
4. Behavioral insights
5. Potential MEV activity
6. Security concerns
7. Recommendations

Provide a comprehensive analysis based on the available data.
`;

      const messages = [
        new SystemMessage(`You are a blockchain intelligence agent. Analyze the provided transaction data and provide detailed insights.`),
        new HumanMessage(prompt)
      ];

      const result = await this.llm.invoke(messages);

      return {
        success: true,
        data: result,
        timestamp: new Date(),
        chainId,
      };
    } catch (error) {
      this.logger.error(`Error analyzing transaction ${txHash}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        chainId,
      };
    }
  }

  async analyzeWallet(address: string, chainId?: number): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      this.logger.info(`Analyzing wallet: ${address}`);
      
      // Get wallet data using MCP tools
      let walletData = null;
      if (this.mcpClient) {
        try {
          const chain = String(chainId ?? '1');
          walletData = await this.callMcpTool('get_address_info', { address, chain_id: chain });
        } catch (error) {
          this.logger.warn('Failed to get wallet data from MCP');
        }
      }

      const prompt = `
Analyze this blockchain wallet in detail:
- Address: ${address}
- Chain ID: ${chainId || 'auto-detect'}
- Wallet Data: ${walletData ? JSON.stringify(walletData) : 'Not available'}

Please provide:
1. Wallet overview and identity
2. Asset portfolio analysis
3. Transaction history patterns
4. Behavioral intelligence
5. Risk assessment (1-10 scale)
6. DeFi positions and strategies
7. Cross-chain activity
8. Recommendations

Provide a comprehensive analysis based on the available data.
`;

      const messages = [
        new SystemMessage(`You are a blockchain intelligence agent. Analyze the provided wallet data and provide detailed insights.`),
        new HumanMessage(prompt)
      ];

      const result = await this.llm.invoke(messages);

      return {
        success: true,
        data: result,
        timestamp: new Date(),
        chainId,
      };
    } catch (error) {
      this.logger.error(`Error analyzing wallet ${address}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        chainId,
      };
    }
  }

  async analyzeContract(address: string, chainId?: number): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      this.logger.info(`Analyzing contract: ${address}`);
      
      // Get contract data using MCP tools
      let contractData = null;
      if (this.mcpClient) {
        try {
          const chain = String(chainId ?? '1');
          contractData = await this.callMcpTool('get_contract_abi', { address, chain_id: chain });
        } catch (error) {
          this.logger.warn('Failed to get contract data from MCP');
        }
      }

      const prompt = `
Analyze this smart contract in detail:
- Contract Address: ${address}
- Chain ID: ${chainId || 'auto-detect'}
- Contract Data: ${contractData ? JSON.stringify(contractData) : 'Not available'}

Please provide:
1. Contract overview and purpose
2. Source code analysis
3. Security vulnerability assessment
4. Gas optimization opportunities
5. Risk assessment (1-10 scale)
6. Economic security review
7. Upgrade and governance analysis
8. Recommendations

Provide a comprehensive analysis based on the available data.
`;

      const messages = [
        new SystemMessage(`You are a blockchain intelligence agent. Analyze the provided contract data and provide detailed insights.`),
        new HumanMessage(prompt)
      ];

      const result = await this.llm.invoke(messages);

      return {
        success: true,
        data: result,
        timestamp: new Date(),
        chainId,
      };
    } catch (error) {
      this.logger.error(`Error analyzing contract ${address}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        chainId,
      };
    }
  }

  async executeCustomPrompt(prompt: string, chainId?: string): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      this.logger.info('Executing custom prompt');
      
      // Check for simple transaction query FIRST (before comprehensive analysis)
      if (this.isSimpleTransactionQuery(prompt)) {
        return await this.performSimpleTransactionQuery(prompt, chainId);
      }

      // Enhanced transaction analysis with multi-chain support
      if (this.isTransactionAnalysisRequest(prompt)) {
        return await this.performComprehensiveTransactionAnalysis(prompt, chainId);
      }

      // Contract analysis
      if (this.isContractAnalysisRequest(prompt)) {
        return await this.performContractAnalysis(prompt, chainId);
      }

      // Token analysis
      if (this.isTokenAnalysisRequest(prompt)) {
        return await this.performTokenAnalysis(prompt, chainId);
      }

      // Enhanced address analysis with multi-chain support
      if (this.isAddressAnalysisRequest(prompt)) {
        return await this.performComprehensiveAddressAnalysis(prompt, chainId);
      }

      // Check if the prompt is asking for address balance or info
      if (prompt.toLowerCase().includes('balance') || prompt.toLowerCase().includes('address')) {
        // Extract address from prompt
        const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
          const address = addressMatch[0];
          this.logger.info(`Detected address balance request for: ${address}`);
          
          // Try to use MCP tools first
          let mcpData = null;
          if (this.mcpClient) {
            try {
              this.logger.info('Using MCP tools to get address info...');
              const chainIdMatch = prompt.match(/chain_id\s*\"(\d+)\"/i);
              const chainIdStr = chainIdMatch ? chainIdMatch[1] : '1';
              mcpData = await this.callMcpTool('get_address_info', { address, chain_id: chainIdStr });
              this.logger.info('Got address data from MCP server');
            } catch (mcpError) {
              this.logger.warn('MCP tool failed:', mcpError);
            }
          }

          const analysisPrompt = `
Analyze this address: ${address}

${mcpData ? `Address Data from MCP/API: ${JSON.stringify(mcpData, null, 2)}` : 'No data available'}

Please provide:
1. Current balance and address information
2. Address type (contract or EOA)
3. Transaction activity and patterns
4. Token holdings
5. Risk assessment
6. Key insights and recommendations

Use the data provided above. If no data is available, explain why and suggest alternatives.
`;

          const messages = [
            new SystemMessage(`You are a blockchain intelligence agent. Analyze address data and provide comprehensive insights.`),
            new HumanMessage(analysisPrompt)
          ];

          const result = await this.llm.invoke(messages);
          return {
            success: true,
            data: result.content,
            timestamp: new Date(),
          };
        }
      }

      // Check if the prompt is asking for human-readable transaction summary
      if (prompt.toLowerCase().includes('human-readable transaction summary') || prompt.toLowerCase().includes('transaction summary')) {
        // Extract transaction hash from prompt (40 or 64 characters)
        const txMatch = prompt.match(/0x[a-fA-F0-9]{40,64}/);
        if (txMatch) {
          const txHash = txMatch[0];
          this.logger.info(`Detected human-readable transaction summary request for: ${txHash}`);
          
          // Try to use MCP transaction_summary tool first
          let mcpData = null;
          if (this.mcpClient) {
            try {
              this.logger.info('Using MCP transaction_summary tool...');
              const chainIdMatch = prompt.match(/chain_id\s*\"(\d+)\"/i);
              const chainIdStr = chainIdMatch ? chainIdMatch[1] : '1';
              mcpData = await this.callMcpTool('transaction_summary', { transaction_hash: txHash, chain_id: chainIdStr });
              this.logger.info('Got transaction summary from MCP server');
            } catch (mcpError) {
              this.logger.warn('MCP transaction_summary tool failed, trying get_transaction_info:', mcpError);
              try {
                const chainIdMatch2 = prompt.match(/chain_id\s*\"(\d+)\"/i);
                const chainIdStr2 = chainIdMatch2 ? chainIdMatch2[1] : '1';
                mcpData = await this.callMcpTool('get_transaction_info', { transaction_hash: txHash, chain_id: chainIdStr2 });
                this.logger.info('Got transaction info from MCP server');
              } catch (mcpError2) {
                this.logger.warn('MCP get_transaction_info also failed:', mcpError2);
              }
            }
          }

          const analysisPrompt = `
Provide a human-readable summary of this transaction: ${txHash}

${mcpData ? `Transaction Data from MCP/API: ${JSON.stringify(mcpData, null, 2)}` : 'No transaction data available'}

Please provide:
1. Basic transaction information (hash, block, timestamp, from, to, value)
2. Gas usage and fees
3. Contract interactions and function calls
4. Token transfers (if any)
5. Human-readable explanation of what this transaction did
6. Risk assessment and security notes
7. Key insights

Format this as a clear, human-readable summary that anyone can understand.
`;

          const messages = [
            new SystemMessage(`You are a blockchain intelligence agent. Provide clear, human-readable transaction summaries.`),
            new HumanMessage(analysisPrompt)
          ];

          const result = await this.llm.invoke(messages);
          return {
            success: true,
            data: result.content,
            timestamp: new Date(),
          };
        }
      }

      // Check if the prompt is asking for transaction analysis
      if (prompt.toLowerCase().includes('transaction') || prompt.toLowerCase().includes('tx')) {
        // Extract transaction hash from prompt (40 or 64 characters)
        const txMatch = prompt.match(/0x[a-fA-F0-9]{40,64}/);
        if (txMatch) {
          const txHash = txMatch[0];
          this.logger.info(`Detected transaction analysis request for: ${txHash}`);
          
          // Try to use MCP tools first
          let mcpData = null;
          if (this.mcpClient) {
            try {
              this.logger.info('Using MCP tools to get transaction info...');
              const chainIdMatch = prompt.match(/chain_id\s*\"(\d+)\"/i);
              const chainIdStr = chainIdMatch ? chainIdMatch[1] : '1';
              mcpData = await this.callMcpTool('get_transaction_info', { transaction_hash: txHash, chain_id: chainIdStr });
              this.logger.info('Got transaction data from MCP server');
            } catch (mcpError) {
              this.logger.warn('MCP tool failed:', mcpError);
            }
          }

          const analysisPrompt = `
Analyze this transaction: ${txHash}

${mcpData ? `Transaction Data from MCP/API: ${JSON.stringify(mcpData, null, 2)}` : 'No transaction data available'}

Please provide:
1. Transaction details (from, to, value, gas, etc.)
2. Method call analysis
3. Risk assessment (1-10 scale)
4. Behavioral insights
5. Potential MEV activity
6. Security concerns
7. Recommendations

Use the data provided above. If no data is available, explain why and suggest alternatives.
`;

          const messages = [
            new SystemMessage(`You are a blockchain intelligence agent. Analyze transaction data and provide detailed insights.`),
            new HumanMessage(analysisPrompt)
          ];

          const result = await this.llm.invoke(messages);
          return {
            success: true,
            data: result.content,
            timestamp: new Date(),
          };
        }
      }

      // Check if the prompt is asking for transaction history
      if (prompt.toLowerCase().includes('transaction history') || prompt.toLowerCase().includes('transaction histroy')) {
        // Extract address from prompt
        const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
          const address = addressMatch[0];
          this.logger.info(`Detected transaction history request for address: ${address}`);
          
          // Try to use MCP tools first
          let mcpData = null;
          if (this.mcpClient) {
            try {
              this.logger.info('Using MCP tools to get transaction history...');
              const chainIdMatch = prompt.match(/chain_id\s*\"(\d+)\"/i);
              const chainIdStr = chainIdMatch ? chainIdMatch[1] : '1';
              mcpData = await this.callMcpTool('get_transactions_by_address', { address, chain_id: chainIdStr });
              this.logger.info('Got transaction history from MCP server');
            } catch (mcpError) {
              this.logger.warn('MCP tool failed:', mcpError);
            }
          }

          const analysisPrompt = `
Analyze the transaction history for this address: ${address}

${mcpData ? `Transaction History from MCP/API: ${JSON.stringify(mcpData, null, 2)}` : 'No transaction history available'}

Please provide:
1. Complete transaction history analysis
2. Transaction patterns and frequency
3. Smart contract interactions
4. Token transfers and holdings
5. Address behavior analysis
6. Risk assessment
7. Key insights and observations

Use the data provided above. If no data is available, explain why and suggest alternatives.
`;

          const messages = [
            new SystemMessage(`You are a blockchain intelligence agent. Analyze transaction data and provide detailed insights.`),
            new HumanMessage(analysisPrompt)
          ];

          const result = await this.llm.invoke(messages);
          return {
            success: true,
            data: result.content,
            timestamp: new Date(),
          };
        }
      }

      // Regular custom prompt handling
      const messages = [
        new SystemMessage(`You are a blockchain intelligence agent. Respond to the user's custom prompt.`),
        new HumanMessage(prompt)
      ];

      const result = await this.llm.invoke(messages);

      return {
        success: true,
        data: result.content,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error executing custom prompt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  // Enhanced analysis methods
  private isSimpleTransactionQuery(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    const simpleQueryKeywords = [
      'last transaction', 'latest transaction', 'recent transaction',
      'fetch transaction', 'get transaction', 'show transaction',
      'last tx', 'latest tx', 'recent tx'
    ];
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(prompt);
    const isSimpleQuery = simpleQueryKeywords.some(keyword => lowerPrompt.includes(keyword));
    return hasAddress && isSimpleQuery;
  }

  private isAddressAnalysisRequest(prompt: string): boolean {
    const addressKeywords = ['analyze', 'safe', 'risk', 'wallet', 'is this', 'legit', 'suspicious'];
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(prompt);
    const hasKeywords = addressKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
    return hasAddress && hasKeywords;
  }

  private isTransactionAnalysisRequest(prompt: string): boolean {
    const txKeywords = ['transaction', 'tx', 'hash', 'analyze', 'legit', 'safe'];
    const hasTxHash = /0x[a-fA-F0-9]{64}/.test(prompt);
    const hasKeywords = txKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
    return hasTxHash && hasKeywords;
  }

  private isContractAnalysisRequest(prompt: string): boolean {
    const contractKeywords = ['contract', 'interact', 'interaction', 'dapp', 'protocol'];
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(prompt);
    const hasKeywords = contractKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
    return hasAddress && hasKeywords;
  }

  private isTokenAnalysisRequest(prompt: string): boolean {
    const tokenKeywords = ['tokens', 'token', 'hold', 'holdings', 'portfolio', 'balance', 'what', 'show', 'get'];
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(prompt);
    const hasKeywords = tokenKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
    return hasAddress && hasKeywords;
  }

  private async performSimpleTransactionQuery(prompt: string, chainId?: string): Promise<AnalysisResult> {
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      throw new Error('No valid address found in prompt');
    }

    const address = addressMatch[0];
    const chain = chainId || '1';
    this.logger.info(`🔍 Fetching last transaction for: ${address} on chain ${chain}`);

    try {
      // Fetch the most recent transaction
      const transactions = await this.callMcpTool('get_transactions_by_address', { 
        address, 
        chain_id: chain, 
        page_size: 1, 
        order: 'desc' 
      });

      if (!transactions || !transactions.data || transactions.data.length === 0) {
        return {
          success: false,
          error: `No transactions found for address ${address} on chain ${this.getChainName(chain)}`,
          timestamp: new Date(),
        };
      }

      const lastTx = transactions.data[0];
      
      // Format the response in a clean, readable way
      const response = {
        chain: this.getChainName(chain),
        chainId: chain,
        address: address,
        lastTransaction: {
          hash: lastTx.hash,
          timestamp: lastTx.timestamp,
          from: lastTx.from,
          to: lastTx.to,
          value: lastTx.value,
          type: lastTx.type,
          method: lastTx.method || 'transfer',
          blockNumber: lastTx.block_number,
          fee: lastTx.fee,
          status: lastTx.status || 'confirmed'
        }
      };

      return {
        success: true,
        data: response,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error fetching last transaction for ${address}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  private async performComprehensiveAddressAnalysis(prompt: string, chainId?: string): Promise<AnalysisResult> {
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      throw new Error('No valid address found in prompt');
    }

    const address = addressMatch[0];
    this.logger.info(`🔍 Performing comprehensive address analysis for: ${address}${chainId ? ` on chain ${chainId}` : ''}`);

    // Use specified chain or analyze all priority chains
    const chains = chainId ? 
      [{ id: chainId, name: this.getChainName(chainId) }] :
      [
        { id: '1', name: 'Ethereum Mainnet' },
        { id: '11155111', name: 'Sepolia' },
        { id: '84532', name: 'Base Sepolia' },
        { id: '10', name: 'Optimism' },
        { id: '42161', name: 'Arbitrum One' }
      ];

    const chainData: any = {};
    let totalRiskScore = 0;
    let chainCount = 0;

    // Collect data from all chains
    for (const chain of chains) {
      try {
        this.logger.info(`📊 Analyzing ${address} on ${chain.name}...`);
        
        const [addressInfo, addressTags, tokens, transactions] = await Promise.allSettled([
          this.callMcpTool('get_address_info', { address, chain_id: chain.id }),
          this.callMcpTool('get_address_tags', { address, chain_id: chain.id }),
          this.callMcpTool('get_tokens_by_address', { address, chain_id: chain.id, page_size: 100 }),
          this.callMcpTool('get_transactions_by_address', { address, chain_id: chain.id, page_size: 50, order: 'desc' })
        ]);

        const chainInfo = {
          addressInfo: addressInfo.status === 'fulfilled' ? addressInfo.value : null,
          addressTags: addressTags.status === 'fulfilled' ? addressTags.value : null,
          tokens: tokens.status === 'fulfilled' ? tokens.value : null,
          transactions: transactions.status === 'fulfilled' ? transactions.value : null
        };

        if (chainInfo.addressInfo || chainInfo.transactions) {
          chainData[chain.name] = chainInfo;
          chainCount++;
          
          // Calculate risk score for this chain
          const riskScore = this.calculateAddressRiskScore(chainInfo, chain.name);
          totalRiskScore += riskScore;
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.warn(`⚠️ Failed to analyze ${address} on ${chain.name}:`, error);
      }
    }

    const averageRiskScore = chainCount > 0 ? Math.round(totalRiskScore / chainCount) : 0;

    const analysisPrompt = `
COMPREHENSIVE ADDRESS ANALYSIS REPORT

Address: ${address}
Chains Analyzed: ${chainCount} chains
Overall Risk Score: ${averageRiskScore}/10

DETAILED CHAIN DATA:
${JSON.stringify(chainData, null, 2)}

ANALYSIS REQUIREMENTS:
1. **SAFETY ASSESSMENT**: Is this address safe to interact with? (Yes/No with reasoning)
2. **RISK BREAKDOWN**: Detailed risk factors from each chain
3. **ACTIVITY PATTERNS**: Transaction patterns, frequency, amounts
4. **TOKEN INTERACTIONS**: All tokens interacted with across chains
5. **CONTRACT INTERACTIONS**: Smart contracts and protocols used
6. **REPUTATION**: Tags, labels, and known associations
7. **CROSS-CHAIN BEHAVIOR**: Activity consistency across chains
8. **RECOMMENDATIONS**: Specific actions (SAFE, CAUTION, AVOID, REPORT)

Provide a comprehensive analysis with specific evidence from the data above. Be detailed and cite specific transaction hashes, contract addresses, and dates when relevant.`;

    const messages = [
      new SystemMessage(`You are an expert blockchain security analyst. Analyze the provided data comprehensively and provide detailed insights with specific evidence.`),
      new HumanMessage(analysisPrompt)
    ];

    const result = await this.llm.invoke(messages);
    return {
      success: true,
      data: result.content,
      timestamp: new Date(),
    };
  }

  private async performComprehensiveTransactionAnalysis(prompt: string, chainId?: string): Promise<AnalysisResult> {
    const txMatch = prompt.match(/0x[a-fA-F0-9]{64}/);
    if (!txMatch) {
      throw new Error('No valid transaction hash found in prompt');
    }

    const txHash = txMatch[0];
    this.logger.info(`🔍 Performing comprehensive transaction analysis for: ${txHash}${chainId ? ` on chain ${chainId}` : ''}`);

    // Use specified chain or search all priority chains
    const chains = chainId ? 
      [{ id: chainId, name: this.getChainName(chainId) }] :
      [
        { id: '1', name: 'Ethereum Mainnet' },
        { id: '11155111', name: 'Sepolia' },
        { id: '84532', name: 'Base Sepolia' },
        { id: '10', name: 'Optimism' },
        { id: '42161', name: 'Arbitrum One' }
      ];

    const chainData: any = {};
    let foundOnChains: string[] = [];

    // Search transaction across all chains
    for (const chain of chains) {
      try {
        this.logger.info(`🔍 Searching ${txHash} on ${chain.name}...`);
        
        const [txInfo, txLogs] = await Promise.allSettled([
          this.callMcpTool('get_transaction_info', { transaction_hash: txHash, chain_id: chain.id }),
          this.callMcpTool('get_transaction_logs', { transaction_hash: txHash, chain_id: chain.id })
        ]);

        if (txInfo.status === 'fulfilled' && txInfo.value) {
          chainData[chain.name] = {
            transaction: txInfo.value,
            logs: txLogs.status === 'fulfilled' ? txLogs.value : null
          };
          foundOnChains.push(chain.name);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.warn(`⚠️ Transaction not found on ${chain.name}`);
      }
    }

    if (foundOnChains.length === 0) {
      return {
        success: false,
        error: 'Transaction not found on any supported chain',
        timestamp: new Date(),
      };
    }

    const analysisPrompt = `
COMPREHENSIVE TRANSACTION ANALYSIS REPORT

Transaction Hash: ${txHash}
Found on Chains: ${foundOnChains.join(', ')}

DETAILED TRANSACTION DATA:
${JSON.stringify(chainData, null, 2)}

ANALYSIS REQUIREMENTS:
1. **LEGITIMACY**: Is this transaction legitimate? (Yes/No with reasoning)
2. **TRANSACTION DETAILS**: From, to, value, gas, method calls
3. **CONTRACT INTERACTIONS**: Which contracts were called and why
4. **TOKEN TRANSFERS**: All token movements and amounts
5. **RISK ASSESSMENT**: Security concerns, MEV, suspicious patterns
6. **BEHAVIORAL ANALYSIS**: Transaction patterns and intent
7. **CROSS-CHAIN IMPACT**: Effects across different chains
8. **RECOMMENDATIONS**: Safety recommendations and warnings

Provide detailed analysis with specific evidence from the transaction data.`;

    const messages = [
      new SystemMessage(`You are an expert blockchain transaction analyst. Analyze the provided transaction data comprehensively and provide detailed insights with specific evidence.`),
      new HumanMessage(analysisPrompt)
    ];

    const result = await this.llm.invoke(messages);
    return {
      success: true,
      data: result.content,
      timestamp: new Date(),
    };
  }

  private async performContractAnalysis(prompt: string, chainId?: string): Promise<AnalysisResult> {
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      throw new Error('No valid contract address found in prompt');
    }

    const contractAddress = addressMatch[0];
    this.logger.info(`🔍 Performing contract analysis for: ${contractAddress}${chainId ? ` on chain ${chainId}` : ''}`);

    // Use specified chain or search all priority chains
    const chains = chainId ? 
      [{ id: chainId, name: this.getChainName(chainId) }] :
      [
        { id: '1', name: 'Ethereum Mainnet' },
        { id: '11155111', name: 'Sepolia' },
        { id: '84532', name: 'Base Sepolia' },
        { id: '10', name: 'Optimism' },
        { id: '42161', name: 'Arbitrum One' }
      ];

    const chainData: any = {};
    let foundOnChains: string[] = [];

    for (const chain of chains) {
      try {
        this.logger.info(`🔍 Analyzing contract ${contractAddress} on ${chain.name}...`);
        
        const [contractInfo, contractABI, contractCode] = await Promise.allSettled([
          this.callMcpTool('get_address_info', { address: contractAddress, chain_id: chain.id }),
          this.callMcpTool('get_contract_abi', { address: contractAddress, chain_id: chain.id }),
          this.callMcpTool('inspect_contract_code', { address: contractAddress, chain_id: chain.id })
        ]);

        if (contractInfo.status === 'fulfilled' && contractInfo.value) {
          chainData[chain.name] = {
            contractInfo: contractInfo.value,
            abi: contractABI.status === 'fulfilled' ? contractABI.value : null,
            sourceCode: contractCode.status === 'fulfilled' ? contractCode.value : null
          };
          foundOnChains.push(chain.name);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.warn(`⚠️ Contract not found on ${chain.name}`);
      }
    }

    if (foundOnChains.length === 0) {
      return {
        success: false,
        error: 'Contract not found on any supported chain',
        timestamp: new Date(),
      };
    }

    const analysisPrompt = `
COMPREHENSIVE CONTRACT ANALYSIS REPORT

Contract Address: ${contractAddress}
Found on Chains: ${foundOnChains.join(', ')}

DETAILED CONTRACT DATA:
${JSON.stringify(chainData, null, 2)}

ANALYSIS REQUIREMENTS:
1. **CONTRACT PURPOSE**: What does this contract do?
2. **SECURITY ASSESSMENT**: Vulnerabilities, risks, and security concerns
3. **FUNCTIONALITY**: Key functions and their purposes
4. **UPGRADEABILITY**: Proxy patterns, admin controls, upgrade mechanisms
5. **TOKEN INTERACTIONS**: ERC standards, token handling
6. **GOVERNANCE**: Admin roles, ownership, control mechanisms
7. **AUDIT STATUS**: Known audits, verification status
8. **RECOMMENDATIONS**: Safety recommendations for interaction

Provide detailed analysis with specific evidence from the contract data.`;

    const messages = [
      new SystemMessage(`You are an expert smart contract security analyst. Analyze the provided contract data comprehensively and provide detailed insights with specific evidence.`),
      new HumanMessage(analysisPrompt)
    ];

    const result = await this.llm.invoke(messages);
    return {
      success: true,
      data: result.content,
      timestamp: new Date(),
    };
  }

  private calculateAddressRiskScore(chainInfo: any, chainName: string): number {
    let riskScore = 0;
    const reasons: string[] = [];

    // Check address info
    if (chainInfo.addressInfo) {
      const info = chainInfo.addressInfo;
      
      if (info.is_scam) { riskScore += 5; reasons.push(`${chainName}: Flagged as scam`); }
      if (info.reputation && info.reputation !== 'ok') { 
        riskScore += 3; 
        reasons.push(`${chainName}: Reputation ${info.reputation}`); 
      }
      
      // High balance check
      const balanceWei = BigInt(info.coin_balance ?? '0');
      const oneHundredEthWei = BigInt('100000000000000000000');
      if (balanceWei > oneHundredEthWei) { 
        riskScore += 1; 
        reasons.push(`${chainName}: High native balance`); 
      }
    }

    // Check tags
    if (chainInfo.addressTags) {
      const tags = [
        ...(chainInfo.addressTags.public_tags || []),
        ...(chainInfo.addressTags.private_tags || [])
      ].map((t: any) => (typeof t === 'string' ? t : (t?.name || ''))).join(' ').toLowerCase();

      if (/sanction|ofac|exploiter|exploit|hack|ronin|bridge.*exploit/i.test(tags)) { 
        riskScore = 10; 
        reasons.push(`${chainName}: Sanctioned/Exploiter tags`); 
      }
    }

    // Check transaction activity
    if (chainInfo.transactions) {
      const txCount = chainInfo.transactions.items?.length || 0;
      if (txCount > 100) { 
        riskScore += 1; 
        reasons.push(`${chainName}: High transaction activity`); 
      }
    }

    return Math.min(riskScore, 10);
  }

  private async performTokenAnalysis(prompt: string, chainId?: string): Promise<AnalysisResult> {
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      throw new Error('No valid address found in prompt');
    }

    const address = addressMatch[0];
    this.logger.info(`🪙 Performing token analysis for: ${address}${chainId ? ` on chain ${chainId}` : ''}`);

    // Use specified chain or default to Ethereum Mainnet
    const chains = chainId ? 
      [{ id: chainId, name: this.getChainName(chainId) }] :
      [{ id: '1', name: 'Ethereum Mainnet' }];

    const chainData: any = {};
    let totalTokens = 0;
    let chainCount = 0;

    // Collect token data from all chains
    for (const chain of chains) {
      try {
        this.logger.info(`🪙 Analyzing tokens for ${address} on ${chain.name}...`);
        
        const [addressInfo, tokens] = await Promise.allSettled([
          this.callMcpTool('get_address_info', { address, chain_id: chain.id }),
          this.callMcpTool('get_tokens_by_address', { address, chain_id: chain.id, page_size: 100 })
        ]);

        const chainInfo = {
          addressInfo: addressInfo.status === 'fulfilled' ? addressInfo.value : null,
          tokens: tokens.status === 'fulfilled' ? tokens.value : null
        };

        if (chainInfo.addressInfo || chainInfo.tokens) {
          chainData[chain.name] = chainInfo;
          chainCount++;
          
          if (chainInfo.tokens && chainInfo.tokens.data) {
            totalTokens += chainInfo.tokens.data.length;
          }
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.warn(`⚠️ Failed to analyze tokens for ${address} on ${chain.name}:`, error);
      }
    }

    // Debug logging
    this.logger.info('🔍 Chain data collected:', JSON.stringify(chainData, null, 2));
    this.logger.info(`📊 Chain count: ${chainCount}, Total tokens: ${totalTokens}`);

    // Simple format for testing
    let formattedData = `\n=== TOKEN HOLDINGS ANALYSIS ===\n`;
    formattedData += `Address: ${address}\n`;
    formattedData += `Chains Analyzed: ${chainCount}\n`;
    formattedData += `Total Tokens Found: ${totalTokens}\n\n`;

    if (chainCount === 0) {
      formattedData += `No data found on Ethereum Mainnet for this address.\n`;
    } else {
      for (const [chainName, chainInfo] of Object.entries(chainData)) {
        formattedData += `\n--- ${chainName} ---\n`;
        
        const chainDataTyped = chainInfo as any;
        
        if (chainDataTyped.addressInfo?.data?.basic_info) {
          const info = chainDataTyped.addressInfo.data.basic_info;
          formattedData += `Native Balance: ${info.coin_balance} wei\n`;
          formattedData += `Exchange Rate: ${info.exchange_rate || 'N/A'}\n`;
        }
        
        if (chainDataTyped.tokens?.data?.length > 0) {
          formattedData += `Tokens (${chainDataTyped.tokens.data.length}):\n`;
          chainDataTyped.tokens.data.slice(0, 5).forEach((token: any) => {
            formattedData += `  • ${token.symbol} (${token.name}): ${token.balance}\n`;
          });
          if (chainDataTyped.tokens.data.length > 5) {
            formattedData += `  ... and ${chainDataTyped.tokens.data.length - 5} more tokens\n`;
          }
        } else {
          formattedData += `No tokens found\n`;
        }
      }
    }

    const analysisPrompt = `${formattedData}

ANALYSIS REQUIREMENTS:
1. **TOKEN PORTFOLIO**: List all tokens held across all chains with balances
2. **NATIVE CURRENCY**: ETH/POL balances on each chain  
3. **TOKEN METADATA**: Name, symbol, decimals, contract addresses
4. **MARKET DATA**: Exchange rates, market caps, volumes (if available)
5. **PORTFOLIO VALUE**: Estimated USD value of holdings
6. **TOKEN CATEGORIES**: DeFi tokens, stablecoins, governance tokens, etc.
7. **CROSS-CHAIN DISTRIBUTION**: How tokens are distributed across chains
8. **SIGNIFICANT HOLDINGS**: Highlight tokens with substantial balances

Provide a comprehensive token analysis with specific balances, contract addresses, and market data from the blockchain data above.`;

    const messages = [
      new SystemMessage(`You are an expert token portfolio analyst. Analyze the provided token data comprehensively and provide detailed insights with specific balances and market information.`),
      new HumanMessage(analysisPrompt)
    ];

    const result = await this.llm.invoke(messages);
    return {
      success: true,
      data: result.content,
      timestamp: new Date(),
    };
  }

  async disconnect(): Promise<void> {
    try {
      if (this.mcpClient) {
        await this.mcpClient.disconnect();
      }
      this.isInitialized = false;
      this.logger.info('Disconnected from Blockscout MCP server');
    } catch (error) {
      this.logger.error('Error disconnecting from MCP server:', error);
    }
  }
}
