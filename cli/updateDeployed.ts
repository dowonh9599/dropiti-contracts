import fs from "fs";
import path from "path";
import { ChainId } from "../ignition/types/chain";
import { type TransactionReceipt } from "ethers";
import { CHAIN_ID_TO_NETWORKISH } from "../ignition/utils";

// Set up yargs to handle command line arguments
const chainIds = Object.values(ChainId).filter(
  (value) => typeof value === "number",
);

for (const chainId of chainIds) {
  // Path to the JSON file
  const jsonFilePath = `ignition/deployments/chain-${chainId}/deployed_addresses.json`;

  // Read the JSON file
  fs.readFile(jsonFilePath, "utf8", async (err, data) => {
    if (err) {
      return;
    }

    // Parse JSON data
    try {
      const deployedContracts = JSON.parse(data);

      // Iterate over each key-value pair in the JSON data
      for (const contractKey in deployedContracts) {
        const [moduleName, contractName] = contractKey.split("#");
        if (
          moduleName === `${contractName}Module` ||
          contractKey.endsWith("TransparentUpgradeableProxy")
        ) {
          const contractAddress = deployedContracts[contractKey];

          // get contract deployment receipt from journal.jsonl
          const journalJSONLPath = path.join(
            __dirname,
            "..",
            "ignition",
            "deployments",
            `chain-${chainId}`,
            "journal.jsonl",
          );

          fs.readFile(journalJSONLPath, "utf8", (err, rawJSONLData) => {
            if (err) {
              return;
            }

            const contractDeploymentTxReceipt: TransactionReceipt | undefined =
              rawJSONLData
                .split("\n")
                .filter((d) => d.startsWith("{"))
                .map((d) => JSON.parse(d))
                .filter((d) => d.futureId === contractKey)
                .filter(
                  (d) =>
                    d.receipt && d.receipt.contractAddress === contractAddress,
                )
                .at(0)?.receipt;

            if (!contractDeploymentTxReceipt) {
              return;
            } else {
              // Define the output file path
              const outputFilePath = path.join(
                __dirname,
                "..",
                "deployed",
                CHAIN_ID_TO_NETWORKISH(chainId as ChainId),
              );
              let filename = contractName;
              if (contractKey.endsWith("TransparentUpgradeableProxy")) {
                filename = contractKey.replace(
                  "ProxyModule#TransparentUpgradeableProxy",
                  "",
                );
              }

              const outputFile = path.join(outputFilePath, `${filename}.json`);
              // define new JSON Data
              const newJsonData = {
                address: contractDeploymentTxReceipt?.contractAddress,
                blockNumber: contractDeploymentTxReceipt.blockNumber,
              };
              // Write new JSON file
              fs.writeFile(
                outputFile,
                JSON.stringify(newJsonData, null, 2),
                "utf8",
                (err) => {
                  if (err) {
                    console.error(`Error writing file: ${err}`);
                  } else {
                    console.log(`File has been saved: ${outputFile}`);
                  }
                },
              );
              // copy abi from artifacts to abi folder
              const abiSource = path.join(
                __dirname,
                "..",
                "ignition",
                "deployments",
                `chain-${chainId}`,
                "artifacts",
                `${contractName}Module#${contractName}.json`,
              );
              const abiDestinationFolder = path.join(
                __dirname,
                "..",
                "abi",
                `${CHAIN_ID_TO_NETWORKISH(chainId)}`,
              );
              const abiDestination = path.join(
                abiDestinationFolder,
                `${filename}.json`,
              );
              // create folder if not exists
              if (!fs.existsSync(abiDestinationFolder)) {
                fs.mkdir(abiDestinationFolder, (err) => {
                  if (err) {
                    console.error(err);
                  }
                });
              }

              // check if file exist
              if (fs.existsSync(abiSource)) {
                // copy ABI to abi folder at project root dir
                fs.copyFile(abiSource, abiDestination, (err) => {
                  if (err) {
                    console.error(err);
                  }
                  console.log(
                    `Moved ${contractName} Contract ABI to ${abiDestinationFolder}`,
                  );
                });
              }
            }
          });
        }
      }
    } catch (parseError) {
      console.error(`Error parsing JSON: ${parseError}`);
    }
  });
}
