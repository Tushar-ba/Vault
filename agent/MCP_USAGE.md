## Blockscout MCP usage guide (Chatbot /chat endpoint)

Always pass `chainId` as a string and unlock the session once per server start.

### 0) Unlock session (send once)

Request body:

```json
{
  "message": "Call __unlock_blockchain_analysis__.",
  "chainId": "1"
}
```

You should see logs like:
- "Processing request of type ListToolsRequest" (from MCP)
- 18 MCP tools listed including `__unlock_blockchain_analysis__`

### Chain IDs (common)
- Ethereum Mainnet: `"1"`
- Sepolia: `"11155111"`
- Base Sepolia: `"84532"`
- Optimism: `"10"`
- Arbitrum One: `"42161"`
- Polygon: `"137"`
- BSC: `"56"`

### Tool catalog (from /tools)

- `__unlock_blockchain_analysis__`: Enables all tools for the session.
- `get_latest_block(chain_id)`: Latest indexed block number/timestamp.
- `get_block_info(chain_id, number_or_hash, include_transactions?)`: Block metadata; optionally return tx hashes.
- `get_address_by_ens_name(name)`: Resolve ENS to address.
- `get_address_info(chain_id, address)`: EOA/contract status, balance, ENS, proxy info, token details.
- `get_transactions_by_address(chain_id, address, age_from?, age_to?, methods?, cursor?)`: Native transfers + contract calls (excludes ERC‑20 Transfer events); paginated.
- `get_token_transfers_by_address(chain_id, address, age_from?, age_to?, token?, cursor?)`: ERC‑20 `Transfer` history; paginated.
- `get_contract_abi(chain_id, address)`: Verified contract ABI.
- `inspect_contract_code(chain_id, address, file_name?)`: View verified source/metadata (optionally a single file).
- `read_contract(chain_id, address, abi, function_name, args?, block?)`: Call view/pure or simulate call.
- `get_transaction_info(chain_id, transaction_hash, include_raw_input?)`: Enriched tx with decoded inputs/transfers.
- `get_transaction_logs(chain_id, transaction_hash, cursor?)`: Decoded event logs; paginated.
- `lookup_token_by_symbol(chain_id, symbol)`: Search by symbol/name.
- `nft_tokens_by_address(chain_id, address, cursor?)`: ERC‑721/1155/404 collectibles; paginated.
- `direct_api_call(chain_id, endpoint_path, query_params?, cursor?)`: Raw Blockscout API path with pagination support.

### End‑to‑end prompt templates (copy/paste bodies for POST /chat)

These templates are designed to drive the MCP tools precisely. Replace placeholders where indicated. Always keep `chainId` and `chain_id` as strings.

#### A) Session management

Unlock (sent automatically on server start, but safe to send manually):

```json
{ "message": "Call __unlock_blockchain_analysis__.", "chainId": "1" }
```

Verify tools (sanity check):

```json
{ "message": "List available tools and summarize their required arguments.", "chainId": "1" }
```

#### B) Address analysis (EOA/Contract)

High‑signal bundle (info + txs + token transfers), with pagination intent:

```json
{
  "message": "Use get_address_info (chain_id \"1\") for 0xADDRESS. Then get_transactions_by_address (age_from \"2025-01-01T00:00:00Z\", order asc, page_size 200). If pagination.next_call is present, return the next_call payload. Also call get_token_transfers_by_address for the same window. Produce a risk assessment (0–10) with evidence (hashes, dates, counterparties).",
  "chainId": "1"
}
```

Fetch only address info (any chain):

```json
{
  "message": "Use get_address_info for 0xADDRESS, chain_id \"CHAIN\".",
  "chainId": "CHAIN"
}
```

#### C) Contract analysis (verified source + ABI + read)

Sepolia (11155111):

```json
{
  "message": "Analyze smart contract 0xCONTRACT on Sepolia using MCP. chain_id \"11155111\". Call get_contract_abi, then inspect_contract_code. If the contract is a proxy (eip1967), also fetch ABI for the implementation from get_address_info.basic_info.implementations[0].address_hash. Summarize upgradeability, owner roles, critical functions, and risks.",
  "chainId": "11155111"
}
```

Base Sepolia (84532):

```json
{
  "message": "Analyze smart contract 0xCONTRACT on Base Sepolia via MCP. chain_id \"84532\". Call get_contract_abi and inspect_contract_code; then read_contract selected views (owner, name, symbol).",
  "chainId": "84532"
}
```

Read a function (example: ERC20 balanceOf):

```json
{
  "message": "Use read_contract with chain_id \"1\", address \"0xdAC17F958D2ee523a2206206994597C13D831ec7\", abi {\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"}],\"name\":\"balanceOf\",\"outputs\":[{\"name\":\"balance\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"}, function_name \"balanceOf\", args \"[\\\"0xF977814e90dA44bFA03b6295A0616a897441aceC\\\"]\".",
  "chainId": "1"
}
```

#### D) Transactions and logs

Human‑readable summary:

```json
{
  "message": "Use transaction_summary for 0xTXHASH, chain_id \"CHAIN\".",
  "chainId": "CHAIN"
}
```

Enriched transaction details:

```json
{
  "message": "Use get_transaction_info for 0xTXHASH, chain_id \"CHAIN\" (include_raw_input true).",
  "chainId": "CHAIN"
}
```

Decoded event logs (with pagination if needed):

