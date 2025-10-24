import { ethers } from 'ethers';
import { Logger } from './utils/logger.js';

// Vault contract ABI - only the functions we need
const VAULT_ABI = [
  "function getPrice(address _token) public view returns (uint256 price)",
  "function buyStock(address _token, uint256 _amountInWholeTokens) public nonReentrant",
  "function sellStock(address _token, uint256 _amountInWholeTokens) public nonReentrant",
  "function stockList(address) public view returns (string name, uint256 pricingFactor, uint256 currentSupply, bool isSupported)",
  "event StockBought(address indexed user, address indexed token, uint256 amountBought, uint256 pyusdCost)",
  "event StockSold(address indexed user, address indexed token, uint256 amountSold, uint256 pyusdReceived)"
];

export interface VaultToolResult {
  success: boolean;
  data?: any;
  error?: string;
  transactionHash?: string;
}

export class VaultEthersTools {
  private provider: ethers.JsonRpcProvider;
  private vaultContract: ethers.Contract;
  private logger: Logger;
  
  // Contract addresses
  private readonly VAULT_ADDRESS = '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b';
  private readonly RPC_URL = 'https://0xrpc.io/sep'; // You'll need to add your Infura key
  private readonly CHAIN_ID = 11155111; // Sepolia
  
  // Token addresses
  private readonly TESLA_TOKEN = '0x09572cED4772527f28c6Ea8E62B08C973fc47671';
  private readonly PYUSD_ADDRESS = '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9'; // PYUSD on Sepolia

  constructor() {
    this.logger = new Logger('VaultEthersTools');
    
    // Initialize provider and contract
    this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
    this.vaultContract = new ethers.Contract(this.VAULT_ADDRESS, VAULT_ABI, this.provider);
    
    this.logger.info(`🔗 Connected to Sepolia RPC: ${this.RPC_URL}`);
    this.logger.info(`📊 Vault Contract: ${this.VAULT_ADDRESS}`);
  }

