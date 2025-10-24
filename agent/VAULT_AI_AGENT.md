# 🤖 Vault AI Agent - LLM + Tool Calling + MCP Integration

## 🎯 Overview

The Vault AI Agent is a sophisticated AI-powered trading agent that combines:
- **LLM (Gemini 2.0 Flash)** for natural language understanding
- **Tool Calling** for executing blockchain operations
- **MCP Integration** for comprehensive blockchain analysis
- **Direct RPC Calls** for real-time vault contract interaction

## 🏗️ Architecture

```
User Message
    ↓
Gemini 2.0 Flash LLM
    ↓
Tool Selection & Calling
    ├─→ Vault Contract Tools (ethers.js)
    │   ├─ get_token_price
    │   ├─ calculate_buy_cost
    │   ├─ calculate_sell_return
    │   └─ get_stock_info
    │
    └─→ MCP Blockchain Analysis
        ├─ analyze_contract
        └─ get_address_transactions
    ↓
Final Response to User
```

## 🚀 Quick Start

### 1. Start the MCP Server (for blockchain analysis)
```bash
cd agent
npm run dev
```
This starts the MCP server on port 3001.

### 2. Start the AI Agent Server
```bash
cd agent
npm run dev:ai
```
This starts the AI agent on port 3002.

### 3. Open the Client
Open `http://localhost:3002/vault-ai-client.html` in your browser.

## 🛠️ Available Tools

### Vault Trading Tools

#### 1. `get_token_price`
Get the current price of a token from the vault contract.
```json
{
  "token_address": "0x09572cED4772527f28c6Ea8E62B08C973fc47671"
}
```

#### 2. `calculate_buy_cost`
Calculate the cost to buy a specific amount of tokens.
```json
{
  "token_address": "0x09572cED4772527f28c6Ea8E62B08C973fc47671",
  "amount": 5
}
```

#### 3. `calculate_sell_return`
Calculate how much PYUSD you will receive for selling tokens.
```json
{
  "token_address": "0x09572cED4772527f28c6Ea8E62B08C973fc47671",
  "amount": 3
}
```

#### 4. `get_stock_info`
Get detailed information about a stock token from the vault.
```json
{
  "token_address": "0x09572cED4772527f28c6Ea8E62B08C973fc47671"
}
```

### MCP Blockchain Analysis Tools

#### 5. `analyze_contract`
Analyze a smart contract using the MCP blockchain analysis server.
```json
{
  "contract_address": "0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b",
  "chain_id": "11155111"
}
```

#### 6. `get_address_transactions`
Get recent transactions for an address using MCP server.
```json
{
  "address": "0x49f51e3c94b459677c3b1e611db3e44d4e6b1d55",
  "chain_id": "11155111",
  "limit": 10
}
```

## 💬 Example Conversations

### Example 1: Get Token Price
**User:** "What's the current price of Tesla token?"

**Agent:**
1. Calls `get_token_price` tool
2. Returns: "The current Tesla token price is $1.0 PYUSD per token."

### Example 2: Calculate Buy Cost
**User:** "How much will it cost to buy 5 Tesla tokens?"

**Agent:**
1. Calls `calculate_buy_cost` tool
2. Returns: "To buy 5 Tesla tokens, you will need 5.0 PYUSD."

### Example 3: Contract Analysis
**User:** "Analyze the vault contract at 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b"

**Agent:**
1. Calls `analyze_contract` tool (MCP server)
2. Returns comprehensive contract analysis including:
   - Contract verification status
   - Security assessment
   - Transaction history
   - Token holdings
   - Risk level

## 🔧 Configuration

### Contract Addresses
- **Vault:** `0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b`
- **Tesla Token:** `0x09572cED4772527f28c6Ea8E62B08C973fc47671`
- **PYUSD:** `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
- **Chain:** Sepolia Testnet (11155111)
- **RPC:** https://0xrpc.io/sep

### Ports
- **MCP Server:** 3001
- **AI Agent Server:** 3002
- **Ethers Agent (MetaMask):** 3001

## 📊 Features

### ✅ LLM-Powered
- Natural language understanding
- Context-aware responses
- Multi-turn conversations
- Intelligent tool selection

### ✅ Tool Calling
- Automatic tool selection based on user intent
- Multiple tool calls per conversation
- Tool result processing
- Error handling

### ✅ Blockchain Integration
- Real-time RPC calls to vault contract
- Direct price queries
- Cost calculations
- Stock information retrieval

### ✅ MCP Integration
- Comprehensive contract analysis
- Transaction history
- Multi-chain support
- Security assessment

## 🔄 Workflow

1. **User sends message** via WebSocket or HTTP
2. **LLM analyzes** the message and determines intent
3. **LLM selects tools** to call based on the request
4. **Tools execute** blockchain operations or MCP queries
5. **LLM processes** tool results
6. **Final response** is generated and sent to user

## 🎨 UI Features

- **Real-time WebSocket** communication
- **Tool call visualization** showing each step
- **Quick action buttons** for common queries
- **Conversation history** maintained
- **Loading indicators** for async operations
- **Error handling** with clear messages

## 📝 API Endpoints

### WebSocket Events

#### Client → Server
- `chat_message`: Send a chat message
- `wallet_connect`: Connect wallet
- `clear_history`: Clear conversation history
- `ping`: Health check

#### Server → Client
- `status`: Connection status
- `chat_response`: AI response with tool calls
- `error`: Error messages
- `wallet_status`: Wallet connection status
- `pong`: Ping response

### HTTP Endpoints

#### POST `/api/chat`
Send a chat message via HTTP.
```json
{
  "message": "What is the current price of Tesla token?"
}
```

#### POST `/api/clear-history`
Clear conversation history.

#### GET `/health`
Health check endpoint.

## 🔒 Security

- No private keys stored on server
- MetaMask integration for transaction signing
- Read-only RPC calls for price queries
- MCP server for secure blockchain analysis

## 🚦 Status

- ✅ LLM Integration (Gemini 2.0 Flash)
- ✅ Tool Calling System
- ✅ Vault Contract Integration
- ✅ MCP Server Integration
- ✅ WebSocket Server
- ✅ HTML Client
- ✅ Real-time Updates
- ⏳ Transaction Execution (via MetaMask on separate port)

## 📚 References

- [BitYield-Protocol](https://github.com/CodeBlocker52/BitYield-Protocol) - Reference implementation
- [LangChain](https://js.langchain.com/) - LLM framework
- [Gemini API](https://ai.google.dev/) - Google's LLM
- [ethers.js](https://docs.ethers.org/) - Ethereum library
- [Socket.IO](https://socket.io/) - WebSocket library

## 🎯 Next Steps

1. ✅ LLM + Tool Calling - **DONE**
2. ✅ MCP Integration - **DONE**
3. ⏳ MetaMask Transaction Signing
4. ⏳ Multi-token Support
5. ⏳ Advanced Analytics
6. ⏳ Portfolio Management

## 🤝 Contributing

This is a demonstration project for ETH India Online. Feel free to extend and improve!

