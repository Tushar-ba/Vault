import { VaultWebSocketServer } from './dist/vault-websocket-server.js';

async function startServer() {
  console.log('🚀 Starting Vault WebSocket Server...');
  
  try {
    const server = new VaultWebSocketServer();
    const port = parseInt(process.env.PORT || '3001');
    
    console.log(`📡 Port: ${port}`);
    console.log(`🔑 GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Set' : 'Not set'}`);
    
    await server.start(port);
    
    console.log('✅ Server started successfully!');
    console.log(`🌐 WebSocket: ws://localhost:${port}`);
    console.log(`🌐 HTTP API: http://localhost:${port}`);
    console.log(`🌐 Web Client: http://localhost:${port}/vault-client.html`);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

startServer();
