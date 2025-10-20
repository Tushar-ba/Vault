import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { BlockscoutMCPAgent } from '../src/blockscout-mcp-agent.js';
import { EnhancedBlockscoutAgent } from '../src/enhanced-agent.js';
import { config } from '../src/config/index.js';

// Mock the MCP client for testing
jest.mock('@langchain/mcp-adapters', () => ({
  MultiServerMCPClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    listTools: jest.fn().mockResolvedValue([
      {
        name: 'get_address_info',
        description: 'Get address information',
        inputSchema: { type: 'object', properties: { address: { type: 'string' } } }
      },
      {
        name: 'get_transaction',
        description: 'Get transaction information',
        inputSchema: { type: 'object', properties: { txHash: { type: 'string' } } }
      }
    ]),
    callTool: jest.fn().mockResolvedValue({ success: true, data: 'mock data' })
  }))
}));

// Mock the LLM for testing
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn().mockImplementation(() => ({}))
}));

describe('BlockscoutMCPAgent', () => {
  let agent: BlockscoutMCPAgent;

  beforeAll(async () => {
    // Set test environment variables
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.USE_ANTHROPIC = 'false';
  });

  beforeEach(() => {
    agent = new BlockscoutMCPAgent();
  });

  afterAll(async () => {
    if (agent) {
      await agent.disconnect();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    it('should throw error if no API key provided', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new BlockscoutMCPAgent()).toThrow('No valid API key provided for LLM');
    });
  });

  describe('Transaction Analysis', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should analyze transaction successfully', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = await agent.analyzeTransaction(txHash, 1);
      
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.chainId).toBe(1);
    });

    it('should handle invalid transaction hash', async () => {
      const txHash = 'invalid-hash';
      const result = await agent.analyzeTransaction(txHash);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Wallet Analysis', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should analyze wallet successfully', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const result = await agent.analyzeWallet(address, 1);
      
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.chainId).toBe(1);
    });

    it('should handle invalid wallet address', async () => {
      const address = 'invalid-address';
      const result = await agent.analyzeWallet(address);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Contract Analysis', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should analyze contract successfully', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const result = await agent.analyzeContract(address, 1);
      
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.chainId).toBe(1);
    });
  });

  describe('Multi-Chain Analysis', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should perform multi-chain analysis successfully', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const result = await agent.multiChainAnalysis(address);
      
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Custom Prompt Execution', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should execute custom prompt successfully', async () => {
      const prompt = 'What is the current price of ETH?';
      const result = await agent.executeCustomPrompt(prompt);
      
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Streaming Analysis', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should stream analysis successfully', async () => {
      const prompt = 'Analyze the DeFi ecosystem';
      const stream = agent.streamAnalysis(prompt);
      
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});

describe('EnhancedBlockscoutAgent', () => {
  let agent: EnhancedBlockscoutAgent;

  beforeAll(async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.USE_ANTHROPIC = 'false';
  });

  beforeEach(() => {
    agent = new EnhancedBlockscoutAgent();
  });

  afterAll(async () => {
    if (agent) {
      await agent.disconnect();
    }
  });

  describe('Whale Tracking', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should track whale movements', async () => {
      const tokenAddress = '0xA0b86a33E6441c8C06DDD4C4c4c4c4c4c4c4c4c4c';
      const thresholdUSD = 1000000;
      
      const movements = await agent.trackWhaleMovements(tokenAddress, thresholdUSD);
      
      expect(Array.isArray(movements)).toBe(true);
    });
  });

  describe('Vulnerability Scanning', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should scan for vulnerabilities', async () => {
      const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
      
      const vulnerabilities = await agent.scanForVulnerabilities(contractAddress);
      
      expect(Array.isArray(vulnerabilities)).toBe(true);
    });
  });

  describe('Yield Optimization', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should optimize yield', async () => {
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      
      const opportunities = await agent.optimizeYield(walletAddress);
      
      expect(Array.isArray(opportunities)).toBe(true);
    });
  });

  describe('Market Manipulation Detection', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should detect market manipulation', async () => {
      const tokenAddress = '0x1234567890abcdef1234567890abcdef12345678';
      
      const patterns = await agent.detectMarketManipulation(tokenAddress);
      
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('Risk Score Calculation', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should calculate risk score', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      
      const riskScore = await agent.getRiskScore(address);
      
      expect(typeof riskScore).toBe('number');
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Portfolio Analysis', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should analyze portfolio', async () => {
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      
      const result = await agent.getPortfolioAnalysis(walletAddress);
      
      expect(result).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should clear cache', async () => {
      await expect(agent.clearCache()).resolves.not.toThrow();
    });

    it('should get cache stats', () => {
      const stats = agent.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.whale).toBeDefined();
      expect(stats.vulnerability).toBeDefined();
      expect(stats.yield).toBeDefined();
      expect(stats.manipulation).toBeDefined();
    });
  });

  describe('Alert Subscriptions', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should subscribe to alerts', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const callback = jest.fn();
      
      await expect(agent.subscribeToAlerts(address, callback)).resolves.not.toThrow();
    });

    it('should unsubscribe from alerts', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const callback = jest.fn();
      
      await expect(agent.unsubscribeFromAlerts(address, callback)).resolves.not.toThrow();
    });
  });
});

describe('Configuration', () => {
  it('should validate configuration', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.USE_ANTHROPIC = 'false';
    
    expect(() => {
      const { validateConfig } = require('../src/config/index.js');
      validateConfig();
    }).not.toThrow();
  });

  it('should throw error for missing API keys', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    
    expect(() => {
      const { validateConfig } = require('../src/config/index.js');
      validateConfig();
    }).toThrow();
  });
});

