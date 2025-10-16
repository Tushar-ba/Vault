import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  // Contract addresses
  const VAULT_ADDRESS = "0xc18c0Ab620F81f680819897885D585EdD44E5148";
  const TOKEN_ADDRESS = "0xE6776770B7E0dA454c498634aD3813C71C8B9674";
  
  // Parameters for listing
  const STOCK_NAME = "Tesla Stock";
  const INITIAL_SUPPLY = 1000; // 1000 tokens (in whole units, not wei)
  const INITIAL_PRICE = 1; // $1 per token (in whole PYUSD, not wei)

  console.log("Starting stock listing process...");
  console.log("Vault Address:", VAULT_ADDRESS);
  console.log("Token Address:", TOKEN_ADDRESS);
  console.log("Initial Supply:", INITIAL_SUPPLY);
  console.log("Initial Price:", INITIAL_PRICE, "PYUSD");

  // Get provider and signer
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);
  console.log("Signer address:", signer.address);

  // Get contract instances
  const vaultAbi = [
    "function listAndDepositInitialStock(address _token, string memory _name, uint256 _initialSupplyInWholeTokens, uint256 _priceInPyusd) public",
    "function getPrice(address _token) public view returns (uint256)",
    "function stockList(address) public view returns (string memory name, uint256 pricingFactor, uint256 currentSupply, bool isSupported)"
  ];

  const tokenAbi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function decimals() public view returns (uint8)",
    "function whitelist(address _address) public",
    "function whitelisted(address) public view returns (bool)"
  ];

  const vault = new ethers.Contract(VAULT_ADDRESS, vaultAbi, signer);
  const token = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, signer);

  // Check token balance
  const balance = await token.balanceOf(signer.address);
  const decimals = await token.decimals();
  const requiredAmount = ethers.parseUnits(INITIAL_SUPPLY.toString(), decimals);
  
  console.log("\nToken balance:", ethers.formatUnits(balance, decimals));
  console.log("Required amount:", ethers.formatUnits(requiredAmount, decimals));

  if (balance < requiredAmount) {
    console.error("❌ Insufficient token balance!");
    return;
  }

  // Step 0: Whitelist signer and vault addresses
  console.log("\n📝 Step 0: Checking and whitelisting addresses...");
  const isSignerWhitelisted = await token.whitelisted(signer.address);
  const isVaultWhitelisted = await token.whitelisted(VAULT_ADDRESS);
  
  console.log("Signer whitelisted:", isSignerWhitelisted);
  console.log("Vault whitelisted:", isVaultWhitelisted);
  
  if (!isSignerWhitelisted) {
    console.log("Whitelisting signer...");
    const whitelistTx1 = await token.whitelist(signer.address);
    await whitelistTx1.wait();
    console.log("✅ Signer whitelisted!");
  }
  
  if (!isVaultWhitelisted) {
    console.log("Whitelisting vault...");
    const whitelistTx2 = await token.whitelist(VAULT_ADDRESS);
    await whitelistTx2.wait();
    console.log("✅ Vault whitelisted!");
  }

  // Step 1: Approve vault to spend tokens
  console.log("\n📝 Step 1: Approving vault to spend tokens...");
  const approveTx = await token.approve(VAULT_ADDRESS, requiredAmount);
  console.log("Approval transaction hash:", approveTx.hash);
  await approveTx.wait();
  console.log("✅ Approval confirmed!");

  // Step 2: List and deposit initial stock
  console.log("\n📝 Step 2: Listing and depositing stock...");
  const listTx = await vault.listAndDepositInitialStock(
    TOKEN_ADDRESS,
    STOCK_NAME,
    INITIAL_SUPPLY,
    INITIAL_PRICE
  );
  console.log("List transaction hash:", listTx.hash);
  await listTx.wait();
  console.log("✅ Stock listed successfully!");

  // Step 3: Verify listing
  console.log("\n📊 Verifying listing...");
  const stockInfo = await vault.stockList(TOKEN_ADDRESS);
  console.log("Stock Name:", stockInfo.name);
  console.log("Pricing Factor:", stockInfo.pricingFactor.toString());
  console.log("Current Supply:", ethers.formatUnits(stockInfo.currentSupply, decimals));
  console.log("Is Supported:", stockInfo.isSupported);

  const price = await vault.getPrice(TOKEN_ADDRESS);
  console.log("Current Price:", ethers.formatUnits(price, 6), "PYUSD"); // PYUSD has 6 decimals

  console.log("\n🎉 Stock listing completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error listing stock:", error);
    process.exit(1);
  });
