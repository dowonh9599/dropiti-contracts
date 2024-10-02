import "@nomicfoundation/hardhat-ignition-ethers";
import hre from "hardhat";
import RentalEscrowAddress from "../../deployed/sepolia/RentalEscrow.json";
import RentalEscrowContractABI from "../../abi/sepolia/RentalEscrow.json";
import { expect } from "chai";
import { RentalEscrow } from "typechain-types";

describe("RentalEscrow--sepolia", function () {
  describe("Initialization", () => {
    const provider = new hre.ethers.AlchemyProvider(
      "sepolia",
      process.env.ALCHEMY_API_KEY_SEPOLIA
    );
    const contractAddress = RentalEscrowAddress.address;
    const abi = RentalEscrowContractABI.abi;

    const contract = new hre.ethers.Contract(
      contractAddress,
      abi,
      provider
    ) as unknown as RentalEscrow;
    it("should be correctly initialized with initializer", async () => {
      // Address to check
      const addressToCheck = "0x0d60dC9A98DA360E5Cd5B6A2D7bf421a8AFDdb0b";
      expect(await contract.isWhitelisted(addressToCheck)).to.be.equal(true);
    });
  });
});
