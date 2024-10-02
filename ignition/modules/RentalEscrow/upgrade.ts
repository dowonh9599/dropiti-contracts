import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import RentalEscrowProxyModule from "./deploy";

const RentalEscrowUpgradeModule = buildModule(
  "RentalEscrowUpgradeModule",
  (m) => {
    const proxyAdminOwner = m.getAccount(0);

    const { proxyAdmin, proxy } = m.useModule(RentalEscrowProxyModule);
    const rentalEscrow = m.contract("RentalEscrow");
    m.call(proxyAdmin, "upgradeAndCall", [proxy, rentalEscrow, "0x"], {
      from: proxyAdminOwner,
    });
    return { proxyAdmin, proxy };
  }
);

const RentalEscrowNextModule = buildModule("RentalEscrowNextModule", (m) => {
  const { proxy } = m.useModule(RentalEscrowUpgradeModule);

  const rentalEscrow = m.contractAt("RentalEscrow", proxy);
  return { rentalEscrow };
});

export default RentalEscrowNextModule;
