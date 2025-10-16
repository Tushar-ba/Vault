import { ethers } from "ethers";

async function main() {
  const VAULT_ADDRESS = "0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b";
  const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
  
  const AMOUNT_TO_ADD = 50; // Add 50 PYUSD to vault

  console.log("Adding PYUSD to vault for liquidity...");
  console.log("Vault Address:", VAULT_ADDRESS);
  console.log("Amount to add:", AMOUNT_TO_ADD, "PYUSD");

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);
  console.log("Sender address:", signer.address);

  const pyusdAbi = [
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)"
  ];

  const pyusd = new ethers.Contract(PYUSD_ADDRESS, pyusdAbi, signer);

  // Check balance
  const balance = await pyusd.balanceOf(signer.address);
  const balanceFormatted = ethers.formatUnits(balance, 6);
  console.log("\nYour PYUSD balance:", balanceFormatted, "PYUSD");

  const amountInWei = ethers.parseUnits(AMOUNT_TO_ADD.toString(), 6);
  
  if (balance < amountInWei) {
    console.error("❌ Insufficient PYUSD balance!");
    return;
  }

  // Transfer PYUSD to vault
  console.log("\n💸 Transferring PYUSD to vault...");
  const tx = await pyusd.transfer(VAULT_ADDRESS, amountInWei);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("✅ Transfer confirmed!");

  // Check vault balance
  const vaultBalance = await pyusd.balanceOf(VAULT_ADDRESS);
  console.log("\nVault PYUSD balance now:", ethers.formatUnits(vaultBalance, 6), "PYUSD");
  
  console.log("\n🎉 Vault liquidity added successfully!");
  console.log("You can now sell your tokens.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
