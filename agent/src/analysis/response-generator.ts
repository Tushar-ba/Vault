import { Logger } from '../utils/logger.js';

interface ChainData {
  chainId: string;
  name: string;
  txCount: number;
  gasWei: bigint;
  gasEth: string;
  transactions: any[];
  mostRecentTx?: Date;
  oldestTx?: Date;
  transactionTypes: Record<string, number>;
  interactions: Array<{ address: string; count: number; type: string }>;
  tokens?: any[];
  addressInfo?: any;
}

export class AnalysisResponseGenerator {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('AnalysisResponseGenerator');
  }

  // Main dispatch method that determines response type based on query
  generateResponse(userMessage: string, toolCallsMade: any[]): string {
    const queryType = this.classifyQuery(userMessage);
    this.logger.info(`Query classified as: ${queryType}`);

    switch (queryType) {
      case 'transaction_hash':
        return this.generateTransactionHashAnalysis(userMessage, toolCallsMade);
      case 'defi_protocols':
        return this.generateDeFiProtocolAnalysis(userMessage, toolCallsMade);
      case 'chain_comparison':
        return this.generateChainComparison(userMessage, toolCallsMade);
      case 'token_analysis':
        return this.generateTokenAnalysis(userMessage, toolCallsMade);
      case 'gas_analysis':
        return this.generateGasAnalysis(userMessage, toolCallsMade);
      case 'activity_ranking':
        return this.generateActivityRanking(userMessage, toolCallsMade);
      case 'comprehensive_report':
        return this.generateComprehensiveReport(userMessage, toolCallsMade);
      case 'risk_assessment':
        return this.generateRiskAssessment(userMessage, toolCallsMade);
      case 'contract_analysis':
        return this.generateContractAnalysis(userMessage, toolCallsMade);
      case 'portfolio_distribution':
        return this.generatePortfolioDistribution(userMessage, toolCallsMade);
      case 'specific_chain':
        return this.generateSpecificChainAnalysis(userMessage, toolCallsMade);
      default:
        return this.generateGenericAnalysis(userMessage, toolCallsMade);
    }
  }

  private classifyQuery(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Transaction Hash Analysis (highest priority - specific hash pattern)
    if ((lowerMessage.includes('transaction') || lowerMessage.includes('tx') || lowerMessage.includes('hash')) && 
        /0x[a-fA-F0-9]{64}/.test(message)) {
      return 'transaction_hash';
    }

    // DeFi Protocol Analysis
    if (lowerMessage.includes('defi') || lowerMessage.includes('protocols') || 
        lowerMessage.includes('interacted with') || lowerMessage.includes('dapps')) {
      return 'defi_protocols';
    }

    // Chain Comparison (vs, compare, between)
    if ((lowerMessage.includes('compare') || lowerMessage.includes(' vs ') || 
         lowerMessage.includes('versus') || lowerMessage.includes('between')) &&
        !lowerMessage.includes('across all chains')) {
      return 'chain_comparison';
    }

    // Token Analysis
    if (lowerMessage.includes('token') && (lowerMessage.includes('hold') || 
        lowerMessage.includes('holdings') || lowerMessage.includes('transfer'))) {
      return 'token_analysis';
    }

    // Gas Analysis
    if (lowerMessage.includes('gas') && (lowerMessage.includes('spend') || 
        lowerMessage.includes('efficiency') || lowerMessage.includes('breakdown'))) {
      return 'gas_analysis';
    }

    // Comprehensive Report
    if (lowerMessage.includes('comprehensive report') || lowerMessage.includes('generate a') ||
        (lowerMessage.includes('including') && lowerMessage.includes('balance'))) {
      return 'comprehensive_report';
    }

    // Risk Assessment
    if (lowerMessage.includes('risk') || lowerMessage.includes('suspicious') || 
        lowerMessage.includes('assess') || lowerMessage.includes('safety')) {
      return 'risk_assessment';
    }

    // Contract Analysis
    if (lowerMessage.includes('contract') && (lowerMessage.includes('analyze') || 
        lowerMessage.includes('0x') || lowerMessage.includes('check'))) {
      return 'contract_analysis';
    }

    // Portfolio Distribution
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('distribution')) {
      return 'portfolio_distribution';
    }

    // Activity Ranking (which chain is most active, etc.)
    if (lowerMessage.includes('most active') || lowerMessage.includes('which chain') ||
        lowerMessage.includes('activity') && lowerMessage.includes('across all chains')) {
      return 'activity_ranking';
    }

    // Specific Chain Analysis
    if (this.extractSpecificChains(lowerMessage).length === 1) {
      return 'specific_chain';
    }

    return 'generic';
  }

  private generateDeFiProtocolAnalysis(userMessage: string, toolCallsMade: any[]): string {
    const address = this.extractAddressFromMessage(userMessage);
    const chainData = this.processToolCalls(toolCallsMade);
    
    const lines: string[] = [];
    lines.push(`🏦 **DeFi PROTOCOL INTERACTION ANALYSIS**`);
    lines.push(`📊 Address: ${address}`);
    lines.push('');

    // Extract DeFi protocols from transaction data
    const defiProtocols = this.identifyDeFiProtocols(chainData);
    
    if (defiProtocols.length === 0) {
      lines.push('❌ **No DeFi Protocol Interactions Found**');
      lines.push('This address appears to primarily engage in simple transfers and basic contract interactions.');
      return lines.join('\n');
    }

    lines.push(`✅ **Found ${defiProtocols.length} DeFi Protocol Interactions**`);
    lines.push('');

    // Group by chain
    const protocolsByChain = this.groupProtocolsByChain(defiProtocols);
    
    for (const [chainName, protocols] of Object.entries(protocolsByChain)) {
      lines.push(`**${chainName}:**`);
      protocols.forEach((protocol: any, index: number) => {
        lines.push(`${index + 1}. **${protocol.name}** (${protocol.category})`);
        lines.push(`   • Contract: ${protocol.address}`);
        lines.push(`   • Interactions: ${protocol.count} transactions`);
        lines.push(`   • Methods: ${protocol.methods.join(', ')}`);
        lines.push(`   • Last Used: ${protocol.lastUsed}`);
        lines.push('');
      });
    }

    // Protocol usage summary
    lines.push(`**📈 PROTOCOL USAGE SUMMARY:**`);
    const totalInteractions = defiProtocols.reduce((sum, p) => sum + p.count, 0);
    lines.push(`• Total DeFi Interactions: ${totalInteractions}`);
    lines.push(`• Active on ${Object.keys(protocolsByChain).length} chains`);
    
    const categories = [...new Set(defiProtocols.map(p => p.category))];
    lines.push(`• Protocol Categories: ${categories.join(', ')}`);

    return lines.join('\n');
  }

  private generateChainComparison(userMessage: string, toolCallsMade: any[]): string {
    const chains = this.extractSpecificChains(userMessage);
    const address = this.extractAddressFromMessage(userMessage);
    const chainData = this.processToolCalls(toolCallsMade);
    
    const lines: string[] = [];
    lines.push(`⚖️ **CHAIN COMPARISON ANALYSIS**`);
    lines.push(`📊 Address: ${address}`);
    
    if (chains.length >= 2) {
      const chainNames = chains.map(id => this.getChainName(id)).join(' vs ');
      lines.push(`🔗 Comparing: ${chainNames}`);
    }
    lines.push('');

    // Filter data to only requested chains
    const relevantChainData = chainData.filter(chain => 
      chains.length === 0 || chains.includes(chain.chainId)
    );

    if (relevantChainData.length === 0) {
      lines.push('❌ **No Activity Found**');
      lines.push('No transactions found on the requested chains.');
      return lines.join('\n');
    }

    // Head-to-head comparison
    lines.push(`**📊 HEAD-TO-HEAD COMPARISON:**`);
    lines.push('');

    const comparisonData = relevantChainData.map(chain => ({
      name: chain.name,
      transactions: chain.txCount,
      gasSpent: chain.gasEth,
      avgGasPerTx: chain.txCount > 0 ? (Number(chain.gasEth) / chain.txCount).toFixed(6) : '0',
      mostRecent: chain.mostRecentTx ? Math.floor((Date.now() - chain.mostRecentTx.getTime()) / (1000 * 60 * 60 * 24)) : 999,
      topMethod: Object.entries(chain.transactionTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    }));

    // Create comparison table
    lines.push('| Metric | ' + comparisonData.map(c => c.name).join(' | ') + ' |');
    lines.push('|' + '---|'.repeat(comparisonData.length + 1));
    lines.push('| **Transactions** | ' + comparisonData.map(c => c.transactions).join(' | ') + ' |');
    lines.push('| **Gas Spent (ETH)** | ' + comparisonData.map(c => c.gasSpent).join(' | ') + ' |');
    lines.push('| **Avg Gas/TX** | ' + comparisonData.map(c => c.avgGasPerTx).join(' | ') + ' |');
    lines.push('| **Days Since Last TX** | ' + comparisonData.map(c => c.mostRecent === 999 ? 'N/A' : c.mostRecent.toString()).join(' | ') + ' |');
    lines.push('| **Top Activity** | ' + comparisonData.map(c => c.topMethod).join(' | ') + ' |');
    lines.push('');

    // Winner analysis
    const mostActive = comparisonData.reduce((prev, current) => 
      (prev.transactions > current.transactions) ? prev : current
    );
    
    const mostRecent = comparisonData.reduce((prev, current) => 
      (prev.mostRecent < current.mostRecent) ? prev : current
    );

    lines.push(`**🏆 COMPARISON RESULTS:**`);
    lines.push(`• **Most Active**: ${mostActive.name} (${mostActive.transactions} transactions)`);
    lines.push(`• **Most Recent Activity**: ${mostRecent.name} (${mostRecent.mostRecent} days ago)`);
    
    const totalGas = comparisonData.reduce((sum, c) => sum + Number(c.gasSpent), 0);
    lines.push(`• **Total Gas Across Chains**: ${totalGas.toFixed(6)} ETH`);

    return lines.join('\n');
  }

  private generateTokenAnalysis(userMessage: string, toolCallsMade: any[]): string {
    const address = this.extractAddressFromMessage(userMessage);
    const chainData = this.processToolCalls(toolCallsMade);
    
    const lines: string[] = [];
    lines.push(`🪙 **TOKEN HOLDINGS ANALYSIS**`);
    lines.push(`📊 Address: ${address}`);
    lines.push('');

    // Extract token data from tool calls
    const tokenCalls = toolCallsMade.filter(call => call.tool === 'get_tokens_by_address');
    
    if (tokenCalls.length === 0) {
      lines.push('❌ **No Token Data Available**');
      lines.push('No token holdings information was retrieved.');
      return lines.join('\n');
    }

    let totalTokensAcrossChains = 0;
    let totalValueUSD = 0;
    const tokensByChain: Record<string, any[]> = {};

    for (const call of tokenCalls) {
      const chainId = call.args?.chain_id;
      const chainName = this.getChainName(chainId);
      const tokens = call.result?.data || [];
      
      if (tokens.length > 0) {
        tokensByChain[chainName] = tokens;
        totalTokensAcrossChains += tokens.length;
      }
    }

    lines.push(`**📊 PORTFOLIO OVERVIEW:**`);
    lines.push(`• Total Unique Tokens: ${totalTokensAcrossChains}`);
    lines.push(`• Active on ${Object.keys(tokensByChain).length} chains`);
    lines.push('');

    // Detailed breakdown by chain
    for (const [chainName, tokens] of Object.entries(tokensByChain)) {
      lines.push(`**${chainName} (${tokens.length} tokens):**`);
      
      tokens.slice(0, 10).forEach((token, index) => {
        const symbol = token.symbol || 'Unknown';
        const name = token.name || 'Unknown Token';
        const balance = this.formatTokenBalance(token.balance, token.decimals);
        const tokenType = token.type || 'ERC-20';
        
        lines.push(`${index + 1}. **${symbol}** - ${name}`);
        lines.push(`   Balance: ${balance}`);
        lines.push(`   Type: ${tokenType}`);
        lines.push(`   Contract: ${token.address?.substring(0, 10)}...`);
      });
      
      if (tokens.length > 10) {
        lines.push(`   ... and ${tokens.length - 10} more tokens`);
      }
      lines.push('');
    }

    // Token transfer analysis if available
    const transferAnalysis = this.analyzeTokenTransfers(chainData);
    if (transferAnalysis.length > 0) {
      lines.push(`**💸 TOKEN TRANSFER ACTIVITY:**`);
      transferAnalysis.forEach(analysis => {
        lines.push(`• ${analysis}`);
      });
    }

    return lines.join('\n');
  }

  private generateActivityRanking(userMessage: string, toolCallsMade: any[]): string {
    const chainData = this.processToolCalls(toolCallsMade);
    const address = this.extractAddressFromMessage(userMessage);
    
    // Sort by activity score
    chainData.sort((a, b) => {
      const scoreA = a.txCount * 10 + Number(a.gasEth) * 1000;
      const scoreB = b.txCount * 10 + Number(b.gasEth) * 1000;
      return scoreB - scoreA;
    });

    const mostActive = chainData.find(chain => chain.txCount > 0);
    const activeChains = chainData.filter(chain => chain.txCount > 0);
    
    const lines: string[] = [];
    
    if (mostActive) {
      lines.push(`🏆 **MOST ACTIVE CHAIN: ${mostActive.name}**`);
      lines.push(`📊 ${mostActive.txCount} transactions, ${mostActive.gasEth} ETH gas spent`);
      if (mostActive.mostRecentTx) {
        const daysSince = Math.floor((Date.now() - mostActive.mostRecentTx.getTime()) / (1000 * 60 * 60 * 24));
        lines.push(`🕒 Last activity: ${daysSince === 0 ? 'Today' : daysSince + ' days ago'}`);
      }
      lines.push('');
    }

    if (activeChains.length > 1) {
      lines.push(`📊 **COMPLETE ACTIVITY RANKING:**`);
      activeChains.forEach((chain, index) => {
        const rank = index + 1;
        const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        const recency = chain.mostRecentTx ? 
          `${Math.floor((Date.now() - chain.mostRecentTx.getTime()) / (1000 * 60 * 60 * 24))}d ago` : 
          'Unknown';
        lines.push(`${emoji} **${chain.name}**`);
        lines.push(`    ${chain.txCount} txs • ${chain.gasEth} ETH gas • Last: ${recency}`);
      });
      lines.push('');
    }

    // Summary statistics
    const totalTxs = activeChains.reduce((sum, chain) => sum + chain.txCount, 0);
    const totalGas = activeChains.reduce((sum, chain) => sum + Number(chain.gasEth), 0);
    
    lines.push(`**📈 ACTIVITY SUMMARY:**`);
    lines.push(`• Total Transactions: ${totalTxs} across ${activeChains.length} chains`);
    lines.push(`• Total Gas Spent: ${totalGas.toFixed(6)} ETH`);
    if (activeChains.length > 0) {
      lines.push(`• Average per Active Chain: ${(totalTxs / activeChains.length).toFixed(1)} transactions`);
    }

    return lines.join('\n');
  }

  private generateTransactionHashAnalysis(userMessage: string, toolCallsMade: any[]): string {
    const txHash = this.extractTransactionHash(userMessage);
    const chainName = this.extractChainFromMessage(userMessage);
    
    const lines: string[] = [];
    lines.push(`🔍 **TRANSACTION ANALYSIS**`);
    lines.push(`📋 Hash: ${txHash}`);
    if (chainName) {
      lines.push(`🔗 Chain: ${chainName}`);
    }
    lines.push('');

    // Find transaction info call
    const txInfoCall = toolCallsMade.find(call => call.tool === 'get_transaction_info');
    if (!txInfoCall) {
      lines.push('❌ **No Transaction Data Available**');
      lines.push('Transaction information could not be retrieved.');
      return lines.join('\n');
    }

    const txData = txInfoCall.result?.data;
    if (!txData) {
      lines.push('❌ **Invalid Transaction**');
      lines.push('Transaction not found or invalid hash.');
      return lines.join('\n');
    }

    // Basic transaction info
    lines.push(`**📊 TRANSACTION DETAILS:**`);
    lines.push(`• Status: ${txData.status === 'ok' ? '✅ Success' : '❌ Failed'}`);
    lines.push(`• Block: ${txData.block_number}`);
    lines.push(`• From: ${txData.from}`);
    lines.push(`• To: ${txData.to}`);
    lines.push(`• Value: ${this.weiToEth(txData.value || '0')} ETH`);
    lines.push(`• Gas Used: ${txData.gas_used?.toLocaleString() || 'N/A'}`);
    lines.push(`• Gas Fee: ${this.weiToEth(txData.fee?.value || '0')} ETH`);
    lines.push(`• Timestamp: ${new Date(txData.timestamp).toLocaleString()}`);
    lines.push('');

    // Method call analysis
    if (txData.decoded_input) {
      lines.push(`**🔧 METHOD CALL:**`);
      lines.push(`• Function: ${txData.decoded_input.method_call || txData.method}`);
      
      if (txData.decoded_input.parameters && txData.decoded_input.parameters.length > 0) {
        lines.push(`• Parameters:`);
        txData.decoded_input.parameters.forEach((param: any, index: number) => {
          let displayValue = param.value;
          // Format common parameter types
          if (param.type === 'uint256' && displayValue.length > 10) {
            displayValue = `${displayValue} (${parseInt(displayValue).toLocaleString()})`;
          }
          lines.push(`  ${index + 1}. ${param.name} (${param.type}): ${displayValue}`);
        });
      }
      lines.push('');
    }

    // Token transfers analysis
    if (txData.token_transfers && txData.token_transfers.length > 0) {
      lines.push(`**💸 TOKEN TRANSFERS (${txData.token_transfers.length}):**`);
      
      txData.token_transfers.forEach((transfer: any, index: number) => {
        const token = transfer.token;
        const amount = this.formatTokenAmount(transfer.total?.value || '0', token.decimals);
        
        lines.push(`${index + 1}. **${token.symbol}** (${token.name})`);
        lines.push(`   • Amount: ${amount} ${token.symbol}`);
        lines.push(`   • From: ${transfer.from}`);
        lines.push(`   • To: ${transfer.to}`);
        lines.push(`   • Token Contract: ${token.address_hash}`);
        lines.push('');
      });
    }

    // Transaction types
    if (txData.transaction_types && txData.transaction_types.length > 0) {
      lines.push(`**🏷️ TRANSACTION TYPES:**`);
      txData.transaction_types.forEach((type: string) => {
        lines.push(`• ${type.replace('_', ' ').toUpperCase()}`);
      });
      lines.push('');
    }

    // Contract interaction analysis
    if (txData.method && txData.method !== 'transfer') {
      lines.push(`**🤖 CONTRACT INTERACTION:**`);
      lines.push(`• Contract: ${txData.to}`);
      lines.push(`• Method: ${txData.method}`);
      
      // Determine interaction type
      const method = txData.method.toLowerCase();
      if (method.includes('buy') || method.includes('sell') || method.includes('trade')) {
        lines.push(`• Type: 🏪 Trading/Exchange`);
      } else if (method.includes('stake') || method.includes('lock') || method.includes('deposit')) {
        lines.push(`• Type: 🔒 Staking/DeFi`);
      } else if (method.includes('approve')) {
        lines.push(`• Type: ✅ Token Approval`);
      } else if (method.includes('transfer')) {
        lines.push(`• Type: 💸 Token Transfer`);
      } else {
        lines.push(`• Type: 🔧 Smart Contract Call`);
      }
      lines.push('');
    }

    // Events/Logs summary
    if (txData.has_logs !== false || txData.token_transfers?.length > 0) {
      lines.push(`**📡 EVENTS EMITTED:**`);
      
      if (txData.token_transfers && txData.token_transfers.length > 0) {
        lines.push(`• ${txData.token_transfers.length} Token Transfer event(s)`);
      }
      
      // Estimate other events based on transaction type
      if (txData.method) {
        if (txData.method.includes('buy') || txData.method.includes('sell')) {
          lines.push(`• Trade execution event`);
        }
        if (txData.method.includes('approve')) {
          lines.push(`• Approval event`);
        }
      }
      
      lines.push(`• View full event logs on block explorer for complete details`);
      lines.push('');
    }

    // Transaction summary
    lines.push(`**📈 SUMMARY:**`);
    if (txData.decoded_input?.method_call?.includes('buyStock')) {
      const tokenTransfer = txData.token_transfers?.find((t: any) => t.to === txData.from);
      if (tokenTransfer) {
        const amount = this.formatTokenAmount(tokenTransfer.total?.value || '0', tokenTransfer.token.decimals);
        lines.push(`• Successfully purchased ${amount} ${tokenTransfer.token.symbol} tokens`);
      }
    } else if (txData.method === 'transfer' || txData.token_transfers?.length > 0) {
      lines.push(`• Token transfer transaction executed successfully`);
    } else {
      lines.push(`• Smart contract interaction completed successfully`);
    }
    
    lines.push(`• Gas efficiency: ${txData.gas_used && txData.gas_limit ? 
      ((txData.gas_used / txData.gas_limit) * 100).toFixed(1) + '% of gas limit used' : 'N/A'}`);

    return lines.join('\n');
  }

  // Helper methods
  private extractTransactionHash(message: string): string {
    const hashMatch = message.match(/0x[a-fA-F0-9]{64}/);
    return hashMatch ? hashMatch[0] : '';
  }

  private extractChainFromMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('ethereum') || lowerMessage.includes('mainnet')) return 'Ethereum Mainnet';
    if (lowerMessage.includes('sepolia') && !lowerMessage.includes('base')) return 'Sepolia Testnet';
    if (lowerMessage.includes('base sepolia') || lowerMessage.includes('base')) return 'Base Sepolia';
    if (lowerMessage.includes('optimism')) return 'Optimism';
    if (lowerMessage.includes('arbitrum')) return 'Arbitrum One';
    return '';
  }

  private formatTokenAmount(amount: string, decimals: string): string {
    try {
      const decimalPlaces = parseInt(decimals || '18');
      const amountBigInt = BigInt(amount);
      const divisor = BigInt(10) ** BigInt(decimalPlaces);
      
      const whole = amountBigInt / divisor;
      const remainder = amountBigInt % divisor;
      
      if (remainder === BigInt(0)) {
        return whole.toString();
      }
      
      const fractional = remainder.toString().padStart(decimalPlaces, '0');
      const trimmedFractional = fractional.replace(/0+$/, '').slice(0, 6);
      
      return trimmedFractional ? `${whole}.${trimmedFractional}` : whole.toString();
    } catch {
      return amount;
    }
  }

  private processToolCalls(toolCallsMade: any[]): ChainData[] {
    const chainData: ChainData[] = [];
    const chainNames: Record<string, string> = {
      '1': 'Ethereum Mainnet',
      '11155111': 'Sepolia Testnet',
      '84532': 'Base Sepolia',
      '10': 'Optimism',
      '42161': 'Arbitrum One'
    };

    const transactionCalls = toolCallsMade.filter(call => call.tool === 'get_transactions_by_address');
    
    for (const call of transactionCalls) {
      const chainId = String(call.args?.chain_id ?? 'unknown');
      const name = chainNames[chainId] || `Chain ${chainId}`;
      const transactions = call.result?.data || [];
      
      let chainGasWei = BigInt(0);
      const transactionTypes: Record<string, number> = {};
      const interactions: Record<string, { count: number; type: string }> = {};
      let mostRecentTx: Date | undefined;
      let oldestTx: Date | undefined;

      for (const tx of transactions) {
        if (tx.fee) {
          try {
            chainGasWei += BigInt(tx.fee);
          } catch (e) {
            // Skip invalid fee values
          }
        }

        const txType = tx.method || tx.type || 'transfer';
        transactionTypes[txType] = (transactionTypes[txType] || 0) + 1;

        const toAddress = tx.to;
        if (toAddress) {
          if (!interactions[toAddress]) {
            interactions[toAddress] = { count: 0, type: txType };
          }
          interactions[toAddress].count++;
        }

        if (tx.timestamp) {
          const txDate = new Date(tx.timestamp);
          if (!mostRecentTx || txDate > mostRecentTx) {
            mostRecentTx = txDate;
          }
          if (!oldestTx || txDate < oldestTx) {
            oldestTx = txDate;
          }
        }
      }

      const topInteractions = Object.entries(interactions)
        .map(([address, data]) => ({ address, count: data.count, type: data.type }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      chainData.push({
        chainId,
        name,
        txCount: transactions.length,
        gasWei: chainGasWei,
        gasEth: this.weiToEth(chainGasWei.toString()),
        transactions,
        mostRecentTx,
        oldestTx,
        transactionTypes,
        interactions: topInteractions
      });
    }

    return chainData;
  }

  private identifyDeFiProtocols(chainData: ChainData[]): any[] {
    const protocols: any[] = [];
    
    // Known DeFi contract patterns and methods
    const defiPatterns = {
      'Vault/Trading': ['buyStock', 'sellStock', 'listAndDepositInitialStock'],
      'DEX/AMM': ['swap', 'addLiquidity', 'removeLiquidity', 'swapExactTokensForTokens'],
      'Lending': ['supply', 'borrow', 'repay', 'withdraw', 'claim'],
      'Staking': ['stake', 'unstake', 'createLock', 'withdrawAll'],
      'Bridge': ['execute', 'setConfig', 'setEnforcedOptions'],
      'Token': ['approve', 'transfer', 'transferFrom']
    };

    for (const chain of chainData) {
      for (const interaction of chain.interactions) {
        for (const [category, methods] of Object.entries(defiPatterns)) {
          if (methods.includes(interaction.type)) {
            protocols.push({
              name: this.identifyProtocolName(interaction.address, interaction.type),
              category,
              address: interaction.address,
              count: interaction.count,
              methods: [interaction.type],
              chainName: chain.name,
              lastUsed: chain.mostRecentTx?.toLocaleDateString() || 'Unknown'
            });
            break;
          }
        }
      }
    }

    return protocols;
  }

  private identifyProtocolName(address: string, method: string): string {
    // Simple protocol identification based on address patterns or methods
    if (method.includes('Stock')) return 'Vault Trading Contract';
    if (method.includes('Config') || method.includes('execute')) return 'LayerZero Bridge';
    if (method.includes('Lock') || method.includes('withdraw')) return 'Staking Protocol';
    return `Contract ${address.substring(0, 8)}...`;
  }

  private groupProtocolsByChain(protocols: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    for (const protocol of protocols) {
      if (!grouped[protocol.chainName]) {
        grouped[protocol.chainName] = [];
      }
      grouped[protocol.chainName].push(protocol);
    }
    return grouped;
  }

  private extractAddressFromMessage(message: string): string {
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    return addressMatch ? addressMatch[0] : '';
  }

  private extractSpecificChains(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const chains: string[] = [];
    
    if (lowerMessage.includes('ethereum') || lowerMessage.includes('mainnet')) chains.push('1');
    if (lowerMessage.includes('sepolia') && !lowerMessage.includes('base')) chains.push('11155111');
    if (lowerMessage.includes('base sepolia') || lowerMessage.includes('base')) chains.push('84532');
    if (lowerMessage.includes('optimism')) chains.push('10');
    if (lowerMessage.includes('arbitrum')) chains.push('42161');
    
    return chains;
  }

  private getChainName(chainId: string): string {
    const chainNames: Record<string, string> = {
      '1': 'Ethereum Mainnet',
      '11155111': 'Sepolia Testnet',
      '84532': 'Base Sepolia',
      '10': 'Optimism',
      '42161': 'Arbitrum One'
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  }

  private weiToEth(weiString: string): string {
    try {
      const len = weiString.length;
      if (len === 0 || weiString === '0') return '0';
      const whole = len > 18 ? weiString.slice(0, len - 18) : '0';
      const frac = weiString.padStart(19, '0').slice(-18).slice(0, 6).replace(/0+$/, '') || '0';
      return frac === '0' ? whole : `${whole}.${frac}`;
    } catch {
      return '0';
    }
  }

  private formatTokenBalance(balance: string, decimals: string): string {
    try {
      const decimalPlaces = parseInt(decimals || '18');
      const balanceLen = balance.length;
      if (balanceLen <= decimalPlaces) {
        return `0.${balance.padStart(decimalPlaces, '0').slice(0, 6)}`;
      } else {
        const whole = balance.slice(0, balanceLen - decimalPlaces);
        const frac = balance.slice(balanceLen - decimalPlaces, balanceLen - decimalPlaces + 6);
        return `${whole}.${frac}`;
      }
    } catch {
      return balance;
    }
  }

  private analyzeTokenTransfers(chainData: ChainData[]): string[] {
    const analysis: string[] = [];
    
    for (const chain of chainData) {
      const transferCount = chain.transactionTypes['transfer'] || 0;
      const approveCount = chain.transactionTypes['approve'] || 0;
      
      if (transferCount > 0) {
        analysis.push(`${chain.name}: ${transferCount} token transfers`);
      }
      if (approveCount > 0) {
        analysis.push(`${chain.name}: ${approveCount} token approvals`);
      }
    }
    
    return analysis;
  }

  private generateGasAnalysis(userMessage: string, toolCallsMade: any[]): string {
    const chainData = this.processToolCalls(toolCallsMade);
    const address = this.extractAddressFromMessage(userMessage);
    
    const lines: string[] = [];
    lines.push(`⛽ **GAS SPEND ANALYSIS**`);
    lines.push(`📊 Address: ${address}`);
    lines.push('');

    if (chainData.length === 0) {
      lines.push('❌ **No Transaction Data Available**');
      return lines.join('\n');
    }

    // Calculate totals
    let totalGasAcrossChains = 0;
    let totalTransactions = 0;
    const gasDataByChain: Array<{name: string, gasEth: number, txCount: number, avgGas: number}> = [];

    for (const chain of chainData) {
      const gasEth = Number(chain.gasEth);
      totalGasAcrossChains += gasEth;
      totalTransactions += chain.txCount;
      
      if (chain.txCount > 0) {
        gasDataByChain.push({
          name: chain.name,
          gasEth: gasEth,
          txCount: chain.txCount,
          avgGas: gasEth / chain.txCount
        });
      }
    }

    // Sort by gas spent
    gasDataByChain.sort((a, b) => b.gasEth - a.gasEth);

    lines.push(`**⛽ GAS SPEND SUMMARY:**`);
    lines.push(`• Total Gas Across All Chains: ${totalGasAcrossChains.toFixed(6)} ETH`);
    lines.push(`• Total Transactions: ${totalTransactions}`);
    lines.push(`• Average Gas per Transaction: ${totalTransactions > 0 ? (totalGasAcrossChains / totalTransactions).toFixed(6) : '0'} ETH`);
    lines.push('');

    lines.push(`**💰 GAS EFFICIENCY BY CHAIN:**`);
    gasDataByChain.forEach((data, index) => {
      const rank = index + 1;
      const percentage = ((data.gasEth / totalGasAcrossChains) * 100).toFixed(1);
      lines.push(`${rank}. **${data.name}**`);
      lines.push(`   • Total: ${data.gasEth.toFixed(6)} ETH (${percentage}% of total)`);
      lines.push(`   • Average: ${data.avgGas.toFixed(6)} ETH per transaction`);
      lines.push(`   • Transactions: ${data.txCount}`);
    });

    return lines.join('\n');
  }

  private generateComprehensiveReport(userMessage: string, toolCallsMade: any[]): string {
    const address = this.extractAddressFromMessage(userMessage);
    const chainData = this.processToolCalls(toolCallsMade);
    
    const lines: string[] = [];
    lines.push(`📋 **COMPREHENSIVE BLOCKCHAIN REPORT**`);
    lines.push(`🔍 Address: ${address}`);
    lines.push(`📅 Generated: ${new Date().toLocaleDateString()}`);
    lines.push('');

    // Executive Summary
    const totalTxs = chainData.reduce((sum, chain) => sum + chain.txCount, 0);
    const totalGas = chainData.reduce((sum, chain) => sum + Number(chain.gasEth), 0);
    const activeChains = chainData.filter(chain => chain.txCount > 0).length;

    lines.push(`**📊 EXECUTIVE SUMMARY:**`);
    lines.push(`• Total Transactions: ${totalTxs} across ${activeChains} chains`);
    lines.push(`• Total Gas Spent: ${totalGas.toFixed(6)} ETH`);
    lines.push(`• Chain Coverage: ${activeChains}/5 major chains`);
    lines.push('');

    // Per-chain breakdown
    lines.push(`**🔗 CHAIN-BY-CHAIN BREAKDOWN:**`);
    for (const chain of chainData) {
      lines.push(`\n**${chain.name}:**`);
      if (chain.txCount === 0) {
        lines.push(`   • Status: No activity detected`);
        continue;
      }
      
      lines.push(`   • Transactions: ${chain.txCount}`);
      lines.push(`   • Gas Spent: ${chain.gasEth} ETH`);
      lines.push(`   • Last Activity: ${chain.mostRecentTx?.toLocaleDateString() || 'Unknown'}`);
      
      const topActivity = Object.entries(chain.transactionTypes).sort((a, b) => b[1] - a[1])[0];
      if (topActivity) {
        lines.push(`   • Primary Activity: ${topActivity[0]} (${topActivity[1]} transactions)`);
      }
    }

    return lines.join('\n');
  }

  private generateRiskAssessment(userMessage: string, toolCallsMade: any[]): string {
    const address = this.extractAddressFromMessage(userMessage);
    const chainData = this.processToolCalls(toolCallsMade);
    
    const lines: string[] = [];
    lines.push(`🔒 **RISK ASSESSMENT REPORT**`);
    lines.push(`📊 Address: ${address}`);
    lines.push('');

    // Analyze risk factors
    const riskFactors: string[] = [];
    const safetyFactors: string[] = [];
    
    let totalValue = 0;
    let suspiciousActivity = 0;
    
    for (const chain of chainData) {
      // Check for high-frequency trading (potential bot)
      if (chain.txCount > 50) {
        riskFactors.push(`High transaction volume on ${chain.name} (${chain.txCount} txs)`);
      }
      
      // Check for diverse activity
      const activityTypes = Object.keys(chain.transactionTypes).length;
      if (activityTypes > 3) {
        safetyFactors.push(`Diverse activity on ${chain.name} (${activityTypes} types)`);
      }
      
      // Check for recent activity
      if (chain.mostRecentTx && (Date.now() - chain.mostRecentTx.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        safetyFactors.push(`Recent activity on ${chain.name}`);
      }
    }

    // Overall risk level
    let riskLevel = 'LOW';
    if (riskFactors.length > safetyFactors.length) {
      riskLevel = 'MEDIUM';
    }
    if (riskFactors.length > 3) {
      riskLevel = 'HIGH';
    }

    lines.push(`**🚨 RISK LEVEL: ${riskLevel}**`);
    lines.push('');

    if (riskFactors.length > 0) {
      lines.push(`**⚠️ RISK FACTORS:**`);
      riskFactors.forEach(factor => lines.push(`• ${factor}`));
      lines.push('');
    }

    if (safetyFactors.length > 0) {
      lines.push(`**✅ SAFETY FACTORS:**`);
      safetyFactors.forEach(factor => lines.push(`• ${factor}`));
      lines.push('');
    }

    lines.push(`**📋 RECOMMENDATIONS:**`);
    if (riskLevel === 'HIGH') {
      lines.push(`• Exercise extreme caution when interacting with this address`);
      lines.push(`• Consider additional verification before transactions`);
    } else if (riskLevel === 'MEDIUM') {
      lines.push(`• Standard precautions recommended`);
      lines.push(`• Monitor transaction patterns`);
    } else {
      lines.push(`• Address appears to have normal activity patterns`);
      lines.push(`• Standard due diligence recommended`);
    }

    return lines.join('\n');
  }

  private generateContractAnalysis(userMessage: string, toolCallsMade: any[]): string {
    const address = this.extractAddressFromMessage(userMessage);
    
    const lines: string[] = [];
    lines.push(`🔍 **COMPREHENSIVE CONTRACT ANALYSIS**`);
    lines.push(`📊 Contract: ${address}`);
    lines.push('');

    const addressInfoCall = toolCallsMade.find(call => call.tool === 'get_address_info');
    const transactionCall = toolCallsMade.find(call => call.tool === 'get_transactions_by_address');
    
    if (!addressInfoCall) {
      lines.push('❌ **Insufficient Data**');
      lines.push('No contract information available. Please ensure address info is fetched.');
      return lines.join('\n');
    }

    const basic = addressInfoCall.result?.data?.basic_info || {};
    const chainId = addressInfoCall.args?.chain_id;
    const chainName = this.getChainName(chainId);
    
    // Contract Overview
    lines.push(`**📋 CONTRACT OVERVIEW:**`);
    lines.push(`• Chain: ${chainName}`);
    lines.push(`• Name: ${basic.name || 'Unknown'}`);
    lines.push(`• Type: ${basic.proxy_type ? `${basic.proxy_type.toUpperCase()} Proxy` : 'Standard Contract'}`);
    lines.push(`• Verified: ${basic.is_verified ? '✅ Yes (Source code available)' : '❌ No'}`);
    lines.push(`• Scam Flag: ${basic.is_scam ? '🚨 YES - DO NOT INTERACT' : '✅ No'}`);
    lines.push(`• Reputation: ${basic.reputation || 'Unknown'}`);
    
    if (basic.creator_address_hash) {
      lines.push(`• Creator: ${basic.creator_address_hash}`);
    }
    
    if (basic.creation_transaction_hash) {
      lines.push(`• Creation TX: ${basic.creation_transaction_hash}`);
    }

    // Implementation details for proxy contracts
    if (basic.implementations && basic.implementations.length > 0) {
      lines.push('');
      lines.push(`**🔗 PROXY IMPLEMENTATION:**`);
      basic.implementations.forEach((impl: any, index: number) => {
        lines.push(`${index + 1}. **${impl.name || 'Unknown'}**`);
        lines.push(`   Address: ${impl.address_hash}`);
      });
    }

    lines.push('');
    lines.push(`**📊 CONTRACT ACTIVITY:**`);
    lines.push(`• Has Logs/Events: ${basic.has_logs ? '✅ Yes' : '❌ No'}`);
    lines.push(`• Has Token Transfers: ${basic.has_token_transfers ? '✅ Yes' : '❌ No'}`);
    lines.push(`• Has Token Holdings: ${basic.has_tokens ? '✅ Yes' : '❌ No'}`);
    lines.push(`• Balance: ${this.weiToEth(basic.coin_balance || '0')} ETH`);

    // Recent Transaction Analysis
    if (transactionCall?.result?.data && Array.isArray(transactionCall.result.data)) {
      const transactions = transactionCall.result.data;
      lines.push('');
      lines.push(`**🔄 RECENT TRANSACTION ANALYSIS:**`);
      lines.push(`• Total Recent Transactions: ${transactions.length}`);
      
      if (transactions.length > 0) {
        const mostRecent = transactions[0];
        lines.push(`• Most Recent Transaction:`);
        lines.push(`  - Hash: ${mostRecent.hash}`);
        lines.push(`  - Timestamp: ${new Date(mostRecent.timestamp).toLocaleString()}`);
        lines.push(`  - From: ${mostRecent.from}`);
        lines.push(`  - To: ${mostRecent.to}`);
        lines.push(`  - Method: ${mostRecent.method || 'Transfer'}`);
        lines.push(`  - Value: ${this.weiToEth(mostRecent.value || '0')} ETH`);
        lines.push(`  - Gas Fee: ${this.weiToEth(mostRecent.fee || '0')} ETH`);

        // Transaction types breakdown
        const methodCounts: Record<string, number> = {};
        transactions.forEach((tx: any) => {
          const method = tx.method || 'transfer';
          methodCounts[method] = (methodCounts[method] || 0) + 1;
        });

        lines.push('');
        lines.push(`**🔧 RECENT ACTIVITY BREAKDOWN:**`);
        Object.entries(methodCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([method, count]) => {
            const percentage = ((count / transactions.length) * 100).toFixed(1);
            lines.push(`• ${method}: ${count} transactions (${percentage}%)`);
          });
      }
    } else {
      lines.push('');
      lines.push(`**🔄 TRANSACTION DATA:**`);
      lines.push(`❌ No recent transaction data available. The system should fetch transaction history for complete analysis.`);
    }

    // Risk Assessment
    lines.push('');
    lines.push(`**🛡️ SECURITY ASSESSMENT:**`);
    
    let riskLevel = 'LOW';
    const riskFactors: string[] = [];
    const safetyFactors: string[] = [];
    
    if (basic.is_scam) {
      riskLevel = 'HIGH';
      riskFactors.push('🚨 Flagged as scam contract');
    } else {
      safetyFactors.push('✅ No scam flags detected');
    }
    
    if (basic.is_verified) {
      safetyFactors.push('✅ Contract source code is verified');
    } else {
      riskFactors.push('⚠️ Contract is not verified');
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    }
    
    if (basic.reputation === 'ok') {
      safetyFactors.push('✅ Good reputation score');
    } else if (basic.reputation === 'warning') {
      riskFactors.push('⚠️ Reputation warning present');
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    }

    if (basic.has_logs) {
      safetyFactors.push('✅ Contract emits events (transparent)');
    }

    lines.push(`**Risk Level: ${riskLevel}**`);
    
    if (riskFactors.length > 0) {
      lines.push('');
      lines.push(`**⚠️ Risk Factors:**`);
      riskFactors.forEach(factor => lines.push(`${factor}`));
    }
    
    if (safetyFactors.length > 0) {
      lines.push('');
      lines.push(`**✅ Safety Factors:**`);
      safetyFactors.forEach(factor => lines.push(`${factor}`));
    }

    // Recommendations
    lines.push('');
    lines.push(`**💡 RECOMMENDATIONS:**`);
    
    if (riskLevel === 'HIGH') {
      lines.push(`🚨 **DO NOT INTERACT** - High risk contract`);
    } else if (riskLevel === 'MEDIUM') {
      lines.push(`⚠️ **PROCEED WITH CAUTION** - Moderate risk`);
      lines.push(`• Verify contract functionality before interaction`);
      lines.push(`• Start with small test transactions`);
    } else {
      lines.push(`✅ **APPEARS SAFE** - Low risk for interaction`);
    }
    
    if (basic.is_verified) {
      lines.push(`• Review verified source code before interacting`);
    }
    
    lines.push(`• Monitor transaction patterns for unusual activity`);
    lines.push(`• Check recent events/logs for contract behavior`);
    
    if (basic.proxy_type) {
      lines.push(`• Note: This is a proxy contract - implementation can be upgraded`);
    }

    // Instructions for getting more data
    if (!transactionCall) {
      lines.push('');
      lines.push(`**📌 NOTE:**`);
      lines.push(`For complete analysis including recent transactions and events, ensure the system fetches:`);
      lines.push(`• Recent transaction history`);
      lines.push(`• Event logs and emissions`);
      lines.push(`• Token transfer activity`);
    }
    
    return lines.join('\n');
  }

  private generatePortfolioDistribution(userMessage: string, toolCallsMade: any[]): string {
    return this.generateTokenAnalysis(userMessage, toolCallsMade);
  }

  private generateSpecificChainAnalysis(userMessage: string, toolCallsMade: any[]): string {
    const requestedChains = this.extractSpecificChains(userMessage);
    const chainName = requestedChains.length > 0 ? this.getChainName(requestedChains[0]) : 'Unknown';
    const address = this.extractAddressFromMessage(userMessage);
    
    const lines: string[] = [];
    lines.push(`🔗 **${chainName.toUpperCase()} ANALYSIS**`);
    lines.push(`📊 Address: ${address}`);
    lines.push('');

    const chainData = this.processToolCalls(toolCallsMade);
    const targetChain = chainData.find(chain => chain.name === chainName);
    
    if (!targetChain || targetChain.txCount === 0) {
      lines.push('❌ **No Activity Found**');
      lines.push(`No transactions detected on ${chainName}.`);
      return lines.join('\n');
    }

    lines.push(`**📊 ACTIVITY OVERVIEW:**`);
    lines.push(`• Transactions: ${targetChain.txCount}`);
    lines.push(`• Gas Spent: ${targetChain.gasEth} ETH`);
    lines.push(`• Average Gas/TX: ${(Number(targetChain.gasEth) / targetChain.txCount).toFixed(6)} ETH`);
    
    if (targetChain.mostRecentTx) {
      const daysSince = Math.floor((Date.now() - targetChain.mostRecentTx.getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`• Last Activity: ${daysSince === 0 ? 'Today' : daysSince + ' days ago'}`);
    }

    lines.push('');
    lines.push(`**🔧 TRANSACTION TYPES:**`);
    Object.entries(targetChain.transactionTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const percentage = ((count / targetChain.txCount) * 100).toFixed(1);
        lines.push(`• ${type}: ${count} (${percentage}%)`);
      });

    return lines.join('\n');
  }

  private generateGenericAnalysis(userMessage: string, toolCallsMade: any[]): string {
    const address = this.extractAddressFromMessage(userMessage);
    const chainData = this.processToolCalls(toolCallsMade);
    
    const lines: string[] = [];
    lines.push(`📊 **BLOCKCHAIN ANALYSIS**`);
    lines.push(`🔍 Address: ${address}`);
    lines.push('');

    if (chainData.length === 0) {
      lines.push('❌ **No Data Available**');
      lines.push('No transaction or address data found.');
      return lines.join('\n');
    }

    const totalTxs = chainData.reduce((sum, chain) => sum + chain.txCount, 0);
    const totalGas = chainData.reduce((sum, chain) => sum + Number(chain.gasEth), 0);
    const activeChains = chainData.filter(chain => chain.txCount > 0);

    lines.push(`**📈 SUMMARY:**`);
    lines.push(`• Total Transactions: ${totalTxs}`);
    lines.push(`• Total Gas Spent: ${totalGas.toFixed(6)} ETH`);
    lines.push(`• Active Chains: ${activeChains.length}`);

    if (activeChains.length > 0) {
      const mostActive = activeChains.reduce((prev, current) => 
        (prev.txCount > current.txCount) ? prev : current
      );
      lines.push(`• Most Active Chain: ${mostActive.name} (${mostActive.txCount} txs)`);
    }

    return lines.join('\n');
  }
}