```json
{
  "message": "Use get_transaction_logs for 0xTXHASH, chain_id \"CHAIN\". If pagination.next_call exists, return that call payload for the next page.",
  "chainId": "CHAIN"
}
```

#### E) Token/NFT views

ERC‑20 transfers to/from an address (time‑boxed):

```json
{
  "message": "Use get_token_transfers_by_address for 0xADDRESS, chain_id \"1\", age_from \"2025-01-01T00:00:00Z\". If paginated, provide the next_call.",
  "chainId": "1"
}
```

NFTs owned by an address:

```json
{
  "message": "Use nft_tokens_by_address for 0xADDRESS, chain_id \"1\". If paginated, return next_call to continue.",
  "chainId": "1"
}
```

Lookup by token symbol:

```json
{
  "message": "Use lookup_token_by_symbol chain_id \"1\", symbol \"USDT\".",
  "chainId": "1"
}
```

#### F) Advanced/Raw API via MCP

When a specific Blockscout API path is required (e.g., logs by address) use `direct_api_call`:

```json
{
  "message": "Use direct_api_call on chain_id \"11155111\", endpoint_path \"/api/v2/addresses/0xb6c58.../logs\", query_params {"page_size":"100","order":"asc"}. If paginated, return next_call.",
  "chainId": "11155111"
}
```

### MCP‑only behavior and verification checklist

- You should see logs: "Connected to real MCP server via Docker proxy" and "Processing request of type CallToolRequest".
- Tool calls show `chain_id` as a quoted string (e.g., `"84532"`).
- No messages like "Using direct Blockscout API calls…" (REST fallback disabled).
- Session is unlocked automatically on startup; you can still send the unlock body if needed.

### Proxy contracts (EIP‑1967) quick workflow

1) `get_address_info` → inspect `basic_info.proxy_type` and `implementations[].address_hash`.
2) Fetch ABI for implementation via `get_contract_abi(chain_id, impl_address)`.
3) Use `read_contract` against implementation for state views.
4) Correlate with proxy admin/owner functions, if exposed.

### Pagination usage pattern

If response includes:

```json
{
  "pagination": {
    "next_call": { "tool_name": "get_transactions_by_address", "params": { "chain_id": "1", "cursor": "..." }}
  }
}
```

Send the exact `next_call` as your next message (preserving all params).

### Common pitfalls

- `chain_id` must be a string; numeric values trigger Pydantic `string_type` errors.
- Always unlock once via `__unlock_blockchain_analysis__` (auto‑unlocked in server init).
- Use `age_from`/`age_to` for bounded time queries to avoid heavy scans.
- Respect pagination; continue with `pagination.next_call` until you have the data you need.

### Ready-to-send request bodies (POST /chat)

1) Latest block on Ethereum

```json
{
  "message": "Use get_latest_block with chain_id \"1\".",
  "chainId": "1"
}
```

2) Block info with transactions

```json
{
  "message": "Use get_block_info with chain_id \"1\", number_or_hash \"21463081\", include_transactions true.",
  "chainId": "1"
}
```

3) Address overview (Sepolia)

```json
{
  "message": "Use get_address_info for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55, chain_id \"11155111\".",
  "chainId": "11155111"
}
```

4) Address transactions (Mainnet)

```json
{
  "message": "Use get_transactions_by_address for 0x49f5..., chain_id \"1\", age_from \"2025-01-01T00:00:00Z\", order asc, page_size 200.",
  "chainId": "1"
}
```

5) ERC‑20 transfers for address (Mainnet)

```json
{
  "message": "Use get_token_transfers_by_address for 0x49f5..., chain_id \"1\", age_from \"2025-01-01T00:00:00Z\".",
  "chainId": "1"
}
```

6) Contract analysis – Base Sepolia (84532)

```json
{
  "message": "Analyze smart contract 0x067578da19fD94c8F1c9A8CEBbcC8ADB6421dae4 on Base Sepolia: call get_contract_abi and inspect_contract_code; then read_contract for key view functions. Summarize upgradeability, owner roles, and risks. chain_id \"84532\".",
  "chainId": "84532"
}
```

7) Contract analysis – Sepolia (11155111)

```json
{
  "message": "Analyze smart contract 0xb6c58fdb4bbffed7b7224634ab932518a29e4c4b on Sepolia via MCP: get_contract_abi, inspect_contract_code, and read_contract as needed; summarize security and behavior. chain_id \"11155111\".",
  "chainId": "11155111"
}
```

8) Transaction summary (Sepolia)

```json
{
  "message": "Use transaction_summary for 0x0d4110bf509c19a0715e3d45de48e732fa6f965b5f9db0484679babd4fc84a21, chain_id \"11155111\".",
  "chainId": "11155111"
}
```

9) Transaction logs (Sepolia)

```json
{
  "message": "Use get_transaction_logs for 0x0d4110bf509c19a0715e3d45de48e732fa6f965b5f9db0484679babd4fc84a21, chain_id \"11155111\".",
  "chainId": "11155111"
}
```

### Confirming MCP (not REST) is used
- Logs include: "Connected to real MCP server via Docker proxy", "Processing request of type CallToolRequest", and tool names exactly as above.
- You will NOT see `HttpMCPClient` or "Using direct Blockscout API calls..." when MCP-only is enforced.

### Common pitfalls / troubleshooting
- Always pass `chain_id` as a string. Pydantic error `string_type` means you sent a number.
- Call `__unlock_blockchain_analysis__` once after startup; otherwise tools may be locked.
- Use pagination via `cursor` when a response indicates a `pagination` object.


