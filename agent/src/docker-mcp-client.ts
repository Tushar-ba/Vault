// Real MCP client using Docker proxy with stdio transport
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Logger } from './utils/logger.js';

export class DockerMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private logger: Logger;
  private isConnected: boolean = false;
  private availableTools: any[] = [];

  constructor(private mcpConfig: any) {
    this.logger = new Logger('DockerMCPClient');
  }

  async connect(): Promise<void> {
    try {
      this.logger.info('Starting Docker MCP proxy via SDK transport...');

      // Create stdio transport - SDK will spawn the Docker process
      const blockscoutConfig = this.mcpConfig.mcpServers.blockscout;
      this.transport = new StdioClientTransport({
        command: blockscoutConfig.command,
        args: blockscoutConfig.args
      });

      // Create MCP client
      this.client = new Client({
        name: 'blockscout-chatbot',
        version: '1.0.0'
      });

      // Connect to MCP server via Docker proxy
      await this.client.connect(this.transport);
      this.logger.info('Connected to real MCP server via Docker proxy');

      // List available tools from the MCP server
      const toolsResponse = await this.client.listTools();
      this.availableTools = toolsResponse.tools || [];
      this.logger.info(`Loaded ${this.availableTools.length} real MCP tools from server`);

      // Log available tools
      this.availableTools.forEach((tool: any) => {
        this.logger.info(`Real MCP tool: ${tool.name} - ${tool.description || 'No description'}`);
      });

      this.isConnected = true;
      this.logger.info('Docker MCP client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to connect to MCP server via Docker:', error);
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
      if (this.transport) await this.transport.close();
      this.isConnected = false;
      this.logger.info('Disconnected from Docker MCP server');
    } catch (error) {
      this.logger.error('Error disconnecting from Docker MCP server:', error);
    }
  }
}
