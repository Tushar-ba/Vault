# Intelligent Blockchain Chatbot Agent 🤖⛓️

## Overview

The **Intelligent Blockchain Agent** is a truly agentic AI system that understands natural language queries, plans multi-step operations, and executes blockchain analysis tasks using the Blockscout MCP tools.

### Key Features

✅ **Natural Language Understanding** - Ask questions in plain English  
✅ **Multi-Step Planning** - Breaks complex queries into tool calls  
✅ **Pagination Support** - Handles large datasets with cursor-based pagination  
✅ **Multi-Chain Analysis** - Works across Ethereum, Optimism, Arbitrum, Base, etc.  
✅ **Gas Analysis** - Calculate total gas spent, average fees, etc.  
✅ **Token Investigation** - Supply, holders, creator analysis  
✅ **Safety Assessment** - Contract and token safety analysis  
✅ **Creator Tracking** - Find all tokens launched by an address  

---

## Architecture

```
┌─────────────────┐
│  User Query     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Intelligent Agent       │
│ - Understands intent    │
│ - Plans tool execution  │
│ - Iterates until done   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ MCP Tools (via Docker)  │
│ - 50+ blockchain tools  │
│ - Multi-chain support   │
│ - Real-time data        │
└─────────────────────────┘
```

### How It Works

1. **User sends query** (e.g., "What's my gas spend in last 10 transactions?")
2. **Agent understands** the query and plans required tool calls
3. **Agent executes** `get_transactions_by_address` with `page_size: 10`
4. **Agent analyzes** the results and calculates total gas
5. **Agent responds** with the final answer

---

## Supported Query Types

### 1. Gas Analysis 💸

```
"What was my total gas spend in the last 10 transactions for 0x..."
"Show me gas fees for the last 5 transactions"
"What's the average gas price in my recent transactions?"
"Which transaction had the highest gas fee?"
```

### 2. Transaction Queries 📊

```
"What is the last transaction for 0x..."
"Get the last 20 transactions for this address"
"Show me recent contract interactions"
"Find all transactions above 1 ETH"
```

### 3. Token Analysis 🪙

```
"What is the total supply of token 0x..."
"How many tokens does the creator hold?"
"What restrictions does this token have?"
"Is this token safe to interact with?"
"Show me the top 10 holders"
```

### 4. Creator Investigation 🕵️

```
"Show me all tokens created by address 0x..."
"What was the behavior of this creator in past projects?"
"Has this creator launched rug-pulls before?"
"Compare this creator's token launches"
```

### 5. Contract Safety 🔒

```
"Analyze this contract's transaction pattern"
"Is this contract verified?"
"What are the security risks?"
"Show me recent contract interactions"
```

### 6. Multi-Chain Analysis 🌐

```
"Show me my activity across all chains"
"Where does this address have most transactions?"
"Compare holdings on Ethereum vs Optimism"
"Find this address on all chains"
```

---

## Quick Start

### 1. Build the Project

```bash
cd agent
npm run build
```

### 2. Start the Intelligent Agent

```bash
npm run dev
```

Or for production:

```bash
npm start
```

### 3. Test with cURL

#### Example 1: Last Transaction

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the last transaction for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?"
  }'
```

#### Example 2: Gas Analysis

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What was my total gas spend in the last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?",
    "chainId": "1"
  }'
```

#### Example 3: Token Analysis

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the total supply of this token: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984?"
  }'
```

---

## API Endpoints

### POST `/chat`

Main chatbot endpoint

**Request:**
```json
{
  "message": "Your question here",
  "chainId": "1" // optional, defaults to 1 (Ethereum)
}
```

**Response:**
```json
{
  "success": true,
  "response": "Detailed answer...",
  "toolCalls": [
    {
      "tool": "get_transactions_by_address",
      "args": {...},
      "result": {...}
    }
  ],
  "iterations": 2,
  "timestamp": "2025-10-22T...",
  "chainId": "1"
}
```

### POST `/clear`

Clear conversation history

### GET `/tools`

Get list of available MCP tools

### GET `/examples`

Get example queries by category

### GET `/health`

Health check endpoint

---

## Advanced Features

### Pagination Handling

The agent automatically handles pagination for large datasets:

```
User: "Get all transactions for the last month"
Agent: 
  1. Calls get_transactions_by_address (page 1)
  2. Detects pagination.next_call in response
  3. Calls again with cursor parameter
  4. Repeats until all data collected
  5. Provides aggregated analysis
```

### Multi-Tool Queries

Complex queries automatically use multiple tools:

```
User: "Is this token safe and what's the creator's history?"
Agent:
  1. get_token_info - get token details
  2. get_address_info - check creator address
  3. get_transactions_by_address - analyze creator activity
  4. get_tokens_by_address - find other tokens by creator
  5. Synthesizes safety assessment
