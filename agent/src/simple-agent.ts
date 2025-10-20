import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';
import { HttpMCPClient } from './http-mcp-client.js';
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
  private mcpClient: HttpMCPClient | null = null;
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

      // Initialize HTTP MCP client
      const blockscoutConfig = this.mcpConfig.mcpServers.blockscout;
      this.mcpClient = new HttpMCPClient(
        blockscoutConfig.httpUrl,
        blockscoutConfig.timeout || 30000
      );

      await this.mcpClient.connect();
      this.logger.info('Connected to Blockscout MCP server via HTTP');

      // Load available tools
      const toolsResponse = await this.mcpClient.listTools();
      this.availableTools = toolsResponse.tools || [];
      this.logger.info(`Loaded ${this.availableTools.length} MCP tools`);

      // Log available tools for debugging
      this.availableTools.forEach((tool: any) => {
        this.logger.info(`Available tool: ${tool.name} - ${tool.description || 'No description'}`);
      });

      this.isInitialized = true;
      this.logger.info('Simple Blockscout Agent initialized successfully');
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
          transactionData = await this.callMcpTool('get_transaction', { txHash, chainId });
        } catch (error) {
          this.logger.warn('Failed to get transaction data from MCP, using AI analysis only');
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
          walletData = await this.callMcpTool('get_address_info', { address, chainId });
        } catch (error) {
          this.logger.warn('Failed to get wallet data from MCP, using AI analysis only');
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
          const result = await this.mcpClient.callTool('get_contract_abi', { address, chainId });
          contractData = result.content;
        } catch (error) {
          this.logger.warn('Failed to get contract data from MCP, using AI analysis only');
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
              mcpData = await this.callMcpTool('get_address_info', { 
                address: address,
                chain_id: 11155111 // Sepolia by default
              });
              this.logger.info('Got address data from MCP server');
            } catch (mcpError) {
              this.logger.warn('MCP tool failed, falling back to direct API:', mcpError);
            }
          }

          // Fallback to direct API calls if MCP fails
          if (!mcpData) {
            this.logger.info('Using direct Blockscout API calls...');
            const chains = [
              { id: 1, name: 'Ethereum Mainnet', url: 'https://eth.blockscout.com' },
              { id: 11155111, name: 'Sepolia Testnet', url: 'https://eth-sepolia.blockscout.com' },
              { id: 10, name: 'Optimism', url: 'https://optimism.blockscout.com' },
              { id: 42161, name: 'Arbitrum One', url: 'https://arbitrum.blockscout.com' },
              { id: 137, name: 'Polygon', url: 'https://polygon.blockscout.com' },
              { id: 56, name: 'BSC', url: 'https://bsc.blockscout.com' }
            ];

            let allChainData: { [key: string]: any } = {};
            let foundOnChains: string[] = [];

            // Check address on all chains
            for (const chain of chains) {
              try {
                this.logger.info(`Checking address on ${chain.name}...`);
                const response = await fetch(`${chain.url}/api/v2/addresses/${address}`);
                if (response.ok) {
                  const data = await response.json();
                  allChainData[chain.name] = data;
                  foundOnChains.push(chain.name);
                  this.logger.info(`Found address on ${chain.name}`);
                }
              } catch (apiError) {
                this.logger.warn(`Failed to get data from ${chain.name}:`, apiError);
              }
            }

            mcpData = {
              multiChainData: allChainData,
              foundOnChains: foundOnChains
            };
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
              mcpData = await this.callMcpTool('transaction_summary', { 
                hash: txHash,
                chain_id: 11155111 // Sepolia by default
              });
              this.logger.info('Got transaction summary from MCP server');
            } catch (mcpError) {
              this.logger.warn('MCP transaction_summary tool failed, trying get_transaction_info:', mcpError);
              try {
                mcpData = await this.callMcpTool('get_transaction_info', { 
                  hash: txHash,
                  chain_id: 11155111
                });
                this.logger.info('Got transaction info from MCP server');
              } catch (mcpError2) {
                this.logger.warn('MCP get_transaction_info also failed, falling back to direct API:', mcpError2);
              }
            }
          }

          // Fallback to direct API calls if MCP fails
          if (!mcpData) {
            this.logger.info('Using direct Blockscout API calls...');
            try {
              const response = await fetch(`https://eth-sepolia.blockscout.com/api/v2/transactions/${txHash}`);
              if (response.ok) {
                mcpData = await response.json();
                this.logger.info('Got transaction data from direct API');
              }
            } catch (apiError) {
              this.logger.warn('Failed to get transaction data:', apiError);
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
              mcpData = await this.callMcpTool('get_transaction_info', { 
                hash: txHash,
                chain_id: 11155111 // Sepolia by default
              });
              this.logger.info('Got transaction data from MCP server');
            } catch (mcpError) {
              this.logger.warn('MCP tool failed, falling back to direct API:', mcpError);
            }
          }

          // Fallback to direct API calls if MCP fails
          if (!mcpData) {
            this.logger.info('Using direct Blockscout API calls...');
            try {
              const response = await fetch(`https://eth-sepolia.blockscout.com/api/v2/transactions/${txHash}`);
              if (response.ok) {
                mcpData = await response.json();
                this.logger.info('Got transaction data from direct API');
              }
            } catch (apiError) {
              this.logger.warn('Failed to get transaction data:', apiError);
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
              mcpData = await this.callMcpTool('get_transactions_by_address', { 
                address: address,
                chain_id: 11155111 // Sepolia by default
              });
              this.logger.info('Got transaction history from MCP server');
            } catch (mcpError) {
              this.logger.warn('MCP tool failed, falling back to direct API:', mcpError);
            }
          }

          // Fallback to direct API calls if MCP fails
          if (!mcpData) {
            this.logger.info('Using direct Blockscout API calls...');
            try {
              const response = await fetch(`https://eth-sepolia.blockscout.com/api/v2/addresses/${address}/transactions`);
              if (response.ok) {
                mcpData = await response.json();
                this.logger.info('Got transaction history from direct API');
              }
            } catch (apiError) {
              this.logger.warn('Failed to get transaction history:', apiError);
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
