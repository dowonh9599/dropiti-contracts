#!/usr/bin/env bash

# Function to upgrade a specific contract to a given network
_upgrade_contract() {
  local contract_name=$1
  local network=$2
  local force_reset=$3  # This is the new parameter for reset option

  echo "Upgrading contract: $contract_name to network: $network"

  # Base command
  local cmd="yarn hardhat ignition deploy \"ignition/modules/${contract_name}/upgrade.ts\" --network $network"

  # Append --reset if the reset flag is set
  if [[ "$force_reset" == "--reset" ]]; then
    cmd+=" --reset"
  fi

  # Run the deployment command
  eval $cmd
}

main() {
  local contract_name=$1
  local network=$2
  local force_reset=$3  # Capture the third argument

  # Check for missing mandatory arguments
  if [[ -z "$contract_name" || -z "$network" ]]; then
    echo "Usage: ./upgrade.sh <ContractName> <Network>"
    echo "add --reset to reset deployments"
    exit 1
  fi

  # Pass the reset option to the deployment function
  _upgrade_contract "$contract_name" "$network" "$force_reset"

  # Run any post-deployment scripts or commands
  yarn tsx ./cli/updateDeployed.ts
}

# Pass all arguments to the main function
main "$@"
