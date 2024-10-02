import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { BaseTokensByChainId } from "../../tokens";
import { ChainId } from "../../types/chain";
import { getProxyModule } from "../../utils";

const RentalEscrowProxyModule = buildModule("RentalEscrowModule", (m) => {
  const proxyModule = getProxyModule("RentalEscrow");
  const { proxy, proxyAdmin } = m.useModule(proxyModule);
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
  const whitelisted = m.getParameter("_whitelisted", WHITELISTED);
  const whitelistedTokens = m.getParameter(
    "_whitelistedTokens",
    WHITELISTED_TOKENS
  );

  const rentalEscrow = m.contractAt("RentalEscrow", proxy);
  m.call(rentalEscrow, "initialize", [whitelisted, whitelistedTokens]);

  return { rentalEscrow, proxy, proxyAdmin };
});

export default RentalEscrowProxyModule;
