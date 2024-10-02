import fs from "fs";
import yargs from "yargs";
import { AlchemyProvider, ethers } from "ethers";
import { hideBin } from "yargs/helpers";
import RentalEscrowSepolia from "../abi/sepolia/RentalEscrow.json";
import eHKDSepolia from "../abi/sepolia/eHKD.json";
import dotenv from "dotenv";
import Big from "big.js";
import {
  ChainId,
  Networkish,
  SUPPORTED_NETWORKISH,
} from "../ignition/types/chain";
dotenv.config();

function getContractArtifact(networkish: string, contract: string) {
  if (networkish === "sepolia") {
    switch (contract) {
      case "RentalEscrow": {
        return RentalEscrowSepolia;
      }
      case "eHKD": {
        return eHKDSepolia;
      }
    }
  }

  return null;
}

export async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("networkish", {
      demandOption: true,
      alias: "n",
      description: "networkish",
      type: "string",
    })
    .option("contract", {
      demandOption: true,
      alias: "c",
      description: "contract name",
      type: "string",
    })
    .version(false)
    .help("help", "Estimate Deployment Fee")
    .alias("help", "h").argv;

  const { networkish, contract } = argv;

  if (!SUPPORTED_NETWORKISH.includes(networkish)) {
    console.log(`unsupported network ("${networkish}"),`);
    console.log(`currently supported: [${SUPPORTED_NETWORKISH}]`);
    return;
  }

  const contractsAvailable = fs
    .readdirSync(`abi/${networkish}`)
    .map((file) => file.replace(".json", ""));

  if (!contractsAvailable.includes(contract)) {
    console.log(`contract not found ("${contract}"),`);
    console.log(`available contracts: [${contractsAvailable}]`);
    return;
  }

  const provider = new AlchemyProvider(
    networkish,
    process.env.ALCHEMY_API_KEY_SEPOLIA,
  );
  const signer = new ethers.JsonRpcSigner(
    provider,
    process.env.SEPOLIA_WALLET_ADDRESS ?? "",
  );

  const contractArtifact = getContractArtifact(networkish, contract);

  if (!contractArtifact) {
    console.log(
      `contract artifact not found (networkish: ${networkish}, contract: ${contract})`,
    );
    return;
  }

  const contractFactory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    signer,
  );

  const estimatedGas = (
    await signer.estimateGas(await contractFactory.getDeployTransaction())
  ).toString();

  const gasPrice = (await provider.getFeeData()).gasPrice?.toString();
  if (!gasPrice) {
    console.log("gas price not fetched");
    return;
  }

  const estimatedCost = Big(estimatedGas).mul(gasPrice).toString(); // Cost in wei
  const estimatedCostInEth = Big(estimatedCost).div(1e18).toString(); // Convert wei to ETH

  console.log("estimated gas: ", estimatedGas);
  console.log("current gas price: ", gasPrice);
  console.log(`Estimated cost: ${estimatedCostInEth} ETH`);
}

main();
