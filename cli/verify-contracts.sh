main() {
  local network=$1
  # Check for missing mandatory arguments
  if [[ -z "$network" ]]; then
    echo "Usage: yarn verify-contracts <Network>"
    exit 1
  fi

  shift
  case $network in
    scrollSepolia)
      npx hardhat verify --network scrollSepolia 0xff7f28FaF248a019142a87A30755e3380453233d 0xFb648E797c7A7Cd67684B0dB3b221F1B80797f92 0x72eA7433c73beB5Ccaae0Beb4Ad3B73422B332f9 1000000000000000000000000000
      npx hardhat verify --network scrollSepolia 0xEf3C0136a99F264C290245bCf89EC7bad744A284
      ;;
    sepolia)
      npx hardhat ignition verify chain-11155111
      ;;
    *)
      echo "Other options not implemented"
      exit 1
      ;;
  esac
  yarn tsx ./cli/updateDeployed.ts
}

main $@
