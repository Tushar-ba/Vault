import hre from "hardhat";

async function main() {
  // Access ethers from hre with proper casting
  const ethers = (hre as any).ethers;
  
  if (!ethers) {
    throw new Error("Ethers is not available in the Hardhat Runtime Environment");
  }
  
  const Vault = await ethers.getContractFactory("Vault");
  const pyusdAddress = "0xYourPYUSDTokenAddress"; // Replace with the actual PYUSD token address
  const vault = await Vault.deploy(pyusdAddress);

  await vault.waitForDeployment();
  console.log("Vault deployed to:", vault.target);
}

main().catch((error) => {
  console.error("Error deploying Vault:", error);
  process.exit(1);
});