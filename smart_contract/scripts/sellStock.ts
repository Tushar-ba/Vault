import { ethers } from "ethers";

async function main() {
  // Contract addresses
  const VAULT_ADDRESS = "0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b";
  const TOKEN_ADDRESS = "0x09572cED4772527f28c6Ea8E62B08C973fc47671";
  const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"; // PYUSD on Sepolia
  
  // Parameters
  const SELL_AMOUNT = 10; // Sell 10 stocks (in whole units)

  console.log("Starting stock sell process...");
  console.log("Vault Address:", VAULT_ADDRESS);
  console.log("Token Address:", TOKEN_ADDRESS);
  console.log("PYUSD Address:", PYUSD_ADDRESS);
  console.log("Amount to sell:", SELL_AMOUNT, "tokens");

  // Get provider and signer
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);
  console.log("Seller address:", signer.address);

  // Contract ABIs
  const vaultAbi = [
    "function sellStock(address _token, uint256 _amountInWholeTokens) public",
    "function getPrice(address _token) public view returns (uint256)",
    "function stockList(address) public view returns (string memory name, uint256 pricingFactor, uint256 currentSupply, bool isSupported)"
  ];

  const pyusdAbi = [
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public pure returns (uint8)"
  ];

  const tokenAbi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)",
    "function whitelist(address _address) public",
    "function whitelisted(address) public view returns (bool)"
  ];

  // Get contract instances
  const vault = new ethers.Contract(VAULT_ADDRESS, vaultAbi, signer);
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, pyusdAbi, signer);
  const token = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, signer);

  // Step 1: Check stock info and current price
  console.log("\n📊 Step 1: Checking stock info...");
  const stockInfo = await vault.stockList(TOKEN_ADDRESS);
  console.log("Stock Name:", stockInfo.name);
  console.log("Is Supported:", stockInfo.isSupported);
  
  const tokenDecimals = await token.decimals();
  const currentSupply = ethers.formatUnits(stockInfo.currentSupply, tokenDecimals);
  console.log("Current Supply in Vault:", currentSupply, "tokens");

  if (!stockInfo.isSupported) {
    console.error("❌ Stock is not supported!");
    return;
  }

  const currentPrice = await vault.getPrice(TOKEN_ADDRESS);
  const priceInPyusd = ethers.formatUnits(currentPrice, 6); // PYUSD has 6 decimals
  console.log("Current Price:", priceInPyusd, "PYUSD per token");

  // Calculate expected payout
  const expectedPayout = currentPrice * BigInt(SELL_AMOUNT);
  const expectedPayoutFormatted = ethers.formatUnits(expectedPayout, 6);
  console.log("Expected Payout:", expectedPayoutFormatted, "PYUSD");

  // Step 2: Check seller's token balance
  console.log("\n📦 Step 2: Checking your token balance...");
  const sellerTokenBalance = await token.balanceOf(signer.address);
  const sellerTokenBalanceFormatted = ethers.formatUnits(sellerTokenBalance, tokenDecimals);
  console.log("Your Token Balance:", sellerTokenBalanceFormatted);

  const requiredAmount = ethers.parseUnits(SELL_AMOUNT.toString(), tokenDecimals);
  if (sellerTokenBalance < requiredAmount) {
    console.error("❌ Insufficient token balance to sell!");
    console.error(`Need ${SELL_AMOUNT} tokens, but have ${sellerTokenBalanceFormatted}`);
    return;
  }

  // Step 3: Check if vault has enough PYUSD to pay out
  console.log("\n💰 Step 3: Checking vault's PYUSD balance...");
  const vaultPyusdBalance = await pyusd.balanceOf(VAULT_ADDRESS);
  const vaultPyusdBalanceFormatted = ethers.formatUnits(vaultPyusdBalance, 6);
  console.log("Vault PYUSD Balance:", vaultPyusdBalanceFormatted, "PYUSD");

  if (vaultPyusdBalance < expectedPayout) {
    console.error("❌ Vault has insufficient PYUSD for payout!");
    console.error(`Need ${expectedPayoutFormatted} PYUSD, but vault has ${vaultPyusdBalanceFormatted} PYUSD`);
    return;
  }

  // Step 4: Check and handle whitelisting (if needed)
  console.log("\n🔐 Step 4: Checking whitelist status...");
  const isSellerWhitelisted = await token.whitelisted(signer.address);
  const isVaultWhitelisted = await token.whitelisted(VAULT_ADDRESS);
  
  console.log("Seller whitelisted:", isSellerWhitelisted);
  console.log("Vault whitelisted:", isVaultWhitelisted);
  
  if (!isSellerWhitelisted) {
    console.log("Whitelisting seller...");
    const whitelistTx = await token.whitelist(signer.address);
    await whitelistTx.wait();
    console.log("✅ Seller whitelisted!");
  }
  
  if (!isVaultWhitelisted) {
    console.log("Whitelisting vault...");
    const whitelistTx = await token.whitelist(VAULT_ADDRESS);
    await whitelistTx.wait();
    console.log("✅ Vault whitelisted!");
  }

  // Step 5: Check balances before sale
  console.log("\n📊 Step 5: Balances before sale...");
  const pyusdBalanceBefore = await pyusd.balanceOf(signer.address);
  console.log("Your PYUSD balance before:", ethers.formatUnits(pyusdBalanceBefore, 6), "PYUSD");
  console.log("Your Token balance before:", sellerTokenBalanceFormatted);

  // Step 6: Approve vault to spend tokens
  console.log("\n📝 Step 6: Approving vault to spend tokens...");
  const approveTx = await token.approve(VAULT_ADDRESS, requiredAmount);
  console.log("Approval transaction hash:", approveTx.hash);
  await approveTx.wait();
  console.log("✅ Approval confirmed!");

  // Step 7: Sell stock
  console.log("\n💸 Step 7: Selling stock...");
  const sellTx = await vault.sellStock(TOKEN_ADDRESS, SELL_AMOUNT);
  console.log("Sell transaction hash:", sellTx.hash);
  await sellTx.wait();
  console.log("✅ Stock sold successfully!");

  // Step 8: Verify sale
  console.log("\n✅ Step 8: Verifying sale...");
  const tokenBalanceAfter = await token.balanceOf(signer.address);
  const pyusdBalanceAfter = await pyusd.balanceOf(signer.address);
  
  console.log("Your Token balance after:", ethers.formatUnits(tokenBalanceAfter, tokenDecimals));
  console.log("Your PYUSD balance after:", ethers.formatUnits(pyusdBalanceAfter, 6), "PYUSD");
  
  const pyusdReceived = pyusdBalanceAfter - pyusdBalanceBefore;
  console.log("PYUSD received:", ethers.formatUnits(pyusdReceived, 6), "PYUSD");

  // Check new price
  const newPrice = await vault.getPrice(TOKEN_ADDRESS);
  const newPriceInPyusd = ethers.formatUnits(newPrice, 6);
  console.log("New Price:", newPriceInPyusd, "PYUSD per token");
  console.log("Price change:", newPriceInPyusd < priceInPyusd ? "📉 Decreased" : "📈 Increased");

  const stockInfoAfter = await vault.stockList(TOKEN_ADDRESS);
  const newSupply = ethers.formatUnits(stockInfoAfter.currentSupply, tokenDecimals);
  console.log("New Supply in Vault:", newSupply, "tokens");

  console.log("\n🎉 Stock sale completed successfully!");
  console.log(`You sold ${SELL_AMOUNT} ${stockInfo.name} for ${ethers.formatUnits(pyusdReceived, 6)} PYUSD`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error selling stock:", error);
    process.exit(1);
  });
