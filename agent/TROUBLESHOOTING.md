# 🔧 Troubleshooting Guide

## Common Errors and Solutions

### 1. **Error: Cannot read properties of undefined (reading 'message')**

**Cause**: LLM returns empty response after tool execution

**Solution**: ✅ FIXED! Added fallback response generation for transaction preparation tools.

**What was changed**:
- Added clear instructions to LLM after tool execution
- Added fallback summary generation if LLM doesn't provide FINAL_ANSWER
- Improved error handling for empty responses

**Test**: Try "Buy 5 Tesla tokens" - should now work correctly!

---

### 2. **Error: fetch failed (MCP tools)**

**Cause**: MCP server on port 3000 is not running

**Solution**:
```bash
# Start MCP server in a new terminal
npm run dev
```

**Verify**:
```bash
curl http://localhost:3000/health
```

**Affected tools**:
- `analyze_contract`
- `get_address_transactions`

---

### 3. **Error: MetaMask not detected**

**Cause**: MetaMask extension not installed

**Solution**:
1. Install MetaMask: https://metamask.io/download/
2. Refresh the page
3. Click "🦊 Connect MetaMask"

---

### 4. **Error: Transaction failed - Insufficient stock in vault**

**Cause**: Not enough tokens in the vault to buy

**Solution**:
1. Check available stock with: "Get stock info for Tesla token"
2. Try buying a smaller amount
3. Or add liquidity to the vault first

---

### 5. **Error: Insufficient PYUSD balance**

**Cause**: Your wallet doesn't have enough PYUSD

**Solution**:
1. Get Sepolia PYUSD from faucet
2. Or buy with Sepolia ETH on testnet DEX

---

### 6. **Error: Allowance not approved**

**Cause**: PYUSD/Token allowance not set

**Solution**: The agent automatically handles this! When you click "Execute BUY/SELL Transaction", it will:
1. Check current allowance
2. Request approval if needed
3. Execute the transaction

---

### 7. **LLM returns verbose/incorrect response**

**Cause**: LLM not following the prompt format

**Solution**: ✅ FIXED! Improved system prompt with:
- Clear tool calling format
- Explicit FINAL_ANSWER requirement
- Fallback response generation

---

### 8. **WebSocket connection failed**

**Cause**: AI Agent server (port 3002) not running

**Solution**:
```bash
npm run dev:ai
```

**Verify**:
```bash
curl http://localhost:3002/health
```

---

### 9. **Price shows as "undefined"**

**Cause**: RPC call failed or contract address incorrect

**Solution**:
1. Check Sepolia RPC is working: https://0xrpc.io/sep
2. Verify contract addresses in `vault-ai-agent.ts`:
   - VAULT_ADDRESS: `0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b`
   - TESLA_TOKEN: `0x09572cED4772527f28c6Ea8E62B08C973fc47671`
   - PYUSD_ADDRESS: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`

---

### 10. **"Execute Transaction" button doesn't appear**

**Cause**: Transaction preparation failed or UI not detecting it

**Solution**:
1. Check browser console for errors
2. Verify tool call result has `requiresMetaMask: true`
3. Refresh the page and try again

---

## Debug Checklist

### Before Starting:
- [ ] `.env` file exists with `GEMINI_API_KEY`
- [ ] MetaMask installed and connected to Sepolia
- [ ] Wallet has Sepolia ETH for gas
- [ ] Wallet has PYUSD for buying (if needed)

### Server Startup:
- [ ] MCP Server running on port 3000
- [ ] AI Agent Server running on port 3002
- [ ] No port conflicts
- [ ] Both servers show "initialized successfully"

### Browser:
- [ ] Page loads at `http://localhost:3002/vault-ai-client.html`
- [ ] Green status: "Connected to Vault AI Agent"
- [ ] MetaMask button visible
- [ ] No console errors

### Testing:
- [ ] Price query works: "What is the current price of Tesla token?"
- [ ] Buy preparation works: "Buy 5 Tesla tokens"
- [ ] MetaMask button appears
- [ ] Contract analysis works (needs MCP): "Analyze the vault contract"

---

## Server Logs

### Good MCP Server Logs:
```
[INFO] Intelligent agent initialized successfully
[INFO] 🚀 Intelligent Blockchain Chatbot Server running on port 3000
[INFO] 📡 Health check: http://localhost:3000/health
[INFO] 💬 Chat endpoint: http://localhost:3000/chat
```

### Good AI Agent Logs:
```
[INFO] 🤖 VaultAIAgent initialized
[INFO] 📊 Vault: 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b
[INFO] ⛓️ Chain: Sepolia (11155111)
[INFO] 🚀 Vault AI WebSocket Server running on port 3002
[INFO] ✅ Client connected: [socket-id]
```

### Good Transaction Logs:
```
[INFO] 💬 Chat from [socket-id]: Buy 5 Tesla tokens
[INFO] 🔧 Tool Call: prepare_buy_transaction
[INFO] Executing tool: prepare_buy_transaction
[INFO] 🤖 LLM: FINAL_ANSWER: To buy 5 tokens...
```

---

## Quick Fixes

### Reset Everything:
```bash
# Stop all servers (Ctrl+C)
# Clear node_modules (if needed)
rm -rf node_modules
npm install

# Rebuild
npm run build

# Start fresh
npm run dev      # Terminal 1
npm run dev:ai   # Terminal 2
```

### Clear Browser Cache:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Reset MetaMask:
1. MetaMask → Settings → Advanced
2. "Clear activity tab data"
3. Reconnect wallet

---

## Still Having Issues?

### Check These:

1. **Node Version**: Node.js 18+ required
   ```bash
   node --version
   ```

2. **Network**: Sepolia testnet selected in MetaMask

3. **Gas**: Enough Sepolia ETH for gas fees

4. **Contracts**: Deployed and verified on Sepolia

5. **API Key**: Valid Gemini API key in `.env`

### Get Help:

- Check terminal logs for errors
- Check browser console (F12)
- Verify contract addresses on Sepolia Etherscan
- Test RPC endpoint: https://0xrpc.io/sep

---

## Success Indicators

When everything is working:
- ✅ Both servers running without errors
- ✅ Green "Connected" status in browser
- ✅ MetaMask button shows "🦊 Connect MetaMask"
- ✅ Price queries return actual prices
- ✅ Buy/Sell shows "Execute Transaction" button
- ✅ Contract analysis returns detailed info
- ✅ Transaction executes successfully with MetaMask

**You're all set!** 🎉

