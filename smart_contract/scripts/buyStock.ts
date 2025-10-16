import { ethers } from "ethers";

async function main() {
  // Contract addresses
  const VAULT_ADDRESS = "0xc18c0Ab620F81f680819897885D585EdD44E5148";
  const TOKEN_ADDRESS = "0xE6776770B7E0dA454c498634aD3813C71C8B9674";
  const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"; // PYUSD on Sepolia
  
  // Parameters
  const BUY_AMOUNT = 10; // Buy 10 stocks (in whole units)

  console.log("Starting stock purchase process...");
  console.log("Vault Address:", VAULT_ADDRESS);
  console.log("Token Address:", TOKEN_ADDRESS);
  console.log("PYUSD Address:", PYUSD_ADDRESS);
  console.log("Amount to buy:", BUY_AMOUNT, "tokens");

  // Get provider and signer
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);
  console.log("Buyer address:", signer.address);

  // Contract ABIs
  const vaultAbi = [
    "function buyStock(address _token, uint256 _amountInWholeTokens) public",
    "function getPrice(address _token) public view returns (uint256)",
    "function stockList(address) public view returns (string memory name, uint256 pricingFactor, uint256 currentSupply, bool isSupported)"
  ];

  const pyusdAbi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public pure returns (uint8)"
  ];

  const tokenAbi = [
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)"
  ];

  // Get contract instances
  const vault = new ethers.Contract(VAULT_ADDRESS, vaultAbi, signer);
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, pyusdAbi, signer);
  const token = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, signer);

  // Step 1: Check stock availability and price
  console.log("\n📊 Step 1: Checking stock info...");
  const stockInfo = await vault.stockList(TOKEN_ADDRESS);
  console.log("Stock Name:", stockInfo.name);
  console.log("Is Supported:", stockInfo.isSupported);
  
  const tokenDecimals = await token.decimals();
  const currentSupply = ethers.formatUnits(stockInfo.currentSupply, tokenDecimals);
  console.log("Current Supply:", currentSupply, "tokens");

  if (!stockInfo.isSupported) {
    console.error("❌ Stock is not supported!");
    return;
  }

  const currentPrice = await vault.getPrice(TOKEN_ADDRESS);
  const priceInPyusd = ethers.formatUnits(currentPrice, 6); // PYUSD has 6 decimals
  console.log("Current Price:", priceInPyusd, "PYUSD per token");

  // Calculate total cost
  const totalCost = currentPrice * BigInt(BUY_AMOUNT);
  const totalCostFormatted = ethers.formatUnits(totalCost, 6);
  console.log("Total Cost:", totalCostFormatted, "PYUSD");

  // Step 2: Check PYUSD balance
  console.log("\n💰 Step 2: Checking PYUSD balance...");
  const pyusdBalance = await pyusd.balanceOf(signer.address);
  const pyusdBalanceFormatted = ethers.formatUnits(pyusdBalance, 6);
  console.log("PYUSD Balance:", pyusdBalanceFormatted, "PYUSD");

  if (pyusdBalance < totalCost) {
    console.error("❌ Insufficient PYUSD balance!");
    console.error(`Need ${totalCostFormatted} PYUSD, but have ${pyusdBalanceFormatted} PYUSD`);
    return;
  }

  // Step 3: Check token balance before purchase
  console.log("\n📦 Step 3: Checking token balance before purchase...");
  const tokenBalanceBefore = await token.balanceOf(signer.address);
  console.log("Token balance before:", ethers.formatUnits(tokenBalanceBefore, tokenDecimals));

  // Step 4: Approve PYUSD spending
  console.log("\n📝 Step 4: Approving PYUSD spending...");
  const approveTx = await pyusd.approve(VAULT_ADDRESS, totalCost);
  console.log("Approval transaction hash:", approveTx.hash);
  await approveTx.wait();
  console.log("✅ Approval confirmed!");

  // Step 5: Buy stock
  console.log("\n🛒 Step 5: Buying stock...");
  const buyTx = await vault.buyStock(TOKEN_ADDRESS, BUY_AMOUNT);
  console.log("Buy transaction hash:", buyTx.hash);
  await buyTx.wait();
  console.log("✅ Stock purchased successfully!");

  // Step 6: Verify purchase
  console.log("\n✅ Step 6: Verifying purchase...");
  const tokenBalanceAfter = await token.balanceOf(signer.address);
  console.log("Token balance after:", ethers.formatUnits(tokenBalanceAfter, tokenDecimals));
  
  const pyusdBalanceAfter = await pyusd.balanceOf(signer.address);
  console.log("PYUSD balance after:", ethers.formatUnits(pyusdBalanceAfter, 6), "PYUSD");

  // Check new price
  const newPrice = await vault.getPrice(TOKEN_ADDRESS);
  const newPriceInPyusd = ethers.formatUnits(newPrice, 6);
  console.log("New Price:", newPriceInPyusd, "PYUSD per token");
  console.log("Price change:", newPriceInPyusd > priceInPyusd ? "📈 Increased" : "📉 Decreased");

  const stockInfoAfter = await vault.stockList(TOKEN_ADDRESS);
  const newSupply = ethers.formatUnits(stockInfoAfter.currentSupply, tokenDecimals);
  console.log("New Supply:", newSupply, "tokens");

  console.log("\n🎉 Stock purchase completed successfully!");
  console.log(`You bought ${BUY_AMOUNT} ${stockInfo.name} for ${totalCostFormatted} PYUSD`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error buying stock:", error);
    process.exit(1);
  });
