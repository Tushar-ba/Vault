# 🤖 Blockchain Intelligence Platform

A comprehensive AI-powered blockchain analysis platform combining **Model Context Protocol (MCP)** for multi-chain blockchain analysis and **Vault AI Agent** for DeFi trading operations.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Running the Servers](#running-the-servers)
- [System Components](#system-components)
- [MCP Server Details](#mcp-server-details)
- [Vault AI Agent Details](#vault-ai-agent-details)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This platform consists of two main AI agents:

1. **MCP Blockchain Intelligence Server** (`npm run dev`)
   - Multi-chain blockchain analysis
   - Smart contract verification
   - Transaction history tracking
   - Token holdings analysis
   - Cross-chain activity monitoring

2. **Vault AI Trading Agent** (`npm run dev:ai`)
   - Real-time token pricing
   - Buy/sell transaction preparation
   - MetaMask integration
   - Support for multiple stock tokens (Tesla, Google, Microsoft)
   - WebSocket-based real-time communication

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                            │
│          (Frontend WebSocket/HTTP Clients)                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│  MCP Server      │                  │  Vault AI Server │
│  (Port 3000)     │                  │  (Port 3002)     │
└──────────────────┘                  └──────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│ Intelligent      │                  │ Vault AI Agent   │
│ Agent            │                  │                  │
│ • Query          │                  │ • Price Tools    │
│   Classification │                  │ • Buy/Sell Tools │
│ • Tool Calling   │                  │ • Token Manager  │
│ • Response Gen   │                  │                  │
└──────────────────┘                  └──────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│ Docker MCP       │                  │ Ethers.js        │
│ Client           │                  │ Provider         │
│ • Blockscout API │                  │                  │
│ • Multi-chain    │                  │ • Vault Contract │
│   Support        │                  │ • Token Pricing  │
└──────────────────┘                  └──────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│ Blockchain Data  │                  │ Sepolia Testnet  │
│ (Blockscout)     │                  │ Vault Contract   │
└──────────────────┘                  └──────────────────┘
```

---

## 📦 Requirements

### System Requirements
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Docker**: Latest version (for MCP server)
- **RAM**: 4GB minimum
- **Disk Space**: 1GB free

### API Keys
- **Gemini API Key**: Required for LLM functionality
  - Get it from: https://makersuite.google.com/app/apikey

### Optional
- **MetaMask**: For executing vault transactions
- **Sepolia ETH**: For testing vault operations

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd agent
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:

```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
API_PORT=3001
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

### 4. Start Docker (for MCP server)
```bash
# Make sure Docker Desktop is running
docker ps
```

---

## ▶️ Running the Servers

### MCP Blockchain Intelligence Server

```bash
npm run dev
```

**Server Details:**
- **Port**: 3000
- **Protocol**: HTTP + POST /chat endpoint
- **Use Case**: Blockchain analysis, contract verification, transaction history

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze contract 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b",
    "chainId": "11155111"
  }'
```

### Vault AI Trading Agent

```bash
npm run dev:ai
```

**Server Details:**
- **Port**: 3002
- **Protocol**: WebSocket + HTTP
- **Use Case**: Token trading, price queries, transaction preparation

**Health Check:**
```bash
curl http://localhost:3002/health
```

**WebSocket Connection:**
```javascript
const socket = io('http://localhost:3002');

socket.on('connect', () => {
  console.log('Connected to Vault AI Agent');
});

socket.emit('chat_message', {
  message: 'Get Tesla token price'
});

socket.on('chat_response', (response) => {
  console.log('Response:', response);
});
```

---

## 🔧 System Components

### Core Files Structure

```
agent/
├── src/
│   ├── intelligent-chatbot-server.ts    # MCP Server (Port 3000)
│   ├── intelligent-agent.ts             # MCP Agent with tool calling
│   ├── vault-ai-server.ts               # Vault WebSocket Server (Port 3002)
│   ├── vault-ai-agent.ts                # Vault AI Agent with LLM
│   ├── docker-mcp-client.ts             # MCP Docker integration
│   ├── analysis/
│   │   └── response-generator.ts        # Intelligent response formatting
│   ├── config/
│   │   └── index.ts                     # Configuration management
│   ├── utils/
│   │   └── logger.ts                    # Logging utility
│   └── vault-tokens.json                # Supported token definitions
├── public/
│   └── vault-ai-client.html             # Frontend UI
├── package.json                         # Dependencies and scripts
├── tsconfig.json                        # TypeScript configuration
└── .env                                 # Environment variables
```

---

## 🔍 MCP Server Details

### What is MCP (Model Context Protocol)?

MCP is a protocol that allows AI models to interact with external tools and data sources in a standardized way. Our implementation uses:

- **Docker-based Blockscout MCP Server**: Provides blockchain data access
- **Intelligent Query Classification**: Routes queries to appropriate analysis types
- **Multi-chain Support**: Ethereum, Sepolia, Base Sepolia, Optimism, Arbitrum

### MCP Server Architecture

```typescript
// 1. User sends query to MCP server
POST http://localhost:3000/chat
{
  "message": "Show me recent transactions for 0x123...",
  "chainId": "11155111"
}

// 2. Intelligent Agent classifies the query
const queryType = classifyQuery(message);
// Types: contract_analysis, transaction_history, token_holdings, etc.

// 3. Agent calls appropriate MCP tool
const tools = {
  'read_contract': (address, chainId) => { ... },
  'get_transactions': (address, limit) => { ... },
  'check_tokens': (address) => { ... }
}

// 4. Docker MCP Client fetches data
const result = await dockerMCPClient.callTool(toolName, params);

// 5. Response Generator formats the output
const response = responseGenerator.generate(queryType, result);

// 6. Returns formatted response to user
return {
  success: true,
  data: { response, toolCalls, iterations }
}
```

### How MCP Fetches Responses

#### Step 1: Docker MCP Client Connection
```typescript
// docker-mcp-client.ts
class DockerMCPClient {
  async initialize() {
    // Connect to Docker container running Blockscout MCP
    this.client = new Client({
      name: "blockchain-intelligence-client",
      version: "1.0.0"
    });
    
    // Establish stdio transport to Docker
    const transport = new StdioClientTransport({
      command: "docker",
      args: ["exec", "-i", "mcp-server", "blockscout-mcp"]
    });
    
    await this.client.connect(transport);
  }
}
```

#### Step 2: Tool Calling Flow
```typescript
// intelligent-agent.ts
async chat(userMessage: string) {
  // LLM decides which tool to call
  const toolCall = extractToolCall(llmResponse);
  
  // Execute the tool via MCP
  const toolResult = await this.mcpClient.callTool(
    toolCall.name,
    toolCall.arguments
  );
  
  // LLM processes the result
  const finalAnswer = await this.llm.invoke([
    new SystemMessage("Analyze this data..."),
    new HumanMessage(JSON.stringify(toolResult))
  ]);
  
  return finalAnswer;
}
```

#### Step 3: Response Generation
```typescript
// analysis/response-generator.ts
class AnalysisResponseGenerator {
  generate(queryType: string, data: any): string {
    switch(queryType) {
      case 'contract_analysis':
        return this.formatContractAnalysis(data);
      case 'transaction_history':
        return this.formatTransactionHistory(data);
      case 'defi_protocol_analysis':
        return this.formatDeFiAnalysis(data);
      // ... more specialized formatters
    }
  }
}
```

### Supported MCP Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `read_contract` | Get contract details and verification status | `address`, `chainId` |
| `list_transactions` | Get transaction history | `address`, `limit`, `chainId` |
| `check_token_holdings` | Get token balances | `address`, `chainId` |
| `analyze_nft_collection` | NFT collection analysis | `contractAddress`, `chainId` |
| `get_defi_positions` | DeFi protocol positions | `address`, `protocol` |

### Query Classification System

The intelligent agent automatically classifies queries into these types:

1. **Contract Analysis**: "Analyze contract 0x...", "Is this contract verified?"
2. **Transaction History**: "Show me recent transactions", "Transaction hash analysis"
3. **Token Holdings**: "What tokens does address hold?", "Check balance"
4. **DeFi Protocol Analysis**: "Aave positions", "Uniswap liquidity"
5. **NFT Analysis**: "NFT collection stats", "Show NFT ownership"
6. **Cross-chain Analysis**: "Activity across all chains"
7. **Gas Analysis**: "Total gas spent", "Gas optimization"
8. **Most Active Chain**: "Which chain is most active?"
9. **General Blockchain**: "Explain blockchain", "What is DeFi?"

### LLM Filtering and Intelligence

#### Gemini LLM Integration
```typescript
// vault-ai-agent.ts & intelligent-agent.ts
this.llm = new ChatGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
  model: 'gemini-1.5-flash',  // Fast, cost-effective model
  temperature: 0.1,             // Low temperature for deterministic responses
  maxOutputTokens: 8000         // Maximum response length
});
```

#### Intelligent Filtering Process

1. **System Prompt Engineering**
```typescript
const systemPrompt = `
You are a blockchain intelligence agent.

AVAILABLE TOOLS:
- read_contract: Analyze smart contracts
- list_transactions: Get transaction history
- check_token_holdings: Get token balances

TOOL CALLING FORMAT:
TOOL_CALL: tool_name
ARGS: {"param1": "value1"}
END_TOOL_CALL

RESPONSE FORMAT:
After gathering data, provide:
FINAL_ANSWER: Your analysis here

RULES:
1. ALWAYS call tools to get real data
2. Make multiple tool calls if needed for comprehensive analysis
3. Provide clear, structured responses
4. Include relevant metrics and insights
`;
```

2. **Iterative Tool Calling**
```typescript
while (iteration < maxIterations) {
  // LLM decides next action
  const response = await this.llm.invoke(messages);
  
  // Check if LLM wants to call a tool
  const toolCall = this.extractToolCall(response.content);
  
  if (toolCall) {
    // Execute tool and add result to conversation
    const result = await this.executeTool(toolCall);
    conversationHistory.push({
      role: 'assistant',
      content: `Tool result: ${JSON.stringify(result)}`
    });
    continue;
  }
  
  // Check if LLM is ready to provide final answer
  const finalAnswer = this.extractFinalAnswer(response.content);
  if (finalAnswer) {
    return finalAnswer;
  }
}
```

3. **Response Quality Control**
```typescript
// Response Generator ensures high-quality output
class AnalysisResponseGenerator {
  formatContractAnalysis(data: any): string {
    return `
🔍 **Contract Analysis**

**Address**: ${data.address}
**Verification Status**: ${data.isVerified ? '✅ Verified' : '❌ Not Verified'}
**Compiler**: ${data.compiler}
**Optimization**: ${data.optimization}

**Key Features**:
${this.extractKeyFeatures(data)}

**Security Assessment**:
${this.assessSecurity(data)}

**Recommendations**:
${this.generateRecommendations(data)}
    `;
  }
}
```

---

## 🏦 Vault AI Agent Details

### Vault Smart Contract Integration

**Contract Details:**
- **Address**: `0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b`
- **Chain**: Sepolia Testnet (Chain ID: 11155111)
- **PYUSD Token**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`

**Supported Tokens:**
| Symbol | Name | Address |
|--------|------|---------|
| TSLA | Tesla Token | `0x09572cED4772527f28c6Ea8E62B08C973fc47671` |
| GOOGL | Google Token | `0xC411824F1695feeC0f9b8C3d4810c2FD1AB1000a` |
| MSFT | Microsoft Token | `0x98e565A1d46d4018E46052C936322479431CA883` |

### Vault AI Tools

The Vault AI Agent provides these tools:

```typescript
const tools = [
  {
    name: 'get_token_price',
    description: 'Get current token price from vault',
    parameters: { token_address: 'string' }
  },
  {
    name: 'calculate_buy_cost',
    description: 'Calculate cost to buy tokens',
    parameters: { token_address: 'string', amount: 'number' }
  },
  {
    name: 'calculate_sell_return',
    description: 'Calculate return from selling tokens',
    parameters: { token_address: 'string', amount: 'number' }
  },
  {
    name: 'prepare_buy_transaction',
    description: 'Prepare buy transaction for MetaMask',
    parameters: { token_address: 'string', amount: 'number' }
  },
  {
    name: 'prepare_sell_transaction',
    description: 'Prepare sell transaction for MetaMask',
    parameters: { token_address: 'string', amount: 'number' }
  },
  {
    name: 'analyze_contract',
    description: 'Analyze smart contract (calls MCP server)',
    parameters: { contract_address: 'string', chain_id: 'string' }
  },
  {
    name: 'get_address_transactions',
    description: 'Get transaction history (calls MCP server)',
    parameters: { address: 'string', chain_id: 'string', limit: 'number' }
  }
];
```

### Token Name Resolution

The Vault AI Agent intelligently resolves token names:

```typescript
// Users can use any of these formats:
"Buy 5 Tesla"              // By name
"Get TSLA price"           // By symbol
"Sell 3 Google tokens"     // By name with "tokens"
"Buy 10 GOOGL"             // By symbol
"Microsoft price"          // Partial name match
"0x09572c..."              // By address (exact)

// Agent resolves to correct address:
resolveTokenAddress("Tesla") // → 0x09572cED4772527f28c6Ea8E62B08C973fc47671
resolveTokenAddress("GOOGL") // → 0xC411824F1695feeC0f9b8C3d4810c2FD1AB1000a
```

### Buy/Sell Transaction Flow

```typescript
// User: "Buy 5 Tesla tokens"

// Step 1: Agent calculates cost
const price = await vaultContract.getPrice(teslaAddress);
const totalCost = price * 5; // e.g., 5.0 PYUSD

// Step 2: Agent prepares transaction steps
return {
  success: true,
  operation: 'buy',
  tokenSymbol: 'TSLA',
  amount: 5,
  totalCost: '5.0',
  steps: [
    {
      step: 1,
      action: 'approve_pyusd',
      description: 'Approve 5.0 PYUSD for vault',
      contract: PYUSD_ADDRESS,
      spender: VAULT_ADDRESS,
      amount: '5000000' // 6 decimals
    },
    {
      step: 2,
      action: 'buy_stock',
      description: 'Buy 5 TSLA tokens',
      contract: VAULT_ADDRESS,
      function: 'buyStock',
      params: { token: teslaAddress, amount: 5 }
    }
  ],
  requiresMetaMask: true,
  message: 'To buy 5 TSLA tokens:\n1. Approve 5.0 PYUSD\n2. Execute buy transaction'
};

// Step 3: Frontend shows MetaMask button
// Step 4: User clicks and MetaMask opens for approval
// Step 5: User confirms transactions in MetaMask
```

### Integration with MCP Server

The Vault AI Agent can call the MCP server for blockchain analysis:

```typescript
// User: "Analyze the vault contract"

// Vault AI Agent calls MCP Server
const response = await fetch('http://localhost:3000/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Analyze contract 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b',
    chainId: '11155111'
  })
});

// MCP server returns comprehensive analysis
// Vault AI Agent formats and returns to user
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for LLM | - | ✅ Yes |
| `API_PORT` | MCP server port | 3001 | ❌ No |
| `NODE_ENV` | Environment mode | development | ❌ No |
| `LOG_LEVEL` | Logging level | info | ❌ No |

### Token Configuration

Edit `src/vault-tokens.json` to add new tokens:

```json
{
  "tokens": [
    {
      "address": "0x...",
      "name": "New Token",
      "symbol": "NEW",
      "decimals": 18,
      "isActive": true,
      "description": "Description here",
      "addedAt": "2024-12-23T00:00:00.000Z"
    }
  ]
}
```

### Vault Contract Configuration

Vault address and chain are configured in `vault-ai-agent.ts`:

```typescript
private readonly VAULT_ADDRESS = '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b';
private readonly CHAIN_ID = 11155111; // Sepolia
private readonly RPC_URL = 'https://0xrpc.io/sep';
```

---

## 🐛 Troubleshooting

### MCP Server Issues

**Problem**: "Docker MCP client not connected"
```bash
# Solution: Start Docker and restart server
docker ps
npm run dev
```

**Problem**: "Tool call failed"
```bash
# Solution: Check Docker logs
docker logs mcp-server

# Rebuild MCP server
cd custom-mcp-server
docker build -t blockscout-mcp .
```

### Vault AI Agent Issues

**Problem**: "LLM invocation failed"
```bash
# Solution: Check Gemini API key
echo $GEMINI_API_KEY

# Test API key
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: YOUR_API_KEY" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

**Problem**: "Token not found"
```bash
# Solution: Check vault-tokens.json
cat src/vault-tokens.json

# Ensure token is active
# isActive: true
```

**Problem**: "Cannot read properties of undefined (reading 'message')"
```bash
# Solution: This was fixed by:
# 1. Adding message validation in WebSocket handler
# 2. Using stable Gemini model (gemini-1.5-flash)
# 3. Adding comprehensive error handling

# If still occurs, check logs:
tail -f logs/vault-ai-server.log
```

### Common Issues

**Port Already in Use**
```bash
# Find process using port
netstat -ano | findstr :3000
netstat -ano | findstr :3002

# Kill process
taskkill /PID <PID> /F
```

**Module Not Found**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**TypeScript Errors**
```bash
# Rebuild
npm run build

# Check for syntax errors
npx tsc --noEmit
```

---

## 🎓 Usage Examples

### MCP Server Examples

```bash
# Contract Analysis
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze contract 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b on Sepolia",
    "chainId": "11155111"
  }'

# Transaction History
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55",
    "chainId": "1"
  }'

# Token Holdings
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What tokens does 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 hold?",
    "chainId": "1"
  }'

# Cross-Chain Analysis
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze activity across all chains for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55"
  }'
```

### Vault AI Agent Examples

Using WebSocket (JavaScript):

```javascript
const socket = io('http://localhost:3002');

// Get Token Price
socket.emit('chat_message', { message: 'What is the current price of Tesla token?' });

// Calculate Buy Cost
socket.emit('chat_message', { message: 'How much will it cost to buy 10 Google tokens?' });

// Calculate Sell Return
socket.emit('chat_message', { message: 'How much will I get for selling 5 Microsoft tokens?' });

// Prepare Buy Transaction
socket.emit('chat_message', { message: 'Buy 5 Tesla tokens' });

// Prepare Sell Transaction
socket.emit('chat_message', { message: 'Sell 3 Google tokens' });

// Contract Analysis (calls MCP)
socket.emit('chat_message', { message: 'Analyze the vault contract' });

// Listen for responses
socket.on('chat_response', (response) => {
  if (response.data.success) {
    console.log('Response:', response.data.data.response);
    console.log('Tool calls:', response.data.data.toolCalls);
  } else {
    console.error('Error:', response.data.error);
  }
});
```

Using HTTP (for simple queries):

```bash
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Get Tesla price"}'
```

---

## 📊 Performance Optimization

### LLM Response Time
- **Gemini 1.5 Flash**: ~2-3 seconds per response
- **Tool Calling**: +1-2 seconds per tool
- **Total**: 3-7 seconds for complex queries

### MCP Server Performance
- **Docker overhead**: ~100ms
- **Blockscout API**: ~500ms-2s
- **Response formatting**: ~50ms

### Caching Strategies
```typescript
// Implement caching for frequently accessed data
const cache = new Map();

async function getTokenPrice(address: string) {
  const cacheKey = `price_${address}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data; // Cache for 1 minute
  }
  
  const price = await vaultContract.getPrice(address);
  cache.set(cacheKey, { data: price, timestamp: Date.now() });
  
  return price;
}
```

---

## 🔐 Security Best Practices

1. **API Keys**: Never commit `.env` file
2. **Input Validation**: All user inputs are validated
3. **Rate Limiting**: Implement rate limiting for production
4. **Error Handling**: Sensitive data not exposed in errors
5. **MetaMask**: Transactions require user confirmation

---

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start           # MCP Server
npm start:ai        # Vault AI Agent
```

### Docker Deployment
```bash
# Build Docker image
docker build -t blockchain-intelligence-platform .

# Run container
docker run -p 3000:3000 -p 3002:3002 \
  -e GEMINI_API_KEY=your_key \
  blockchain-intelligence-platform
```

### Environment-Specific Configs
```bash
# Production
NODE_ENV=production npm start

# Staging
NODE_ENV=staging npm start

# Development
NODE_ENV=development npm run dev
```

---

## 📝 License

MIT License

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

---

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: This README
- Logs: Check `logs/` directory

---

## 🎉 Conclusion

You now have a comprehensive AI-powered blockchain intelligence platform with:
- ✅ Multi-chain blockchain analysis via MCP
- ✅ DeFi trading operations via Vault AI Agent
- ✅ Intelligent query classification
- ✅ Real-time WebSocket communication
- ✅ MetaMask integration
- ✅ Comprehensive logging and error handling

**Start the servers and begin exploring blockchain data with AI! 🚀**
