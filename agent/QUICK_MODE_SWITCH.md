# 🎯 Quick Mode Switch Guide

## What Changed?

Your Vault AI Agent now has **TWO MODES** with a simple toggle button!

---

## 🤖 Agent Mode (Trading)
**Use for:** Trading tokens on the Vault contract

**Routes to:** AI Agent Server (port 3002) → LLM → Tools → Blockchain

**Example queries:**
```
"What is the current price of Tesla token?"
"Buy 5 Tesla tokens"
"Sell 3 Tesla tokens"
```

---

## 🔍 Query Mode (Blockchain Analysis)
**Use for:** Multi-chain blockchain analysis

**Routes to:** MCP Server (port 3000) → Blockscout API → Multi-chain data

**Example queries:**
```
"Show me activity across all chains for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55"
"Calculate total gas spend across all chains"
"What tokens does this address hold across all chains?"
```

---

## 🚀 How to Use

### 1. Start Both Servers

**Terminal 1 - MCP Server:**
```bash
cd agent
npm run dev
```

**Terminal 2 - AI Agent Server:**
```bash
cd agent
npm run dev:ai
```

### 2. Open Client
```
agent/public/vault-ai-client.html
```

### 3. Toggle Between Modes
- Click **🤖 Agent Mode** (green) for trading
- Click **🔍 Query Mode** (blue) for blockchain analysis

### 4. Use Quick Actions
Each mode has different quick action buttons that change automatically!

---

## 🎨 UI Changes

### Mode Toggle Buttons
```
[🤖 Agent Mode]  [🔍 Query Mode]
```
- Active mode is highlighted
- Mode description updates automatically
- Quick actions change based on mode

### Mode Description
Shows what the current mode does:
- **Agent Mode**: "Trade tokens, get prices, buy/sell with MetaMask"
- **Query Mode**: "Multi-chain blockchain analysis, transaction history, gas calculations"

---

## 🔄 How It Works

### Agent Mode Flow
```
User Input → WebSocket → AI Agent (3002) → LLM → Tools → Response
```

### Query Mode Flow
```
User Input → HTTP POST → MCP Server (3000) → Blockscout → Response
```

---

## ✅ Benefits

1. **No Confusion**: Clear separation between trading and analysis
2. **Optimized Routing**: Each mode uses the right backend
3. **Better UX**: Quick actions tailored to each mode
4. **Dynamic Addresses**: All queries support any Ethereum address
5. **Simple Toggle**: Switch modes with one click

---

## 🧪 Test It!

### Test Agent Mode
1. Click **🤖 Agent Mode**
2. Click "Get Tesla Price"
3. Should see: "Tesla Token (TSLA) Price: $X.XX PYUSD"

### Test Query Mode
1. Click **🔍 Query Mode**
2. Click "Total Gas Spend"
3. Should see: Detailed gas analysis from MCP server

---

## 🎉 Done!

Your agent now intelligently routes requests:
- **Trading queries** → AI Agent with MetaMask
- **Blockchain analysis** → MCP Server with multi-chain support

**No more confusion about which server to use!** 🚀

