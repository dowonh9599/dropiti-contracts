import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("eHKDModule", (m) => {
  const deployer = m.getAccount(0);
  const token = m.contract("eHKD", [deployer]);

  return { token };
});
