import "@nomicfoundation/hardhat-ignition-ethers";
import hre from "hardhat";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("eHKDModule", (m) => {
  const deployer = m.getAccount(0);

  const admin = m.getParameter("_admin", hre.ethers.ZeroAddress);
  const tokenVault = m.getParameter("_tokenVault", hre.ethers.ZeroAddress);
  const mintAmount = m.getParameter("mintAmount", 0);

  const token = m.contract("eHKD", [admin, tokenVault, mintAmount]);

  return { token };
});
