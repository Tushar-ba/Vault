// Hybrid MCP client - tries real MCP first, falls back to REST APIs
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Logger } from './utils/logger.js';
import { HttpMCPClient } from './http-mcp-client.js';

// Polyfill EventSource for Node.js
import { EventSource } from 'eventsource';

// Make EventSource available globally
if (typeof globalThis.EventSource === 'undefined') {
  globalThis.EventSource = EventSource as any;
}

export class HybridMCPClient {
  private realClient: Client | null = null;
  private realTransport: SSEClientTransport | null = null;
  private fallbackClient: HttpMCPClient | null = null;
  private logger: Logger;
  private isConnected: boolean = false;
  private availableTools: any[] = [];
  private usingRealMCP: boolean = false;

  constructor(private mcpUrl: string, private fallbackTimeout: number = 10000) {
    this.logger = new Logger('HybridMCPClient');
  }

  async connect(): Promise<void> {
    try {
      this.logger.info(`Attempting to connect to real MCP server at ${this.mcpUrl}`);
      
      // Try real MCP first with timeout
      const mcpPromise = this.connectRealMCP();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MCP connection timeout')), this.fallbackTimeout)
      );

      try {
        await Promise.race([mcpPromise, timeoutPromise]);
        this.usingRealMCP = true;
        this.logger.info('Successfully connected to real MCP server');
        return;
      } catch (error) {
        this.logger.warn('Real MCP connection failed, falling back to REST APIs:', error);
        await this.connectFallback();
      }
    } catch (error) {
      this.logger.error('Failed to connect to any MCP service:', error);
      throw error;
    }
  }

  private async connectRealMCP(): Promise<void> {
    // Create SSE transport
    this.realTransport = new SSEClientTransport(new URL(this.mcpUrl));

    // Create MCP client
    this.realClient = new Client({
      name: 'blockscout-chatbot',
      version: '1.0.0'
    });

    // Connect to MCP server
    await this.realClient.connect(this.realTransport);
    this.logger.info('Connected to real MCP server via SSE');

    // List available tools from the MCP server
    const toolsResponse = await this.realClient.listTools();
    this.availableTools = toolsResponse.tools || [];
    this.logger.info(`Loaded ${this.availableTools.length} real MCP tools from server`);

    // Log available tools
    this.availableTools.forEach((tool: any) => {
      this.logger.info(`Real MCP tool: ${tool.name} - ${tool.description || 'No description'}`);
    });

    this.isConnected = true;
  }

  private async connectFallback(): Promise<void> {
    this.logger.info('Initializing fallback REST API client');
    
    // Initialize fallback HTTP client
    this.fallbackClient = new HttpMCPClient(this.mcpUrl, 30000);
    await this.fallbackClient.connect();
    
    // Get tools from fallback client
    const toolsResponse = await this.fallbackClient.listTools();
    this.availableTools = toolsResponse.tools || [];
    this.logger.info(`Loaded ${this.availableTools.length} fallback tools`);

    // Log available tools
    this.availableTools.forEach((tool: any) => {
      this.logger.info(`Fallback tool: ${tool.name} - ${tool.description || 'No description'}`);
    });

    this.isConnected = true;
    this.usingRealMCP = false;
  }

  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.isConnected) {
      throw new Error('MCP client not connected');
    }

    if (this.usingRealMCP && this.realClient) {
      this.logger.info(`Calling real MCP tool: ${toolName} with args:`, args);
      try {
        const result = await this.realClient.callTool({
          name: toolName,
          arguments: args
        });
        this.logger.info(`Real MCP tool ${toolName} result:`, result);
        return result.content;
      } catch (error) {
        this.logger.warn(`Real MCP tool ${toolName} failed, falling back to REST API:`, error);
        // Fall back to REST API
        if (this.fallbackClient) {
          return await this.fallbackClient.callTool(toolName, args);
        }
        throw error;
      }
    } else if (this.fallbackClient) {
      this.logger.info(`Calling fallback tool: ${toolName} with args:`, args);
      const result = await this.fallbackClient.callTool(toolName, args);
      this.logger.info(`Fallback tool ${toolName} result:`, result);
      return result;
    } else {
      throw new Error('No MCP client available');
    }
  }

  async listTools(): Promise<{ tools: any[] }> {
    if (!this.isConnected) {
      throw new Error('MCP client not connected');
    }

    if (this.usingRealMCP && this.realClient) {
      const toolsResponse = await this.realClient.listTools();
      return { tools: toolsResponse.tools || [] };
    } else if (this.fallbackClient) {
      return await this.fallbackClient.listTools();
    } else {
      throw new Error('No MCP client available');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.realClient) {
        await this.realClient.close();
      }
      if (this.realTransport) {
        await this.realTransport.close();
      }
      if (this.fallbackClient) {
        await this.fallbackClient.disconnect();
      }
      this.isConnected = false;
      this.logger.info('Disconnected from MCP services');
    } catch (error) {
      this.logger.error('Error disconnecting from MCP services:', error);
    }
  }

  getConnectionType(): string {
    return this.usingRealMCP ? 'Real MCP' : 'REST API Fallback';
  }
}
