# Vault


# Pyra-Vault: A Decentralized RWA Trading Hub

Pyra-Vault is a decentralized platform for trading tokenized real-world assets (RWAs) like bonds and stocks. It leverages the stability of **PYUSD** for all on-chain transactions and integrates **Blockscout's (MCP)** to provide unparalleled cross-chain transparency and security for users.

Our mission is to create a secure, transparent, and efficient marketplace for real-world assets on the blockchain, bridging traditional finance with the power of DeFi.

-----

## Key Features

  * **Tokenized RWA Trading:** A secure on-chain vault allows users to buy and sell ERC-20 tokens representing real-world bonds and stocks.
  * **PYUSD Integration:** All trades, settlements, and liquidity provisions are conducted using PYUSD, ensuring a stable and reliable medium of exchange.
  * **Multi-Chain Portfolio Dashboard:** Powered by the Blockscout MCP SDK, users get a comprehensive, aggregated view of their asset holdings across multiple blockchain networks.
  * **Real-Time Asset Analytics:** The platform displays live trading volume, holder distribution, and other key metrics for each tokenized asset.
  * **Address Intelligence & Reputation:**
      * **Pre-emptive Onboarding Check:** Before a user connects, their address is analyzed for a history of suspicious or malicious activity across chains, providing an initial on-chain reputation screening.
      * **Public Address Lookup:** Users can query any public wallet address to view its cross-chain trading history, fostering a more transparent and secure trading environment for everyone.

-----

## Architecture Overview

Pyra-Vault is built on a modular, multi-layered architecture that separates concerns between the user interface, backend services, AI-driven analytics, and on-chain logic.

1.  **Frontend (React):** The user-facing application built with **React**. It provides the interface for wallet connection, browsing tokenized assets, and executing trades. A crucial part of our user onboarding is an **on-chain KYC check**. Before a user can fully interact with the platform, the frontend leverages our backend's Address Intelligence agent to analyze their wallet's cross-chain transaction history for any suspicious activity. This serves as a preliminary on-chain reputation check to maintain a secure environment. Post-onboarding, the frontend uses its deep integration with **Blockscout's My Crypto Profile (MCP) SDK** to provide users with a comprehensive, **multi-chain dashboard** of their holdings, accessible via intuitive prompts like "Show me all my assets on Base and Optimism and all the EVM chains." It also empowers users to look up the cross-chain trading history of any public address and even analyse the contracts as well as there traits and bugs before they make any transaction to that particular contract  fostering a transparent and safer trading ecosystem for everyone.

2.  **Backend (Express.js):** A middleware server that acts as the primary data and logic coordinator. It handles requests from the frontend, queries the Blockscout MCP SDK for multi-chain data, and orchestrates calls to the LangGraph agent for address analysis. This offloads complex data fetching from the client, ensuring a responsive user experience.

3.  **Address Intelligence Agent (LangGraph):** This is the core of our security and transparency features. Built with LangGraph, this agent defines a stateful graph that can perform complex, multi-step analysis on a given wallet address.

      * **Input:** A wallet address.
      * **Tools:** The agent uses the Blockscout MCP SDK as a tool to fetch transaction history, token holdings, and other relevant data from multiple chains.
      * **Process:** The graph processes this data, checks against known scam address lists, analyzes transaction patterns, and formulates a risk score or a human-readable summary.
      * **Output:** An "Address Intelligence Report" delivered back to the backend.

4.  **Smart Contracts (Solidity):** The immutable, on-chain foundation of the platform.

      * `Vault.sol`: The core contract that holds all tokenized RWA and PYUSD liquidity. It contains the logic for swaps, deposits, and withdrawals.
      * `TokenizedAsset.sol`: An ERC-20 contract template used to mint new tokens representing specific stocks or bonds.

5.  **Blockchain (Base Sepolia / Sepolia):** The contracts are deployed on Base Sepolia, a fast and low-cost Layer 2 network, providing an ideal environment for trading. The architecture is also compatible with Ethereum Sepolia.

6.  **Data Layer (Blockscout MCP):** This is the single source of truth for cross-chain data. It provides the raw information needed for our user dashboards, asset analytics, and the Address Intelligence Agent.

-----

## Tech Stack

| Layer                  | Technology                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Frontend** | `React`, `TypeScript`, `Viem`, `Wagmi`, `Tailwind CSS`                                                          |
| **Backend** | `Node.js`, `Express.js`, `JavaScript`                                                                         |
| **AI / Agentic Logic** | `LangChain.js`, `LangGraph`                                                                                   |
| **Blockchain** | `Solidity`, `Hardhat`, `OpenZeppelin Contracts`                                                               |
| **Target Network** | `Base Sepolia` / `Ethereum Sepolia`                                                                           |
| **Data & Analytics** | `Blockscout MCP SDK`                                                                                          |

-----

## Project Structure

The project is organized as a monorepo to streamline development and dependency management across the different services.

```
pyra-vault/
├── packages/
│   ├── contracts/         # Solidity smart contracts and deployment scripts
│   │   ├── contracts/
│   │   │   ├── Vault.sol
│   │   │   └── TokenizedAsset.sol
│   │   ├── scripts/
│   │   │   └── deploy.js
│   │   ├── test/
│   │   └── hardhat.config.js
│   │
│   ├── frontend/          # React application (Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── App.jsx
│   │   └── package.json
│   │
│   ├── backend/           # Express.js server
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   └── services/      # (e.g., blockscout.service.js)
│   │   └── package.json
│   │
│   └── agent/             # LangGraph Address Intelligence Agent
│       ├── src/
│       │   ├── agent.js     # LangGraph state machine definition
│       │   └── tools/       # Tools for the agent (e.g., mcp-sdk-tool.js)
│       └── package.json
│
├── .gitignore
├── package.json           # Root package.json for workspace management (e.g., using Lerna or npm workspaces)
└── README.md
```

-----
