# ⚡ Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ Docker Desktop running
- ✅ Gemini API key ready

---

## Step 1: Install Dependencies (1 minute)

```bash
cd agent
npm install
```

---

## Step 2: Configure Environment (30 seconds)

Create `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
API_PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

Get Gemini API key: https://makersuite.google.com/app/apikey

---

## Step 3: Start Servers (30 seconds)

### Terminal 1: MCP Blockchain Intelligence Server
```bash
npm run dev
```
✅ Server running on http://localhost:3000

### Terminal 2: Vault AI Trading Agent
```bash
npm run dev:ai
```
✅ Server running on http://localhost:3002

---

## Step 4: Test It! (1 minute)

### Test MCP Server
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze contract 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b",
    "chainId": "11155111"
  }'
```

### Test Vault AI Agent

**Option 1: Open Browser**
```
http://localhost:3002/vault-ai-client.html
```

**Option 2: Use curl**
```bash
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the current price of Tesla token?"}'
```

---

## 🎯 Common Commands

```bash
# MCP Server (Blockchain Analysis)
npm run dev          # Development mode
npm start            # Production mode

# Vault AI Agent (DeFi Trading)
npm run dev:ai       # Development mode
npm start:ai         # Production mode

# Build & Utilities
npm run build        # Compile TypeScript
npm run lint         # Check code quality
npm run lint:fix     # Fix linting issues
```

---

## 💡 Quick Examples

### MCP Server Queries
```bash
# Contract analysis
"Analyze contract 0x..."

# Transaction history
"Show last 10 transactions for 0x..."

# Token holdings
"What tokens does 0x... hold?"

# Cross-chain analysis
"Show activity across all chains for 0x..."
```

### Vault AI Agent Queries
```bash
# Price queries
"What's the current price of Tesla token?"
"Get Google price"

# Buy/Sell
"Buy 5 Tesla tokens"
"Sell 3 Microsoft tokens"

# Calculations
"How much will it cost to buy 10 Google tokens?"
"How much will I get for selling 5 TSLA?"
```

---

## 🐛 Troubleshooting

### MCP Server not starting?
```bash
# Check Docker is running
docker ps

# Restart Docker and try again
npm run dev
```

### Vault AI Agent errors?
```bash
# Check Gemini API key
echo $GEMINI_API_KEY

# Check .env file exists
cat .env
```

### Port already in use?
```bash
# Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📚 Need More Info?

📖 **Full Documentation**: See `README.md`
📋 **Cleanup Details**: See `CLEANUP_SUMMARY.md`
🔧 **Configuration**: See `.env.example`

---

## ✨ You're Ready!

Both servers are running and ready to:
- 🔍 Analyze blockchain data across multiple chains
- 💰 Trade tokens on the Vault contract
- 🤖 Use AI to understand blockchain activity
- 📊 Get intelligent insights from on-chain data

**Have fun exploring! 🚀**
