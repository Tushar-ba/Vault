# Simple Blockscout AI Agent

A clean, simple AI agent that uses Blockscout's MCP server with Gemini Flash 2.5 to analyze blockchain data.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Gemini API key
   ```

3. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

## 📡 API Endpoints

- `GET /health` - Health check
- `POST /api/analyze/transaction` - Analyze transaction
- `POST /api/analyze/wallet` - Analyze wallet
- `POST /api/analyze/custom` - Custom prompt

## 🔧 Configuration

The agent uses `mcp-config.json` to connect to Blockscout MCP server. Choose one:

**Docker proxy:**
```json
{
  "mcpServers": {
    "blockscout": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "sparfenyuk/mcp-proxy:latest", "--transport", "streamablehttp", "https://mcp.blockscout.com/mcp"]
    }
  }
}
```

**Direct HTTP:**
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

## 🎯 Features

- ✅ Gemini Flash 2.5 LLM
- ✅ Blockscout MCP integration
- ✅ Simple REST API
- ✅ No database/cache complexity
- ✅ Clean, minimal codebase

## 📝 Example Usage

```bash
# Analyze a transaction
curl -X POST http://localhost:3000/api/analyze/transaction \
  -H "Content-Type: application/json" \
  -d '{"txHash": "0x123...", "chainId": 1}'

# Analyze a wallet
curl -X POST http://localhost:3000/api/analyze/wallet \
  -H "Content-Type: application/json" \
  -d '{"address": "0x456...", "chainId": 1}'

# Custom prompt
curl -X POST http://localhost:3000/api/analyze/custom \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is MEV?"}'
```

That's it! Simple, clean, and focused on blockchain analysis.