```

### Chain Selection

Specify chain by ID or let the agent search:

```json
{
  "message": "Find address 0x... on Optimism",
  "chainId": "10"
}
```

Supported chains:
- `1` - Ethereum Mainnet
- `11155111` - Sepolia
- `10` - Optimism
- `42161` - Arbitrum One
- `84532` - Base Sepolia

---

## Comparison: Old vs New Agent

| Feature | Old Agent | Intelligent Agent |
|---------|-----------|-------------------|
| Query Understanding | Pattern matching | Natural language |
| Planning | Hardcoded | Dynamic |
| Tool Selection | Fixed rules | LLM decides |
| Pagination | Manual | Automatic |
| Multi-step | Limited | Full support |
| Calculations | LLM only | LLM + tools |
| Flexibility | Low | High |

---

## Example Conversations

### Gas Analysis

```
User: "What's my total gas spend in last 10 transactions for 0x49f..."

Agent: 
TOOL_CALL: get_transactions_by_address
ARGS: {"address": "0x49f...", "chain_id": "1", "page_size": 10, "order": "desc"}

[Tool returns 10 transactions]

FINAL_ANSWER: Based on your last 10 transactions on Ethereum:

Total Gas Spent: 0.0234 ETH ($90.12)
Average per tx: 0.00234 ETH ($9.01)
Highest fee: 0.0089 ETH (Transaction 0xabc...)
Lowest fee: 0.00045 ETH (Transaction 0xdef...)

Breakdown:
1. 0x604... - 0.0001 ETH - Dec 23, 2024
2. 0x91f... - 0.0002 ETH - Jul 16, 2024
[...]
```

### Token Safety

```
User: "Is this token safe? 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"

Agent:
TOOL_CALL: get_token_info
[analyzes UNI token]

TOOL_CALL: get_address_info
[checks token contract]

TOOL_CALL: get_token_holders
[analyzes holder distribution]

FINAL_ANSWER: ✅ This token appears SAFE to interact with:

Token: Uniswap (UNI)
Contract: 0x1f9840...
Type: ERC-20 Governance Token

Safety Indicators:
✅ Verified contract on Etherscan
✅ Well-distributed holders (100K+)
✅ No creator control (governance)
✅ High liquidity across exchanges
✅ Established project (2020+)

Risk Assessment: LOW (2/10)
Recommendation: SAFE for interaction
```

---

## Development

### Adding New Query Types

The agent learns from examples in the system prompt. To support new query types:

1. Add examples to `generateSystemPrompt()` in `intelligent-agent.ts`
2. No code changes needed - the LLM learns the pattern!

### Debugging

Enable detailed logging:

```typescript
this.logger.info(`🔄 Iteration ${iteration}`);
this.logger.info(`🤖 LLM Response: ${content}`);
this.logger.info(`🔧 Executing tool: ${toolName}`);
```

Check conversation history:
```bash
curl http://localhost:3000/chat -X POST -d '{"message": "debug"}'
```

---

## Production Deployment

### Environment Variables

```env
GEMINI_API_KEY=your_key_here
PORT=3000
NODE_ENV=production
MAX_ITERATIONS=10
```

### Docker Deployment

The agent runs alongside the MCP Docker container:

```bash
docker-compose up -d
npm run chatbot
```

### Monitoring

- Health endpoint: `/health`
- Check agent status and tool availability
- Monitor iteration counts (high = complex query)

---

## Limitations & Future Work

### Current Limitations
- Max 10 iterations per query
- Single conversation thread
- Limited to available MCP tools

### Planned Features
- [ ] Memory persistence across sessions
- [ ] Custom tool creation
- [ ] WebSocket streaming responses
- [ ] Multi-user conversation handling
- [ ] Advanced analytics dashboard
- [ ] Integration with ENS resolution
- [ ] Price data integration
- [ ] DeFi protocol analysis

---

## Troubleshooting

### Agent not responding

```bash
# Check if MCP Docker is running
docker ps

# Restart the chatbot
npm run dev
```

### Tool call failures

Check MCP server logs:
```bash
docker logs blockscout-mcp-server
```

### Pagination not working

Ensure cursor is being passed correctly:
```json
{
  "cursor": "eyJibG9ja19udW1iZXI..."
}
```

---

## Contributing

We welcome contributions! Areas for improvement:
- New query patterns
- Tool optimization
- Error handling
- Documentation

---

## License

MIT

---

**Built for ETH India Online 2025** 🇮🇳⛓️

