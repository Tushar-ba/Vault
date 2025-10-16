import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokenModule", (m) => {
    const name = m.getParameter("name", "Tesla");
    const symbol = m.getParameter("symbol", "TS");
    const token = m.contract("Token", [name, symbol]);
    return { token };
});