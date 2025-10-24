import fs from 'fs';
import path from 'path';
import { Logger } from './utils/logger.js';

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
  description?: string;
  addedAt?: string;
}

export interface TokenConfig {
  tokens: TokenInfo[];
  metadata: {
    version: string;
    lastUpdated: string;
    vaultAddress: string;
    chainId: string;
    chainName: string;
  };
}

export class VaultTokenManager {
  private logger: Logger;
  private configPath: string;
  private tokenConfig: TokenConfig;

  constructor(configPath?: string) {
    this.logger = new Logger('VaultTokenManager');
    this.configPath = configPath || path.resolve(process.cwd(), 'src/vault-tokens.json');
    this.tokenConfig = this.loadConfig();
  }

  private loadConfig(): TokenConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(data);
        this.logger.info(`Loaded token configuration from ${this.configPath}`);
        return config;
      } else {
        this.logger.warn(`Token config file not found at ${this.configPath}, creating default`);
        return this.createDefaultConfig();
      }
    } catch (error) {
      this.logger.error('Error loading token config:', error);
      return this.createDefaultConfig();
    }
  }

  private createDefaultConfig(): TokenConfig {
    return {
      tokens: [
        {
          address: '0x09572cED4772527f28c6Ea8E62B08C973fc47671',
          name: 'Tesla Token',
          symbol: 'TSLA',
          decimals: 18,
          isActive: true,
          description: 'Tesla stock token for trading on the vault',
          addedAt: new Date().toISOString()
        }
      ],
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        vaultAddress: '0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b',
        chainId: '11155111',
        chainName: 'Sepolia Testnet'
      }
    };
  }

  private saveConfig(): void {
    try {
      this.tokenConfig.metadata.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.configPath, JSON.stringify(this.tokenConfig, null, 2));
      this.logger.info(`Token configuration saved to ${this.configPath}`);
    } catch (error) {
      this.logger.error('Error saving token config:', error);
      throw error;
    }
  }

  // Get all tokens
  getAllTokens(): TokenInfo[] {
    return [...this.tokenConfig.tokens];
  }

  // Get active tokens only
  getActiveTokens(): TokenInfo[] {
    return this.tokenConfig.tokens.filter(token => token.isActive);
  }

  // Get token by address
  getTokenByAddress(address: string): TokenInfo | undefined {
    return this.tokenConfig.tokens.find(
      token => token.address.toLowerCase() === address.toLowerCase()
    );
  }

  // Get token by symbol
  getTokenBySymbol(symbol: string): TokenInfo | undefined {
    return this.tokenConfig.tokens.find(
      token => token.symbol.toLowerCase() === symbol.toLowerCase()
    );
  }

  // Add new token
  addToken(token: Omit<TokenInfo, 'addedAt'>): void {
    // Check if token already exists
    const existingToken = this.getTokenByAddress(token.address);
    if (existingToken) {
      throw new Error(`Token with address ${token.address} already exists`);
    }

    // Check if symbol is already used
    const existingSymbol = this.getTokenBySymbol(token.symbol);
    if (existingSymbol) {
      throw new Error(`Token with symbol ${token.symbol} already exists`);
    }

    const newToken: TokenInfo = {
      ...token,
      addedAt: new Date().toISOString()
    };

    this.tokenConfig.tokens.push(newToken);
    this.saveConfig();
    this.logger.info(`Added new token: ${token.name} (${token.symbol})`);
  }

  // Update existing token
  updateToken(address: string, updates: Partial<TokenInfo>): void {
    const tokenIndex = this.tokenConfig.tokens.findIndex(
      token => token.address.toLowerCase() === address.toLowerCase()
    );

    if (tokenIndex === -1) {
      throw new Error(`Token with address ${address} not found`);
    }

    // Don't allow changing address or addedAt
    const { address: _, addedAt: __, ...allowedUpdates } = updates;
    
    this.tokenConfig.tokens[tokenIndex] = {
      ...this.tokenConfig.tokens[tokenIndex],
      ...allowedUpdates
    };

    this.saveConfig();
    this.logger.info(`Updated token: ${this.tokenConfig.tokens[tokenIndex].name}`);
  }

  // Remove token
  removeToken(address: string): void {
    const tokenIndex = this.tokenConfig.tokens.findIndex(
      token => token.address.toLowerCase() === address.toLowerCase()
    );

    if (tokenIndex === -1) {
      throw new Error(`Token with address ${address} not found`);
    }

    const removedToken = this.tokenConfig.tokens.splice(tokenIndex, 1)[0];
    this.saveConfig();
    this.logger.info(`Removed token: ${removedToken.name} (${removedToken.symbol})`);
  }

  // Toggle token active status
  toggleTokenStatus(address: string): void {
    const token = this.getTokenByAddress(address);
    if (!token) {
      throw new Error(`Token with address ${address} not found`);
    }

    this.updateToken(address, { isActive: !token.isActive });
    this.logger.info(`Toggled token status: ${token.name} is now ${!token.isActive ? 'inactive' : 'active'}`);
  }

  // Validate token configuration
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if tokens array exists
    if (!Array.isArray(this.tokenConfig.tokens)) {
      errors.push('Tokens must be an array');
      return { isValid: false, errors };
    }

    // Validate each token
    this.tokenConfig.tokens.forEach((token, index) => {
      if (!token.address || typeof token.address !== 'string') {
        errors.push(`Token ${index}: address is required and must be a string`);
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(token.address)) {
        errors.push(`Token ${index}: address must be a valid Ethereum address`);
      }

      if (!token.name || typeof token.name !== 'string') {
        errors.push(`Token ${index}: name is required and must be a string`);
      }

      if (!token.symbol || typeof token.symbol !== 'string') {
        errors.push(`Token ${index}: symbol is required and must be a string`);
      }

      if (typeof token.decimals !== 'number' || token.decimals < 0 || token.decimals > 18) {
        errors.push(`Token ${index}: decimals must be a number between 0 and 18`);
      }

      if (typeof token.isActive !== 'boolean') {
        errors.push(`Token ${index}: isActive must be a boolean`);
      }
    });

    // Check for duplicate addresses
    const addresses = this.tokenConfig.tokens.map(token => token.address.toLowerCase());
    const duplicateAddresses = addresses.filter((address, index) => addresses.indexOf(address) !== index);
    if (duplicateAddresses.length > 0) {
      errors.push(`Duplicate addresses found: ${duplicateAddresses.join(', ')}`);
    }

    // Check for duplicate symbols
    const symbols = this.tokenConfig.tokens.map(token => token.symbol.toLowerCase());
    const duplicateSymbols = symbols.filter((symbol, index) => symbols.indexOf(symbol) !== index);
    if (duplicateSymbols.length > 0) {
      errors.push(`Duplicate symbols found: ${duplicateSymbols.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get configuration metadata
  getMetadata() {
    return { ...this.tokenConfig.metadata };
  }

  // Update metadata
  updateMetadata(updates: Partial<TokenConfig['metadata']>): void {
    this.tokenConfig.metadata = {
      ...this.tokenConfig.metadata,
      ...updates
    };
    this.saveConfig();
    this.logger.info('Updated token configuration metadata');
  }

  // Export configuration
  exportConfig(): TokenConfig {
    return JSON.parse(JSON.stringify(this.tokenConfig));
  }

  // Import configuration
  importConfig(config: TokenConfig): void {
    const validation = this.validateConfig();
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    this.tokenConfig = config;
    this.saveConfig();
    this.logger.info('Imported token configuration');
  }

  // Reset to default configuration
  resetToDefault(): void {
    this.tokenConfig = this.createDefaultConfig();
    this.saveConfig();
    this.logger.info('Reset token configuration to default');
  }
}
