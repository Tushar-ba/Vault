import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VaultModule", (m) => {
  // Replace this with the actual PYUSD token address on Sepolia
  const pyusdAddress = m.getParameter("pyusdAddress", "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"); // PYUSD on Sepolia
  
  const vault = m.contract("Vault", [pyusdAddress]);

  return { vault };
});
