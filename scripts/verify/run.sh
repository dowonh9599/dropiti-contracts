get_contract_address() {
  local contract_name=$1
  local network_name=$2

  # Construct the path to the JSON file
  local contract_file="./deployed/${network_name}/${contract_name}.json"

  # Check if the JSON file exists
  if [[ ! -f "$contract_file" ]]; then
    echo "Error: Contract file '$contract_file' does not exist." >&2
    return 1
  fi

  # Extract the address from the JSON file
  local address=$(jq -r '.address' "$contract_file")
  
  # Validate the address
  if [[ -z "$address" || "$address" == "null" ]]; then
    echo "Error: Failed to load contract address from '$contract_file'." >&2
    return 1
  fi

  # Return the address
  echo "$address"
  return 0
}

main() {
  local network=$1
  # Check for missing mandatory arguments
  if [[ -z "$network" ]]; then
    echo "Error: unsupported network"
    echo "Usage: yarn verify-contracts <network>"
    exit 1
  fi

  case $network in
    scrollSepolia|sepolia|arbitrumSepolia)
      ;;
    *)
      echo "Error: unsupported network '$network'"
      echo "Supported networks are: scrollSepolia, sepolia, arbitrumSepolia"
      exit 1
      ;;
  esac

  # load all contracts
  local eHKD_address=$(get_contract_address "eHKD" "$network")
  if [[ $? -ne 0 ]]; then
    exit 1
  fi
  local rentalEscrow_address=$(get_contract_address "RentalEscrow" "$network")
  if [[ $? -ne 0 ]]; then
    exit 1
  fi
  
  shift
  case $network in
    scrollSepolia|sepolia|arbitrumSepolia)
      npx hardhat verify --network $network --constructor-args ./scripts/verify/arguments/$network/eHKD.js $eHKD_address
      npx hardhat verify --network $network --constructor-args ./scripts/verify/arguments/$network/RentalEscrow.js $rentalEscrow_address
      ;;
    *)
      echo "Other options not implemented"
      exit 1
      ;;
  esac
}

main $@
