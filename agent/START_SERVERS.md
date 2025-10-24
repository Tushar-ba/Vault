# 🚀 How to Start All Servers

## 📋 **Overview**

You need **TWO servers** running simultaneously:

1. **MCP Blockchain Analysis Server** (Port 3000) - For contract analysis and transaction history
2. **Vault AI Agent Server** (Port 3002) - For LLM + tool calling + trading

## 🎯 **Quick Start (Recommended)**

### **Option 1: Two Separate Terminals**

#### **Terminal 1: MCP Server**
```bash
cd D:\ethIndiaOnline\agent
npm run dev
```
✅ This starts the MCP server on **port 3000**

#### **Terminal 2: AI Agent Server**
```bash
cd D:\ethIndiaOnline\agent
npm run dev:ai
```
✅ This starts the AI agent on **port 3002**

### **Option 2: PowerShell (Windows)**

Run this in PowerShell to start both servers:

```powershell
# Start MCP Server in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\ethIndiaOnline\agent; npm run dev"

# Wait a moment for MCP server to start
Start-Sleep -Seconds 3

# Start AI Agent Server in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\ethIndiaOnline\agent; npm run dev:ai"
```

## 🌐 **Open the Client**

After both servers are running, open your browser:
```
http://localhost:3002/vault-ai-client.html
```

## ✅ **Verify Servers are Running**

### **Check MCP Server (Port 3000)**
```bash
curl http://localhost:3000/health
```
Expected response:
```json
{
  "status": "healthy",
  "agentReady": true,
  "timestamp": "2025-10-24T..."
}
```

### **Check AI Agent Server (Port 3002)**
```bash
curl http://localhost:3002/health
```
Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-24T...",
  "connectedClients": 0,
  "type": "vault-ai-server",
  "features": {
    "llm": true,
    "toolCalling": true,
    "blockchain": true,
    "mcpIntegration": true,
    "realTimeUpdates": true
  }
}
```

## 🔧 **What Each Server Does**

### **MCP Server (Port 3000)**
- **Purpose**: Blockchain analysis using Docker MCP + Blockscout
- **Features**:
  - Multi-chain contract analysis
  - Transaction history
  - Security assessment
  - Token analysis
  - Gas calculations
- **Endpoint**: `http://localhost:3000/chat`
- **Used by**: `analyze_contract` and `get_address_transactions` tools

### **AI Agent Server (Port 3002)**
- **Purpose**: LLM-powered trading agent with tool calling
- **Features**:
  - Natural language understanding (Gemini 2.0 Flash)
  - 8 specialized tools
  - Real-time price queries
  - Transaction preparation
  - MetaMask integration
- **Endpoint**: `http://localhost:3002` (WebSocket + HTTP)
- **Client**: `vault-ai-client.html`

## 📊 **Architecture Flow**

```
Browser (vault-ai-client.html)
    ↓ WebSocket
AI Agent Server (Port 3002)
    ├─→ Vault Contract (Direct RPC)
    │   ├─ get_token_price
    │   ├─ calculate_buy_cost
    │   ├─ prepare_buy_transaction
    │   └─ prepare_sell_transaction
    │
    └─→ MCP Server (Port 3000)
        ├─ analyze_contract
        └─ get_address_transactions
            ↓
        Docker MCP + Blockscout
```

## 🎯 **Testing the Setup**

### **1. Test Price Query (No MCP needed)**
```
User: "What is the current price of Tesla token?"
Expected: Direct RPC call to vault contract
```

### **2. Test Buy Transaction (No MCP needed)**
```
User: "Buy 5 Tesla tokens"
Expected: Transaction preparation with MetaMask button
```

### **3. Test Contract Analysis (Needs MCP)**
```
User: "Analyze the vault contract at 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b"
Expected: Comprehensive analysis from MCP server
```

### **4. Test Transaction History (Needs MCP)**
```
User: "Get last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55"
Expected: Transaction list from MCP server
```

## 🐛 **Troubleshooting**

### **Problem: "fetch failed" error**
**Cause**: MCP server (port 3000) is not running
**Solution**: Start the MCP server with `npm run dev`

### **Problem: "MetaMask not detected"**
**Cause**: MetaMask extension not installed
**Solution**: Install MetaMask from https://metamask.io/download/

### **Problem: "Cannot connect to WebSocket"**
**Cause**: AI Agent server (port 3002) is not running
**Solution**: Start the AI Agent server with `npm run dev:ai`

### **Problem: "Port already in use"**
**Cause**: Another process is using the port
**Solution**: 
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3002

# Kill the process
taskkill /PID <PID> /F
```

## 📝 **Environment Variables**

Make sure you have `.env` file in the `agent` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
API_PORT=3000
WEBSOCKET_PORT=3001
```

## 🎉 **Success Indicators**

When everything is working correctly, you should see:

### **Terminal 1 (MCP Server)**
```
[INFO] Intelligent agent initialized successfully
[INFO] 🚀 Intelligent Blockchain Chatbot Server running on port 3000
[INFO] 📡 Health check: http://localhost:3000/health
[INFO] 💬 Chat endpoint: http://localhost:3000/chat
```

### **Terminal 2 (AI Agent Server)**
```
[INFO] 🤖 VaultAIAgent initialized
[INFO] 📊 Vault: 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b
[INFO] ⛓️ Chain: Sepolia (11155111)
[INFO] 🚀 Vault AI WebSocket Server running on port 3002
[INFO] 🔗 WebSocket: ws://localhost:3002
[INFO] 🌐 HTTP API: http://localhost:3002
```

### **Browser**
- ✅ "Connected to Vault AI Agent" (green status)
- 🦊 "Connect MetaMask" button visible
- 💬 Chat interface ready

## 🚀 **Ready to Trade!**

Once both servers are running and MetaMask is connected:

1. **Check Prices**: "What is the current price of Tesla token?"
2. **Calculate Costs**: "How much to buy 5 Tesla tokens?"
3. **Execute Trades**: "Buy 5 Tesla tokens" → Click MetaMask button
4. **Analyze Contracts**: "Analyze the vault contract"
5. **Check History**: "Get my last 10 transactions"

**Everything is ready!** 🎉

