// Test setup file
import { jest } from '@jest/globals';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.USE_ANTHROPIC = 'false';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';
process.env.BLOCKSCOUT_MCP_URL = 'https://mcp.blockscout.com/mcp';
process.env.USE_LOCAL_MCP = 'false';
process.env.API_PORT = '3000';
process.env.DASHBOARD_PORT = '3001';
process.env.LOG_LEVEL = 'error';

// Mock timers
jest.useFakeTimers();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test timeout
jest.setTimeout(30000);

