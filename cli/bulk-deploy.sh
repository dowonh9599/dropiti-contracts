#!/usr/bin/env bash

_bulk_deploy_localhost() {
  yarn hardhat ignition deploy ignition/modules/RentalEscrow/deploy.ts --network localhost\
  ;
  popd
}

_bulk_deploy_contracts() {
  local network=$1
  yarn hardhat ignition deploy ignition/modules/RentalEscrow/deploy.ts --network $network --parameters ignition/parameters/$network.json \
  ;
  popd
}

main() {
  local network=$1
  # Check for missing mandatory arguments
  if [[ -z "$network" ]]; then
    echo "Usage: yarn bulk-deploy-contracts <Network>"
    exit 1
  fi

  shift
  case $network in
    scrollSepolia)
      _bulk_deploy_contracts $network
      ;;
    sepolia)
      _bulk_deploy_contracts $network
      ;;
    localhost)
      _bulk_deploy_localhost
      ;;
    *)
      echo "Other options not implemented"
      exit 1
      ;;
  esac
  yarn tsx ./cli/updateDeployed.ts
}

main $@
