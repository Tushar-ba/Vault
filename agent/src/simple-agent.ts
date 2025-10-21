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

  private async callMcpTool(toolName: string, args: any): Promise<any> {
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

    this.logger.info(`MCP tool ${toolName} result:`, result);
    return result.content;
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

  async executeCustomPrompt(prompt: string): Promise<AnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      this.logger.info('Executing custom prompt');
      
      // Check if the prompt is asking to analyze an address (risk, info, txs, tokens)
      if (prompt.toLowerCase().includes('analyze') && prompt.match(/0x[a-fA-F0-9]{40}/)) {
        const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
          const address = addressMatch[0];
          const chainIdMatch = prompt.match(/chain_id\s*\"(\d+)\"/i);
          const chainIdStr = chainIdMatch ? chainIdMatch[1] : '1';
          this.logger.info(`Detected address analysis request for: ${address} on chain ${chainIdStr}`);

          let addressInfo: any = null;
          let addressTags: any = null;
          let tokens: any = null;
          let txs: any = null;
          try {
            addressInfo = await this.callMcpTool('get_address_info', { address, chain_id: chainIdStr });
          } catch (e) {
            this.logger.warn('get_address_info failed', e);
          }
          try {
            addressTags = await this.callMcpTool('get_address_tags', { address, chain_id: chainIdStr });
          } catch (e) {
            this.logger.warn('get_address_tags failed', e);
          }
          try {
            tokens = await this.callMcpTool('get_tokens_by_address', { address, chain_id: chainIdStr, page_size: 200 });
          } catch (e) {
            this.logger.warn('get_tokens_by_address failed', e);
          }
          try {
            txs = await this.callMcpTool('get_transactions_by_address', { address, chain_id: chainIdStr, page_size: 200, order: 'asc' });
          } catch (e) {
            this.logger.warn('get_transactions_by_address failed', e);
          }

          // Simple risk scoring
          let riskScore = 0;
          const reasons: string[] = [];
          const aiTags = [
            ...(addressInfo?.public_tags || []),
            ...(addressInfo?.private_tags || []),
            ...(addressTags?.public_tags || []),
            ...(addressTags?.private_tags || [])
          ].map((t: any) => (typeof t === 'string' ? t : (t?.name || ''))).join(' ').toLowerCase();

          if (addressInfo?.is_scam) { riskScore += 5; reasons.push('Flagged as scam by explorer'); }
          if (addressInfo?.reputation && addressInfo.reputation !== 'ok') { riskScore += 3; reasons.push(`Reputation: ${addressInfo.reputation}`); }
          if (/sanction|ofac|exploiter|exploit|hack|ronin|bridge.*exploit/i.test(aiTags)) { riskScore = 10; reasons.push('Sanctioned / Exploiter tags detected'); }

          // Balance threshold
          const balanceWei = BigInt(addressInfo?.coin_balance ?? '0');
          const oneHundredEthWei = BigInt('100000000000000000000');
          if (balanceWei > oneHundredEthWei) { riskScore += 1; reasons.push('High native balance'); }

          // Activity threshold
          const txCount = (txs?.items?.length) ?? 0;
          if (txCount > 500) { riskScore += 1; reasons.push('High transaction activity'); }

          if (riskScore > 10) riskScore = 10;

          const analysisPrompt = `
Address risk assessment request\n\nAddress: ${address}\nChainId: ${chainIdStr}\n\nAddress Info: ${JSON.stringify(addressInfo || {}, null, 2)}\n\nAddress Tags: ${JSON.stringify(addressTags || {}, null, 2)}\n\nToken Holdings (truncated): ${JSON.stringify(tokens || {}, null, 2)}\n\nTransactions (first page asc, truncated): ${JSON.stringify(txs || {}, null, 2)}\n\nBased on the data above, compute a risk score from 0 (safe) to 10 (dangerous).\nExplain the rationale with concrete evidence (tags, balances, counterparties, tx hashes, dates).\nHighlight any sanctions/exploiter indications and known hack involvement.\nProvide clear recommendations (avoid, monitor, freeze, report, etc.).\nCurrent heuristic pre-score: ${riskScore} with reasons: ${reasons.join('; ') || 'none'}.\nAdjust if the detailed evidence supports a higher score.`;

          const messages = [
            new SystemMessage('You are a blockchain risk analyst. Be precise and cite concrete evidence.'),
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
