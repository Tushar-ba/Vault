# Test Prompts for Intelligent Blockchain Agent

## Quick Copy-Paste Commands

### 1. Gas Analysis 💸

**Last 10 Transactions Gas:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"What was my total gas spend in the last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?\", \"chainId\": \"1\"}"
```

**Last 5 Transactions Gas (Sepolia):**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Calculate my total gas fees for the last 5 transactions on Sepolia for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55\", \"chainId\": \"11155111\"}"
```

**Average Gas Price:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"What's the average gas I paid in my recent transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?\"}"
```

**Highest Gas Fee:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Which transaction had the highest gas fee for address 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?\"}"
```

---

### 2. Simple Transaction Queries 📊

**Last Transaction:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"What is the last transaction for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?\"}"
```

**Last Transaction on Optimism:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Show me the most recent transaction for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 on Optimism\", \"chainId\": \"10\"}"
```

**Last 20 Transactions:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Get the last 20 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55\"}"
```

**Contract Interactions:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Show me the recent contract interactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55\"}"
```

---

### 3. Token Analysis 🪙

**Address Token Holdings:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"What tokens does 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 hold?\", \"chainId\": \"11155111\"}"
```

**UNI Token Info:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Tell me about this token: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984\", \"chainId\": \"1\"}"
```

**Token Total Supply:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"What is the total supply of token 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984?\"}"
```

**Token Safety:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Is this token safe to interact with: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984?\"}"
```

---

### 4. Multi-Chain Queries 🌐

**Activity Across Chains:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Show me the activity of 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 across Ethereum, Sepolia, and Optimism\"}"
```

**Find Address on Specific Chain:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Does 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 have any activity on Base Sepolia?\", \"chainId\": \"84532\"}"
```

**Compare Holdings:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Compare the token holdings of 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 on Ethereum vs Sepolia\"}"
```

---

### 5. Address Analysis 🔍

**Address Info:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Tell me about this address: 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55\"}"
```

**Address Balance:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"What's the balance of 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?\"}"
```

**Is it a Contract?:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Is 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 a contract or regular wallet?\"}"
```

---

### 6. Block Queries 📦

**Latest Block:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"What is the latest block on Ethereum?\", \"chainId\": \"1\"}"
```

**Specific Block Info:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Get information about block 21463081\", \"chainId\": \"1\"}"
```

---

### 7. Complex Queries (Multi-Step) 🔬

**Gas + Transaction Analysis:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"For address 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55, show me the last 10 transactions, calculate total gas, and identify the most expensive one\"}"
```

**Token Holdings + Safety:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"What tokens does 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 hold on Sepolia and are any of them suspicious?\", \"chainId\": \"11155111\"}"
```

**Transaction Pattern Analysis:**
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"Analyze the transaction pattern of 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 - how often do they transact and what type of transactions?\"}"
```

---

## Testing Strategy

### Phase 1: Basic Functionality ✅
1. Test simple queries (last transaction)
2. Verify tool calls are working
3. Check response format

### Phase 2: Calculations 🧮
1. Gas sum calculations
2. Average calculations
3. Min/max identification

### Phase 3: Multi-Chain 🌐
1. Same address on different chains
2. Cross-chain comparisons
3. Chain-specific features

### Phase 4: Complex Analysis 🔬
1. Multi-step queries
2. Safety assessments
3. Pattern analysis

---

## Expected Behaviors

### ✅ Good Responses Should Include:

1. **For Gas Queries:**
   - Total gas in ETH
   - Breakdown per transaction
   - Average, min, max
   - Conversion from wei

2. **For Transaction Queries:**
   - Transaction hash
   - Timestamp
   - From/To addresses
   - Value transferred
   - Gas fee

3. **For Token Queries:**
   - Token name and symbol
   - Total supply
   - Decimals
   - Balance (if applicable)

4. **For Multi-Step:**
   - Multiple tool calls visible in response
   - Synthesis of data from different sources
   - Clear final answer

### ❌ Watch Out For:

1. **Incomplete responses** - "END_TOOL_CALL" without analysis
2. **Wrong calculations** - Not converting wei to ETH
3. **Missing data** - Requesting 10 txs but only showing 5
4. **No tool calls** - LLM guessing instead of using tools

---

## Debug Commands

**Check Server Health:**
```bash
curl http://localhost:3000/health
```

**View Available Tools:**
```bash
curl http://localhost:3000/tools
```

**Get All Examples:**
```bash
curl http://localhost:3000/examples
```

**Clear Conversation:**
```bash
curl -X POST http://localhost:3000/clear
```

---

## Real-World Test Addresses

### Ethereum Mainnet
- **Vitalik:** `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`
- **USDC Contract:** `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **UNI Token:** `0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984`

### Test Example with Vitalik's Address:
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"message\": \"What was the total gas spend in the last 10 transactions for vitalik.eth (0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045)?\", \"chainId\": \"1\"}"
```

---

## Performance Benchmarks

| Query Type | Expected Time | Tool Calls | Iterations |
|------------|--------------|------------|------------|
| Simple (last tx) | < 3s | 1 | 2 |
| Gas calculation | < 5s | 1 | 2-3 |
| Token analysis | < 5s | 1-2 | 2-3 |
| Multi-step | < 10s | 2-4 | 3-5 |

---

## Tips for Best Results

1. **Be specific** - Include addresses, chain IDs, counts
2. **Use real addresses** - Test with addresses that have actual data
3. **Specify chains** - Include `chainId` parameter for faster results
4. **Request calculations** - Ask for totals, averages explicitly
5. **Check tool calls** - Verify the agent is using MCP tools, not guessing

---

**Happy Testing! 🚀**

