# Vault Trading Agent

An AI-powered trading agent for the BitYield Protocol vault contract, built with LangChain, Gemini 2.0 Flash, and WebSocket real-time communication.

## 🚀 Features

- **AI-Powered Trading**: Uses Gemini 2.0 Flash for intelligent trade analysis and execution
- **Real-time WebSocket Communication**: Live updates and instant responses
- **Vault Integration**: Direct integration with the vault contract on Sepolia testnet
- **Token Management**: Easy configuration and management of supported tokens
- **Price Monitoring**: Real-time price updates and market analysis
- **MCP Integration**: Leverages existing MCP server for blockchain data

## 📋 Prerequisites

- Node.js 18+ 
- GEMINI_API_KEY environment variable
- Access to Sepolia testnet
- Docker (for MCP server)

## 🛠️ Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   export GEMINI_API_KEY="your_gemini_api_key_here"
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

## 🏃‍♂️ Running the Agent

### Development Mode
```bash
npm run dev:vault
```

### Production Mode
```bash
npm run vault
```

### Testing
```bash
npm run test:vault
```

## 🌐 WebSocket Server

The vault agent runs a WebSocket server on port 3001 by default.

### Endpoints

- **WebSocket**: `ws://localhost:3001`
- **HTTP API**: `http://localhost:3001`
- **Health Check**: `GET /health`
- **Token Management**: `GET/POST/DELETE /api/tokens`
- **Vault Status**: `GET /api/vault/status`
- **Trade Processing**: `POST /api/trade`

### WebSocket Events

#### Client → Server
- `trade_request`: Send trading requests
- `price_request`: Request price updates
- `ping`: Health check

#### Server → Client
- `status`: Connection and system status
- `trade_result`: Trading operation results
- `price_update`: Price data updates
- `trade_broadcast`: Public trade notifications
- `error`: Error messages

## 🪙 Token Configuration

Tokens are managed through the `vault-tokens.json` file:

```json
{
  "tokens": [
    {
      "address": "0x09572cED4772527f28c6Ea8E62B08C973fc47671",
      "name": "Tesla Token",
      "symbol": "TSLA",
      "decimals": 18,
      "isActive": true,
      "description": "Tesla stock token for trading on the vault"
    }
  ],
  "metadata": {
    "vaultAddress": "0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b",
    "chainId": "11155111",
    "chainName": "Sepolia Testnet"
  }
}
```

### Adding New Tokens

1. **Via API**:
   ```bash
   curl -X POST http://localhost:3001/api/tokens \
     -H "Content-Type: application/json" \
     -d '{
       "address": "0x...",
       "name": "Apple Token",
       "symbol": "AAPL",
       "decimals": 18,
       "isActive": true
     }'
   ```

2. **Via Code**:
   ```typescript
   const tokenManager = new VaultTokenManager();
   tokenManager.addToken({
     address: "0x...",
     name: "Apple Token",
     symbol: "AAPL",
     decimals: 18,
     isActive: true
   });
   ```

## 💬 Trading Commands

The agent understands natural language trading requests:

### Price Queries
- "What's the current price of Tesla token?"
- "Get Tesla price"
- "Show me all token prices"

### Buy Orders
- "Buy 5 Tesla tokens"
- "I want to purchase 10 TSLA"
- "Buy Tesla tokens with 25 PYUSD"

### Sell Orders
- "Sell 3 Tesla tokens"
- "Sell half my Tesla holdings"
- "Sell all TSLA tokens"

### Status Requests
- "Get vault status"
- "Show me my holdings"
- "What tokens are available?"

## 🔧 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Vault Agent    │    │   MCP Server    │
│   Client        │◄──►│   (LangChain +   │◄──►│   (Blockscout)  │
│                 │    │   Gemini 2.0)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Vault Contract │
                       │   (Sepolia)      │
                       └──────────────────┘
```

## 📊 Contract Details

- **Vault Address**: `0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b`
- **Chain**: Sepolia Testnet (11155111)
- **PYUSD Decimals**: 6
- **Stock Decimals**: 18

### Available Functions

- `getPrice(tokenAddress)`: Get current token price
- `buyStock(tokenAddress, amount)`: Buy stock tokens
- `sellStock(tokenAddress, amount)`: Sell stock tokens
- `listAndDepositInitialStock(...)`: List new tokens (owner only)

## 🧪 Testing

### Manual Testing
1. Start the server: `npm run dev:vault`
2. Open `http://localhost:3001/vault-client.html`
3. Connect and send trading requests

### Automated Testing
```bash
npm run test:vault
```

### Test Scenarios
- Price queries for all tokens
- Buy/sell operations
- Error handling
- Token management
- WebSocket connectivity

## 🔍 Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Logs
The agent provides detailed logging for:
- WebSocket connections
- Trading operations
- MCP tool calls
- Error conditions

## 🚨 Error Handling

The agent handles various error scenarios:
- Invalid token addresses
- Insufficient balances
- Network connectivity issues
- MCP server failures
- Invalid trading requests

## 🔐 Security

- Input validation for all requests
- Rate limiting on WebSocket connections
- Secure token storage
- Error message sanitization

## 📈 Performance

- Real-time WebSocket updates
- Efficient token caching
- Optimized MCP tool usage
- Minimal latency for trading operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the logs for error details
2. Verify environment variables
3. Ensure MCP server is running
4. Check network connectivity

## 🔄 Updates

To add new tokens or update configuration:
1. Modify `vault-tokens.json`
2. Restart the server
3. Verify token availability via API

---

**Built with ❤️ for ETH India Online**
