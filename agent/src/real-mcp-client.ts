// Real MCP client using actual MCP protocol
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Logger } from './utils/logger.js';

// Polyfill EventSource for Node.js
import { EventSource } from 'eventsource';

// Make EventSource available globally
if (typeof globalThis.EventSource === 'undefined') {
  globalThis.EventSource = EventSource as any;
}

export class RealMCPClient {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private logger: Logger;
  private isConnected: boolean = false;
  private availableTools: any[] = [];

  constructor(private mcpUrl: string) {
    this.logger = new Logger('RealMCPClient');
  }

  async connect(): Promise<void> {
    try {
      this.logger.info(`Connecting to real MCP server at ${this.mcpUrl}`);
      
      // Create SSE transport
      this.transport = new SSEClientTransport(new URL(this.mcpUrl));

      // Create MCP client
      this.client = new Client({
        name: 'blockscout-chatbot',
        version: '1.0.0'
      });

      // Connect to MCP server
      await this.client.connect(this.transport);
      this.logger.info('Connected to real MCP server via SSE');

      // List available tools from the MCP server
      const toolsResponse = await this.client.listTools();
      this.availableTools = toolsResponse.tools || [];
      this.logger.info(`Loaded ${this.availableTools.length} real MCP tools from server`);

      // Log available tools
      this.availableTools.forEach((tool: any) => {
        this.logger.info(`Real MCP tool: ${tool.name} - ${tool.description || 'No description'}`);
      });

      this.isConnected = true;
      this.logger.info('Real MCP client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to connect to real MCP server:', error);
      throw error;
    }
  }

  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP client not connected');
    }

    this.logger.info(`Calling real MCP tool: ${toolName} with args:`, args);

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args
      });

      this.logger.info(`Real MCP tool ${toolName} result:`, result);
      return result.content;
    } catch (error) {
      this.logger.error(`Real MCP tool ${toolName} failed:`, error);
      throw error;
    }
  }

  async listTools(): Promise<{ tools: any[] }> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP client not connected');
    }

    const toolsResponse = await this.client.listTools();
    return { tools: toolsResponse.tools || [] };
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
      }
      if (this.transport) {
        await this.transport.close();
      }
      this.isConnected = false;
      this.logger.info('Disconnected from real MCP server');
    } catch (error) {
      this.logger.error('Error disconnecting from real MCP server:', error);
    }
  }
}
