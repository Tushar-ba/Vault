// Debug MCP connection directly
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

async function debugMCP() {
  try {
    console.log('🔍 Testing MCP connection directly...');
    
    const transport = new SSEClientTransport(new URL('https://mcp.blockscout.com/mcp'));
    const client = new Client({
      name: 'debug-mcp-client',
      version: '1.0.0',
    });
    
    console.log('📡 Connecting to MCP server...');
    await client.connect(transport);
    console.log('✅ Connected to MCP server');
    
    console.log('🔧 Listing available tools...');
    const toolsResponse = await client.listTools();
    console.log('📋 Available tools:', JSON.stringify(toolsResponse, null, 2));
    
    if (toolsResponse.tools && toolsResponse.tools.length > 0) {
      console.log('\n🧪 Testing a tool call...');
      const firstTool = toolsResponse.tools[0];
      console.log(`Testing tool: ${firstTool.name}`);
      
      try {
        const result = await client.callTool({
          name: firstTool.name,
          arguments: { address: '0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55', chainId: 11155111 }
        });
        console.log('✅ Tool call result:', JSON.stringify(result, null, 2));
      } catch (toolError) {
        console.log('❌ Tool call failed:', toolError.message);
      }
    }
    
    await client.close();
    console.log('🔌 Disconnected from MCP server');
    
  } catch (error) {
    console.error('❌ MCP connection failed:', error.message);
    console.error('Full error:', error);
  }
}

debugMCP();

