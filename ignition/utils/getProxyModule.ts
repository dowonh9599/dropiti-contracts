import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const getProxyModule = (contractName: string) => {
  return buildModule(`${contractName}ProxyModule`, (m) => {
    const proxyAdminOwner = m.getAccount(0);

    const contract = m.contract(contractName);
    // The TransparentUpgradeableProxy contract creates the ProxyAdmin within its constructor
    const proxy = m.contract("TransparentUpgradeableProxy", [
      contract,
      proxyAdminOwner,
      "0x",
    ]);
    // get the address of the ProxyAdmin contract
    const proxyAdminAddress = m.readEventArgument(
      proxy,
      "AdminChanged",
      "newAdmin",
    );

    // create a contract instance for the ProxyAdmin that we can interact with later to upgrade the proxy.
    const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);
    // Return the proxy and proxy admin so that they can be used by other modules.
    return { proxyAdmin, proxy };
  });
};
