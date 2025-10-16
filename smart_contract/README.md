# 📈 Decentralized Stock Trading Vault

A smart contract system that enables decentralized trading of tokenized stocks with dynamic pricing based on supply and demand using a bonding curve mechanism.

## 🔍 What This Contract Does

The **Vault Contract** implements a decentralized exchange for tokenized stocks with the following key features:

### Core Functionality:
- **Stock Listing**: Owner can add new tokenized stocks with initial supply and price
- **Dynamic Pricing**: Stock prices automatically adjust based on supply using a bonding curve
- **Buy Mechanism**: Users purchase stocks with PYUSD stablecoin
- **Sell Mechanism**: Users can sell stocks back to the vault for PYUSD
- **Price Discovery**: When people buy → supply decreases → price increases 📈
- **Price Discovery**: When people sell → supply increases → price decreases 📉

### Key Components:
- **PYUSD Integration**: Uses PayPal USD as the stable currency for all transactions
- **Bonding Curve Pricing**: `Price = (PricingFactor × 10^18) / CurrentSupply`
- **Supply Management**: Tracks available stock supply in the vault
- **User Balance Tracking**: Monitors individual user holdings

### Example Workflow:
1. **Owner lists stock**: 100,000 Apple stocks at $1 each
2. **User buys stocks**: Purchases 1,000 stocks with PYUSD
3. **Price increases**: Supply decreases from 100,000 to 99,000 → price goes up
4. **User sells stocks**: Sells 500 stocks back to vault
5. **Price decreases**: Supply increases to 99,500 → price goes down

## 🛠 Project Structure

This project includes:
- **Vault.sol**: Main trading contract with bonding curve pricing
- **Comprehensive Tests**: Solidity tests covering all functionality
- **Mock Tokens**: Test implementations of PYUSD and stock tokens
- **Hardhat Configuration**: Complete development environment setup

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or later)
- npm or yarn

### Installation
```shell
npm install
```

### Compile Contracts
```shell
npx hardhat compile
```

### Run Tests
```shell
npx hardhat test solidity
```

### Development Commands

**Compile all contracts:**
```shell
npx hardhat compile
```

**Run Solidity tests:**
```shell
npx hardhat test solidity
```

**Run all tests (if available):**
```shell
npx hardhat test
```

## 📋 Test Coverage

The test suite covers:
- ✅ **Stock Listing**: Owner can add new stocks with pricing
- ✅ **Buying Functionality**: Users can purchase stocks with PYUSD
- ✅ **Selling Functionality**: Users can sell stocks back to vault
- ✅ **Price Dynamics**: Bonding curve pricing increases/decreases correctly
- ✅ **Access Control**: Only owner can list stocks
- ✅ **Edge Cases**: Zero supply, insufficient funds, unsupported stocks
- ✅ **Multiple Stocks**: Support for different tokenized stocks
- ✅ **Complete Workflow**: End-to-end trading scenarios

## 🔧 Contract Architecture

### Main Contract: `Vault.sol`
- **Owner Functions**: `listAndDepositInitialStock()`
- **User Functions**: `buyStock()`, `sellStock()`
- **View Functions**: `getPrice()`
- **State Management**: Supply tracking, user balances, pricing factors

### Key Features:
- **Bonding Curve Pricing**: Automatic price adjustment based on supply
- **PYUSD Integration**: Stable currency for all transactions  
- **Supply Elasticity**: Price responds to buying/selling pressure
- **Multi-Stock Support**: Handle multiple tokenized assets

## 💡 Usage Examples

### For Contract Owner:
```solidity
// List Apple stock: 100k shares at $1 each
vault.listAndDepositInitialStock(
    appleTokenAddress,
    "Apple Inc", 
    100000,  // 100k stocks
    1        // $1 initial price
);
```

### For Users:
```solidity
// Buy 500 Apple stocks
pyusd.approve(vaultAddress, cost);
vault.buyStock(appleTokenAddress, 500);

// Sell 200 Apple stocks
appleToken.approve(vaultAddress, amount);
vault.sellStock(appleTokenAddress, 200);
```

## 🌐 Deployment

### Local Development:
```shell
npx hardhat node
npx hardhat ignition deploy ignition/modules/Vault.ts --network localhost
```

### Testnet Deployment:
```shell
npx hardhat ignition deploy ignition/modules/Vault.ts --network sepolia
```

## 📜 License

MIT License - see LICENSE file for details.
