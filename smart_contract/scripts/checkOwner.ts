import { ethers } from "ethers";

async function main() {
  const VAULT_ADDRESS = "0xc18c0Ab620F81f680819897885D585EdD44E5148";
  
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);
  
  const vaultAbi = [
    "function owner() public view returns (address)"
  ];
  
  const vault = new ethers.Contract(VAULT_ADDRESS, vaultAbi, provider);
  
  const owner = await vault.owner();
  console.log("Vault Owner:", owner);
  console.log("Your Address:", signer.address);
  console.log("Are you the owner?", owner.toLowerCase() === signer.address.toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