  /**
   * Get the current price of a token from the vault contract
   */
  async getTokenPrice(tokenAddress: string): Promise<VaultToolResult> {
    try {
      this.logger.info(`💰 Getting price for token: ${tokenAddress}`);
      
      // Call the vault contract's getPrice function
      const price = await this.vaultContract.getPrice(tokenAddress);
      
      // Convert from wei to readable format (PYUSD has 6 decimals)
      const priceInPYUSD = ethers.formatUnits(price, 6);
      
      this.logger.info(`✅ Token price: ${priceInPYUSD} PYUSD`);
      
      return {
        success: true,
        data: {
          tokenAddress,
          price: priceInPYUSD,
          priceWei: price.toString(),
          currency: 'PYUSD',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('❌ Error getting token price:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get stock information from the vault contract
   */
  async getStockInfo(tokenAddress: string): Promise<VaultToolResult> {
    try {
      this.logger.info(`📊 Getting stock info for token: ${tokenAddress}`);
      
      // Call the vault contract's stockList function
      const stockInfo = await this.vaultContract.stockList(tokenAddress);
      
      this.logger.info(`✅ Stock info retrieved: ${stockInfo.name}`);
      
      return {
        success: true,
        data: {
          tokenAddress,
          name: stockInfo.name,
          pricingFactor: stockInfo.pricingFactor.toString(),
          currentSupply: stockInfo.currentSupply.toString(),
          isSupported: stockInfo.isSupported,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('❌ Error getting stock info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Buy stock tokens (requires wallet connection)
   */
  async buyStockToken(tokenAddress: string, amount: string, walletPrivateKey?: string): Promise<VaultToolResult> {
    try {
      this.logger.info(`🛒 Buying ${amount} tokens of ${tokenAddress}`);
      
      if (!walletPrivateKey) {
        return {
          success: false,
          error: 'Wallet private key required for buying tokens'
        };
      }

      // Create wallet and signer
      const wallet = new ethers.Wallet(walletPrivateKey, this.provider);
      const contractWithSigner = this.vaultContract.connect(wallet) as any;
      
      // Convert amount to wei (assuming 18 decimals)
      const amountWei = ethers.parseEther(amount);
      
      // Get current price to calculate total cost
      const price = await this.vaultContract.getPrice(tokenAddress);
      const totalCost = (BigInt(amountWei) * BigInt(price)) / ethers.parseEther('1');
      
      this.logger.info(`💰 Total cost: ${ethers.formatEther(totalCost)} PYUSD`);
      
      // Step 1: Check and approve PYUSD allowance
      const pyusdContract = new ethers.Contract(this.PYUSD_ADDRESS, [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)",
        "function balanceOf(address account) public view returns (uint256)"
      ], wallet);
      
      // Check PYUSD balance
      let pyusdBalance;
      try {
        pyusdBalance = await pyusdContract.balanceOf(wallet.address);
      } catch (error) {
        return {
          success: false,
          error: `Failed to check PYUSD balance. Make sure you have PYUSD tokens in your wallet.`
        };
      }
      
      if (pyusdBalance < totalCost) {
        return {
          success: false,
          error: `Insufficient PYUSD balance. Required: ${ethers.formatUnits(totalCost, 6)} PYUSD, Available: ${ethers.formatUnits(pyusdBalance, 6)} PYUSD`
        };
      }
      
      // Check current allowance
      const currentAllowance = await pyusdContract.allowance(wallet.address, this.VAULT_ADDRESS);
      this.logger.info(`Current PYUSD allowance: ${ethers.formatUnits(currentAllowance, 6)} PYUSD`);
      
      // Approve PYUSD if needed
      if (currentAllowance < totalCost) {
        this.logger.info(`🔓 Approving PYUSD allowance: ${ethers.formatUnits(totalCost, 6)} PYUSD`);
        const approveTx = await pyusdContract.approve(this.VAULT_ADDRESS, totalCost);
        await approveTx.wait();
        this.logger.info(`✅ PYUSD approval confirmed: ${approveTx.hash}`);
      }
      
      // Step 2: Execute buyStock transaction
      this.logger.info(`📝 Executing buyStock transaction...`);
      const tx = await contractWithSigner.buyStock(tokenAddress, amountWei);
      
      this.logger.info(`📝 Transaction sent: ${tx.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      this.logger.info(`✅ Transaction confirmed: ${receipt?.hash}`);
      
      return {
        success: true,
        data: {
          operation: 'buy',
          tokenAddress,
          amount,
          amountWei: amountWei.toString(),
          price: ethers.formatUnits(price, 6),
          totalCost: ethers.formatUnits(totalCost, 6),
          transactionHash: receipt?.hash,
          blockNumber: receipt?.blockNumber,
          gasUsed: receipt?.gasUsed?.toString(),
          pyusdApproval: currentAllowance < totalCost ? 'required' : 'sufficient'
        },
        transactionHash: receipt?.hash
      };
    } catch (error) {
      this.logger.error('❌ Error buying stock token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sell stock tokens (requires wallet connection)
   */
  async sellStockToken(tokenAddress: string, amount: string, walletPrivateKey?: string): Promise<VaultToolResult> {
    try {
      this.logger.info(`💰 Selling ${amount} tokens of ${tokenAddress}`);
      
      if (!walletPrivateKey) {
        return {
          success: false,
          error: 'Wallet private key required for selling tokens'
        };
      }

      // Create wallet and signer
      const wallet = new ethers.Wallet(walletPrivateKey, this.provider);
      const contractWithSigner = this.vaultContract.connect(wallet) as any;
      
      // Convert amount to wei (assuming 18 decimals)
      const amountWei = ethers.parseEther(amount);
      
      // Get current price to calculate total received
      const price = await this.vaultContract.getPrice(tokenAddress);
      const totalReceived = (BigInt(amountWei) * BigInt(price)) / ethers.parseEther('1');
      
      this.logger.info(`💰 Total received: ${ethers.formatUnits(totalReceived, 6)} PYUSD`);
      
      // Step 1: Check and approve token allowance
      const tokenContract = new ethers.Contract(tokenAddress, [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)",
        "function balanceOf(address account) public view returns (uint256)"
      ], wallet);
      
      // Check token balance
      const tokenBalance = await tokenContract.balanceOf(wallet.address);
      if (tokenBalance < amountWei) {
        return {
          success: false,
          error: `Insufficient token balance. Required: ${ethers.formatEther(amountWei)} tokens, Available: ${ethers.formatEther(tokenBalance)} tokens`
        };
      }
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(wallet.address, this.VAULT_ADDRESS);
      this.logger.info(`Current token allowance: ${ethers.formatEther(currentAllowance)} tokens`);
      
      // Approve token if needed
      if (currentAllowance < amountWei) {
        this.logger.info(`🔓 Approving token allowance: ${ethers.formatEther(amountWei)} tokens`);
        const approveTx = await tokenContract.approve(this.VAULT_ADDRESS, amountWei);
        await approveTx.wait();
        this.logger.info(`✅ Token approval confirmed: ${approveTx.hash}`);
      }
      
      // Step 2: Execute sellStock transaction
      this.logger.info(`📝 Executing sellStock transaction...`);
      const tx = await contractWithSigner.sellStock(tokenAddress, amountWei);
      
      this.logger.info(`📝 Transaction sent: ${tx.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      this.logger.info(`✅ Transaction confirmed: ${receipt?.hash}`);
      
      return {
        success: true,
        data: {
          operation: 'sell',
          tokenAddress,
          amount,
          amountWei: amountWei.toString(),
          price: ethers.formatUnits(price, 6),
          totalReceived: ethers.formatUnits(totalReceived, 6),
          transactionHash: receipt?.hash,
          blockNumber: receipt?.blockNumber,
          gasUsed: receipt?.gasUsed?.toString(),
          tokenApproval: currentAllowance < amountWei ? 'required' : 'sufficient'
        },
        transactionHash: receipt?.hash
      };
    } catch (error) {
      this.logger.error('❌ Error selling stock token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get vault contract information
   */
  async getVaultInfo(): Promise<VaultToolResult> {
    try {
      this.logger.info(`📊 Getting vault contract information`);
      
      // Get basic contract info
      const code = await this.provider.getCode(this.VAULT_ADDRESS);
      const balance = await this.provider.getBalance(this.VAULT_ADDRESS);
      
      return {
        success: true,
        data: {
          vaultAddress: this.VAULT_ADDRESS,
          chainId: this.CHAIN_ID,
          hasCode: code !== '0x',
          balance: ethers.formatEther(balance),
          rpcUrl: this.RPC_URL,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('❌ Error getting vault info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all available tokens and their prices
   */
  async getAllTokenPrices(): Promise<VaultToolResult> {
    try {
      this.logger.info(`📊 Getting all token prices`);
      
      const tokens = [
        {
          address: this.TESLA_TOKEN,
          name: 'Tesla Token',
          symbol: 'TSLA'
        }
        // Add more tokens here as needed
      ];

      const results = [];
      
      for (const token of tokens) {
        try {
          const priceResult = await this.getTokenPrice(token.address);
          const stockInfo = await this.getStockInfo(token.address);
          
          if (priceResult.success && stockInfo.success) {
            results.push({
              ...token,
              price: priceResult.data?.price,
              priceWei: priceResult.data?.priceWei,
              stockInfo: stockInfo.data
            });
          }
        } catch (error) {
          this.logger.warn(`⚠️ Failed to get info for ${token.symbol}:`, error);
        }
      }
      
      return {
        success: true,
        data: {
          tokens: results,
          totalTokens: results.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('❌ Error getting all token prices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a token is supported by the vault
   */
  async isTokenSupported(tokenAddress: string): Promise<VaultToolResult> {
    try {
      this.logger.info(`🔍 Checking if token is supported: ${tokenAddress}`);
      
      const stockInfo = await this.getStockInfo(tokenAddress);
      
      if (stockInfo.success) {
        return {
          success: true,
          data: {
            tokenAddress,
            isSupported: stockInfo.data?.isSupported,
            name: stockInfo.data?.name,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          success: false,
          error: 'Failed to check token support'
        };
      }
    } catch (error) {
      this.logger.error('❌ Error checking token support:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
