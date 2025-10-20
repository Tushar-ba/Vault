# 🚀 Quick Start Guide - Blockscout MCP Agent

## ✅ Installation Complete!

Your Blockscout MCP Agent has been successfully set up and built. Here's how to get started:

## 📋 Prerequisites Checklist

Before running the agent, make sure you have:

- ✅ Node.js 18+ installed
- ✅ npm installed
- ⚠️ API Key (OpenAI or Anthropic) - **REQUIRED**
- ⚠️ Telegram Bot Token (optional, for Telegram interface)

## 🔧 Configuration

1. **Copy the environment template:**
   ```bash
   copy .env.example .env
   ```

2. **Edit `.env` file and add your API keys:**
   ```env
   # Choose ONE of these:
   OPENAI_API_KEY=sk-your-openai-key-here
   # OR
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
   USE_ANTHROPIC=false

   # Optional: For Telegram bot
   TELEGRAM_BOT_TOKEN=your-telegram-token-here
   ```

## 🎯 Running the Agent

### Option 1: Run Everything Together
```bash
npm start
```
This starts both the API server (port 3000) and Dashboard (port 3001).

### Option 2: Run Individual Services

**Dashboard Only:**
```bash
npm run dashboard
```
Then open your browser to: `http://localhost:3001`

**Telegram Bot Only:**
```bash
npm run telegram-bot
```

**API Server Only:**
```bash
node dist/index.js
```

## 🌐 Using the Dashboard

1. Open `http://localhost:3001` in your browser
2. You'll see a modern dark-themed dashboard with:
   - Transaction Analyzer
   - Wallet Analyzer
   - Contract Analyzer
   - Whale Tracker

3. Enter an Ethereum address or transaction hash and click analyze!

## 🤖 Using the Telegram Bot

1. Get your bot token from [@BotFather](https://t.me/botfather)
2. Add it to `.env`
3. Run: `npm run telegram-bot`
4. Open your bot on Telegram and type `/start`

### Available Commands:
- `/tx <hash>` - Analyze transaction
- `/wallet <address>` - Analyze wallet
- `/contract <address>` - Analyze contract
- `/forensic <address>` - Deep forensic analysis
- `/mev <address>` - MEV bot detection
- `/multichain <address>` - Cross-chain analysis

## 🔌 Using the API

### Transaction Analysis
```bash
curl -X POST http://localhost:3000/api/analyze/transaction \
  -H "Content-Type: application/json" \
  -d '{"txHash": "0x123...", "chainId": 1}'
```

### Wallet Analysis
```bash
curl -X POST http://localhost:3000/api/analyze/wallet \
  -H "Content-Type: application/json" \
  -d '{"address": "0xabc...", "chainId": 1}'
```

### Contract Analysis
```bash
curl -X POST http://localhost:3000/api/analyze/contract \
  -H "Content-Type: application/json" \
  -d '{"address": "0xdef...", "chainId": 1}'
```

## 📝 Example Addresses for Testing

### Ethereum Mainnet:
- **Uniswap Router**: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`
- **USDC Token**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **Vitalik's Address**: `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

### Example Transaction:
- Recent ETH Transfer: Use any recent transaction hash from [Etherscan](https://etherscan.io/)

## 🎨 Features Available

### Core Analysis:
- ✅ Transaction forensic analysis
- ✅ Wallet behavior profiling
- ✅ Smart contract auditing
- ✅ Cross-chain activity tracking
- ✅ MEV bot detection

### Advanced Features:
- ✅ Whale movement tracking
- ✅ Market manipulation detection
- ✅ DeFi yield optimization
- ✅ Risk scoring
- ✅ Portfolio analysis

## 🐛 Troubleshooting

### "No valid API key provided"
- Make sure you've added either `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to `.env`
- Restart the application after adding keys

### "Failed to connect to MCP server"
- The agent will fall back to mock mode automatically
- You can still test all features with AI analysis

### Port Already in Use
- Change ports in `.env`:
  ```env
  API_PORT=3001
  DASHBOARD_PORT=3002
  ```

### Module Not Found Errors
- Run: `npm install`
- Then: `npm run build`

## 📚 Next Steps

1. ✅ **Configure your API keys**
2. ✅ **Start the dashboard**: `npm run dashboard`
3. ✅ **Try analyzing an address or transaction**
4. 📖 **Read the full documentation**: See `README.md`
5. 🎯 **Explore examples**: Check `examples/usage-examples.ts`

## 🆘 Need Help?

- 📖 Full documentation: `README.md`
- 🔧 Implementation details: `IMPLEMENTATION_SUMMARY.md`
- 💻 Code examples: `examples/`
- 🧪 Tests: `tests/`

---

**🎉 You're all set! Start analyzing blockchain data with AI.**

Run `npm run dashboard` and open `http://localhost:3001` to get started!

