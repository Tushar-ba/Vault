# 🚀 Quick Start - Intelligent Blockchain Chatbot

## TL;DR

I've built you an **intelligent AI chatbot** that can handle ALL your requirements:

✅ Gas fee analysis  
✅ Transaction patterns  
✅ Token safety  
✅ Creator investigation  
✅ Multi-chain support  
✅ Pagination  
✅ Natural language queries  

---

## Run It Now! (3 Steps)

### 1. Build

```bash
cd agent
npm install  # if you haven't already
npm run build
```

### 2. Start

```bash
npm run dev
```

You should see:
```
🚀 Intelligent Blockchain Chatbot Server running on port 3000
```

### 3. Test

Open a new terminal:

```bash
# Test 1: Simple query
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the last transaction for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?"}'

# Test 2: Gas analysis (YOUR REQUIREMENT!)
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Give me my total gas spend in the last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55"}'
```

Or run the full test suite:

```bash
node test-intelligent-agent.js
```

---

## What Makes This Special?

### Before (Old Agent)

❌ "last transaction address" → Triggered full multi-chain analysis  
❌ "gas spend in 10 transactions" → Didn't work, no calculations  
❌ "is this token safe" → Generic LLM response, no real data  
❌ Pagination → Not handled  

### After (Intelligent Agent)

✅ "last transaction address" → Returns just the last transaction  
✅ "gas spend in 10 transactions" → Fetches 10 txs, sums gas fees  
✅ "is this token safe" → Multi-tool analysis with real data  
✅ Pagination → Automatically handles cursors  

---

## Your Exact Requirements ✅

### 1. ✅ "Give me my last gas spend in last 10 transactions"

```json
{
  "message": "What was my total gas spend in the last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?"
}
```

**Agent does:**
1. Fetches 10 transactions
2. Extracts gas fee from each
3. Sums them up
4. Provides breakdown

### 2. ✅ "Here is this contract, analyze its transaction pattern and safety"

```json
{
  "message": "Analyze the transaction pattern of contract 0xABC... and tell me if it's safe to interact with"
}
```

**Agent does:**
1. Gets contract info
2. Fetches recent transactions
3. Analyzes patterns
4. Checks verification
5. Safety assessment

### 3. ✅ "What's the total supply and creator restrictions of this token?"

```json
{
  "message": "What is the total supply of token 0xDEF... and what restrictions does it have and how many does the creator hold?"
}
```

**Agent does:**
1. Gets token info (supply, decimals)
2. Checks contract for restrictions
3. Finds creator address
4. Checks creator holdings

### 4. ✅ "Fetch all tokens launched by this creator"

```json
{
  "message": "Show me all tokens launched by creator 0xXYZ..."
}
```

**Agent does:**
1. Analyzes creator address
2. Finds all deployed contracts
3. Filters for token contracts
4. Lists them all

### 5. ✅ "What was the creator's behavior in past tokens?"

```json
{
  "message": "Analyze the past behavior of this token creator 0xXYZ..."
}
```

**Agent does:**
1. Finds all tokens by creator
2. Analyzes each token's history
3. Checks for rug pulls, scams
4. Pattern analysis

---

## Example Queries That Work

### Gas Analysis

```
"What was my total gas spend in the last 10 transactions for 0x..."
"Show me the highest gas fee I paid in recent transactions"
"What's the average gas I spend per transaction?"
"Which transaction cost me the most gas?"
```

### Transaction Queries

```
"What is the last transaction for 0x..."
"Get the last 20 transactions and show me contract interactions"
"Show me all transactions above 1 ETH"
"What did I do in my last transaction?"
```

### Token Analysis

```
"What is the total supply of token 0x..."
"How many tokens does the creator hold?"
"Is this token safe: 0x..."
"What are the top 10 holders of this token?"
```

### Creator Investigation

```
"Show me all tokens created by 0x..."
"What was this creator's behavior in past tokens?"
"Has this creator launched scams before?"
```

### Multi-Chain

```
"Show me my activity across all chains"
"Find this address on Optimism and Arbitrum"
"Compare my holdings on Ethereum vs Base"
```

---

## API Endpoints

### POST `/chat`

Main endpoint - send your question here

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your question here",
    "chainId": "1"
  }'
```

### GET `/examples`

Get all example queries

```bash
curl http://localhost:3000/examples
```

### GET `/tools`

See all available blockchain tools

```bash
curl http://localhost:3000/tools
```

### GET `/health`

Check if agent is ready

```bash
curl http://localhost:3000/health
```

---

## What's Different?

### Old System
- Pattern matching (`if prompt includes "transaction"`)
- Fixed responses
- No multi-step planning
- No calculations
- Comprehensive analysis for everything

### New System
- AI understands intent
- Dynamic tool planning
- Multi-step execution
- Real calculations (gas sums, averages)
- Smart: simple query → simple response, complex → deep analysis

---

## Files Created

### Core System
- `src/intelligent-agent.ts` - The AI brain
- `src/intelligent-chatbot-server.ts` - REST API
- `test-intelligent-agent.js` - Test suite

### Documentation
- `INTELLIGENT_AGENT.md` - Full documentation
- `SOLUTION_SUMMARY.md` - What we built
- `QUICK_START.md` - This file!

### Old Files (Still Available)
- `src/simple-agent.ts` - Original (updated with fixes)
- `src/chatbot-server.ts` - Original server
- Run with `npm run dev:old`

---

## Architecture

```
┌─────────────────────┐
│  User Query         │  "Give me my gas spend in last 10 txs"
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Intelligent Agent                      │
│  - Understands: need to fetch 10 txs   │
│  - Plans: get_transactions_by_address   │
│  - Executes: calls MCP tool             │
│  - Analyzes: sums gas fees              │
│  - Responds: "Total: 0.023 ETH"         │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  MCP Tools (via Docker)                 │
│  - get_transactions_by_address          │
│  - get_token_info                       │
│  - get_address_info                     │
│  - 50+ more tools...                    │
└─────────────────────────────────────────┘
```

---

## Troubleshooting

### "Cannot connect to server"

Make sure it's running:
```bash
npm run dev
```

### "MCP tools not working"

Check Docker:
```bash
docker ps
# Should show blockscout-mcp-server running

# If not:
cd ..
docker-compose up -d
```

### "Agent gives generic responses"

The agent needs to call tools. Check the response for `toolCalls`:
```json
{
  "toolCalls": [...]  // Should have entries
}
```

If empty, the LLM might not understand. Try rephrasing with specific addresses.

---

## Next Steps

1. **Try it out** - Test with your own queries
2. **Check examples** - Visit `/examples` for more ideas
3. **Read docs** - See `INTELLIGENT_AGENT.md` for details
4. **Customize** - Add your own query patterns in the system prompt

---

## Support

- 📖 Full docs: `INTELLIGENT_AGENT.md`
- 🔧 API reference: `SOLUTION_SUMMARY.md`
- 💬 Examples: `http://localhost:3000/examples`
- 🧪 Tests: `node test-intelligent-agent.js`

---

**You're all set! 🎉**

Run `npm run dev` and start chatting with your blockchain! 🚀

