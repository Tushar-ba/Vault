# 🚀 Simple Blockscout MCP Agent

A simple AI-powered blockchain intelligence agent using Blockscout's MCP server with Google Gemini.

## ✨ Features

- **Simple REST API** - Clean, minimal API endpoints
- **Gemini AI** - Powered by Google's Gemini 1.5 Pro
- **Blockscout MCP** - Direct integration with Blockscout's MCP server
- **No Database** - Stateless, simple architecture
- **Real-time Analysis** - Live blockchain data analysis

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
copy .env.example .env
```

Edit `.env` and add your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Build and Run
```bash
# Build the project
npm run build

# Start the server
npm start

# Or run in development mode
npm run dev
```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### Health Check
```bash
GET /health
```

### Transaction Analysis
```bash
POST /api/analyze/transaction
Content-Type: application/json

{
  "txHash": "0x123...",
  "chainId": 1
}
```

### Wallet Analysis
```bash
POST /api/analyze/wallet
Content-Type: application/json

{
  "address": "0xabc...",
  "chainId": 1
}
```

### Contract Analysis
```bash
POST /api/analyze/contract
Content-Type: application/json

{
  "address": "0xdef...",
  "chainId": 1
}
```

### Custom Analysis
```bash
POST /api/analyze/custom
Content-Type: application/json

{
  "prompt": "Analyze the DeFi ecosystem"
}
```

### API Documentation
```bash
GET /api
```

## 🔧 Configuration

The agent uses the following MCP server configuration:

```json
{
  "mcpServers": {
    "blockscout": {
      "httpUrl": "https://mcp.blockscout.com/mcp",
      "timeout": 180000
    }
  }
}
```

## 📝 Example Usage

### Analyze a Transaction
```bash
curl -X POST http://localhost:3000/api/analyze/transaction \
  -H "Content-Type: application/json" \
  -d '{"txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", "chainId": 1}'
```

### Analyze a Wallet
```bash
curl -X POST http://localhost:3000/api/analyze/wallet \
  -H "Content-Type: application/json" \
  -d '{"address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chainId": 1}'
```

### Custom Analysis
```bash
curl -X POST http://localhost:3000/api/analyze/custom \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the current state of the Ethereum network?"}'
```

## 🎯 Supported Chains

- Ethereum (Chain ID: 1)
- Polygon (Chain ID: 137)
- BSC (Chain ID: 56)
- Arbitrum (Chain ID: 42161)
- Optimism (Chain ID: 10)
- Avalanche (Chain ID: 43114)

## 📊 Response Format

All analysis endpoints return:

```json
{
  "success": true,
  "data": {
    "content": "AI analysis result...",
    "additional_kwargs": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "chainId": 1
}
```

## 🛠️ Development

### Project Structure
```
src/
├── simple-agent.ts      # Main agent with MCP integration
├── simple-server.ts     # Express REST API server
├── config/              # Configuration management
├── prompts/             # Analysis prompt templates
└── utils/               # Utilities and logger
```

### Available Scripts
- `npm run build` - Build TypeScript
- `npm run dev` - Development mode with watch
- `npm start` - Start production server
- `npm run simple` - Run simple server directly
- `npm test` - Run tests

## 🔒 Security

- Rate limiting (100 requests/minute)
- Input validation
- CORS enabled
- Helmet security headers
- Request size limits

## 🐛 Troubleshooting

### "GEMINI_API_KEY is required"
- Make sure you've added your Gemini API key to `.env`
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### "Failed to connect to MCP server"
- The agent will continue with AI-only analysis
- Check your internet connection
- Verify the MCP server is accessible

### Port already in use
- Change the port in `.env`:
  ```env
  API_PORT=3001
  ```

## 📄 License

MIT License - see LICENSE file for details.

---

**🎉 Ready to analyze blockchain data with AI!**

Start the server with `npm start` and visit `http://localhost:3000/api` for documentation.

