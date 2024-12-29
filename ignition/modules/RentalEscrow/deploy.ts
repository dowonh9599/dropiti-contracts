import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { BaseTokensByChainId } from "../../tokens";
import { ChainId } from "../../types/chain";

export default buildModule("RentalEscrowModule", (m) => {
  const chainId = hre.network.config.chainId;

  // whitelisted
  const WHITELISTED: Array<string> = [];

  // whitelisted tokens
  const eHKD = BaseTokensByChainId[chainId as ChainId]?.eHKD;
  const WHITELISTED_TOKENS = [];
  if (eHKD) {
    WHITELISTED_TOKENS.push(eHKD.address);
  }

  // get parameters, set default
  const admin = m.getParameter("_admin");
  const whitelisted = m.getParameter("_whitelisted", WHITELISTED);
  const whitelistedTokens = m.getParameter(
    "_whitelistedTokens",
    WHITELISTED_TOKENS,
  );

  // const rentalEscrow = m.contractAt("RentalEscrow", proxy);
  const rentalEscrow = m.contract("RentalEscrow", [
    admin,
    whitelisted,
    whitelistedTokens,
  ]);

  return { rentalEscrow };
});
